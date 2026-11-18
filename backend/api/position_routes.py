import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.database.models import PositionModel, TradingAccountModel, OrderModel
from backend.broker.angel_session import session_manager
from backend.broker.fo_order_manager import parse_fo_symbol
from backend.security.encryption import vault

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/positions", tags=["Positions"])

# Standard Indian Index Lot Sizes fallback (used if not supplied by broker)
DEFAULT_LOT_SIZES: Dict[str, int] = {
    "NIFTY": 25,
    "BANKNIFTY": 15,
    "FINNIFTY": 25,
    "MIDCPNIFTY": 50,
    "SENSEX": 10,
    "BANKEX": 15,
}

def format_expiry_display(exp_str: Optional[str]) -> str:
    """Format raw Angel One expiry strings (e.g. '28NOV2024', '28-NOV-2024', '28NOV24') to '28 Nov 2024'."""
    if not exp_str or exp_str in ("Live", "N/A", "-", ""):
        return exp_str or "Live"
    cleaned = exp_str.replace("-", "").strip().upper()
    try:
        dt = datetime.strptime(cleaned, "%d%b%Y")
        return dt.strftime("%d %b %Y")
    except Exception:
        try:
            dt = datetime.strptime(cleaned, "%d%b%y")
            return dt.strftime("%d %b %Y")
        except Exception:
            return exp_str


def enrich_position_data(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches a raw position dictionary (from DB or Angel One live API) with:
    - Parsed exact Strike Price (e.g. 24850.0)
    - Formatted Expiry Date (e.g. '28 Nov 2024')
    - Option Type ('CE', 'PE', 'FUT', 'EQ')
    - Underlying Asset ('NIFTY', 'BANKNIFTY', etc.)
    - Product Type ('CARRYFORWARD' / NRML vs 'INTRADAY' / MIS)
    - Lots and Lot Size
    - Position Side ('BUY' / Long vs 'SELL' / Short)
    - Return Percentage and accurate P&L
    """
    sym = str(raw.get("symbol") or raw.get("tradingsymbol") or "").strip().upper()
    parsed = parse_fo_symbol(sym)

    underlying = raw.get("underlying")
    strike = raw.get("strike")
    raw_expiry = raw.get("expiry") or raw.get("expirydate") or "Live"
    opt_type = raw.get("type") or raw.get("optiontype")

    if parsed:
        if not underlying or underlying in ("NIFTY", "EQ"):
            underlying = parsed["underlying"]
        if strike is None or float(strike) <= 0:
            strike = parsed["strike"]
        if not opt_type or opt_type in ("EQ", "FUT"):
            opt_type = parsed["option_type"]
        if not raw_expiry or raw_expiry == "Live":
            raw_expiry = parsed["expiry"]
    else:
        # Fallback heuristic
        if not underlying:
            underlying = "BANKNIFTY" if "BANK" in sym else "FINNIFTY" if "FIN" in sym else "SENSEX" if "SENSEX" in sym else "NIFTY"
        if not opt_type:
            opt_type = "CE" if "CE" in sym else "PE" if "PE" in sym else "EQ"
        if strike is None or float(strike) <= 0:
            strike = 0.0

    # Format expiry
    formatted_expiry = format_expiry_display(raw_expiry)

    # Product Type (NRML / CARRYFORWARD vs MIS / INTRADAY)
    raw_prod = str(raw.get("productType") or raw.get("producttype") or "CARRYFORWARD").upper()
    product_type = "INTRADAY" if raw_prod in ["INTRADAY", "MIS", "DAY"] else "CARRYFORWARD"

    # Quantities & Lots
    quantity = int(raw.get("quantity") or raw.get("netqty") or 0)
    lot_size = int(raw.get("lotSize") or raw.get("lotsize") or DEFAULT_LOT_SIZES.get(underlying, 25))
    lots = max(1, abs(quantity) // lot_size) if (lot_size > 0 and abs(quantity) >= lot_size) else 1

    # Pricing & P&L
    avg_price = float(raw.get("averagePrice") or raw.get("avgprice") or raw.get("buyavgprice") or 0.0)
    ltp = float(raw.get("ltp") or raw.get("close") or avg_price)
    unrealized_pnl = float(raw.get("unrealizedPnL") or raw.get("pnl") or (ltp - avg_price) * quantity)
    realized_pnl = float(raw.get("realizedPnL") or raw.get("realisedpnl") or 0.0)

    # PnL % calculation
    pnl_percent = float(raw.get("pnlPercent") or 0.0)
    if not pnl_percent and avg_price and quantity:
        pnl_percent = round((unrealized_pnl / (avg_price * abs(quantity))) * 100, 2)

    side = "BUY" if quantity > 0 else "SELL"
    status = "OPEN" if quantity != 0 else "CLOSED"

    return {
        "id": raw.get("id"),
        "accountId": raw.get("accountId") or raw.get("account_id"),
        "accountName": raw.get("accountName") or raw.get("account_name") or "Trading Account",
        "symbol": sym,
        "underlying": underlying,
        "expiry": formatted_expiry,
        "rawExpiry": raw_expiry,
        "strike": float(strike) if strike is not None else None,
        "type": opt_type,
        "productType": product_type,
        "quantity": quantity,
        "side": side,
        "lots": lots,
        "lotSize": lot_size,
        "averagePrice": avg_price,
        "ltp": ltp,
        "unrealizedPnL": round(unrealized_pnl, 2),
        "pnlPercent": round(pnl_percent, 2),
        "realizedPnL": round(realized_pnl, 2),
        "algoId": raw.get("algoId") or raw.get("algo_id") or "MANUAL",
        "algoName": raw.get("algoName") or raw.get("algo_name") or "Manual Execution",
        "status": status,
        "entryTime": raw.get("entryTime") or raw.get("entry_time") or "Live",
        "symbolToken": str(raw.get("symbolToken") or raw.get("symboltoken") or ""),
        "exchange": str(raw.get("exchange") or ("BFO" if underlying in ("SENSEX", "BANKEX") else "NFO")),
    }


def _execute_position_square_off(
    db: Session,
    account_id: str,
    symbol: str,
    quantity: int,
    product_type: str = "CARRYFORWARD",
    exchange: str = "NFO",
    symbol_token: str = None,
) -> Dict[str, Any]:
    """
    Executes an actual market square-off order for an open position:
    - If quantity > 0 (LONG): places a SELL order for abs(quantity)
    - If quantity < 0 (SHORT): places a BUY order for abs(quantity)
    - Passes matching product_type (CARRYFORWARD or INTRADAY) to ensure correct position offset
    - Transmits live order to Angel One SmartAPI if account is enabled and has credentials
    - Creates OrderModel record and closes PositionModel in database
    """
    abs_qty = abs(int(quantity))
    if abs_qty <= 0:
        return {"success": True, "message": f"Position {symbol} is already flat (0 qty)."}

    exit_side = "SELL" if quantity > 0 else "BUY"
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
    acc_name = acc.name if acc else "Target Account"
    order_id = f"exit-{uuid.uuid4().hex[:8]}"
    placed_live = False
    broker_err = None

    if acc and acc.encrypted_api_key:
        try:
            api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
            pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
            totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
            proxy_url = vault.decrypt(acc.encrypted_proxy_url) if getattr(acc, "encrypted_proxy_url", None) else ""
            static_ip = getattr(acc, "static_ip", "") or ""

            session = session_manager.get_or_create_session(
                acc.id, acc.client_id, api_key, pin, totp_secret, proxy_url=proxy_url, static_ip=static_ip
            )
            if session.status != "CONNECTED":
                session.authenticate()

            if session.status == "CONNECTED":
                # Ensure exact product type
                prod = "INTRADAY" if product_type in ["INTRADAY", "MIS", "DAY"] else "CARRYFORWARD"
                res = session.place_order(
                    symbol=symbol,
                    tradingsymbol=symbol,
                    symboltoken=symbol_token,
                    side=exit_side,
                    quantity=abs_qty,
                    price=0.0,
                    order_type="MARKET",
                    product_type=prod,
                    exchange=exchange or "NFO",
                )
                if isinstance(res, dict) and res.get("status") in (True, "SUCCESS"):
                    placed_live = True
                    order_id = res.get("order_id") or (res.get("data") or {}).get("orderid") or order_id
                elif isinstance(res, str) and res.strip():
                    placed_live = True
                    order_id = res.strip()
                else:
                    broker_err = res.get("message") or res.get("error") if isinstance(res, dict) else str(res)
                    logger.warning(f"Live exit rejected by SmartAPI for {symbol}: {broker_err}")
        except Exception as exc:
            broker_err = str(exc)
            logger.error(f"Failed transmitting live exit order for {symbol} on {acc_name}: {exc}")

    # Record square-off in orders database
    try:
        order_entry = OrderModel(
            id=f"ord-{uuid.uuid4().hex[:8]}",
            broker_order_id=str(order_id),
            timestamp=timestamp_str,
            account_id=account_id,
            account_name=acc_name,
            algo_id="SQUARE-OFF",
            algo_name="Market Position Square-off",
            symbol=symbol,
            side=exit_side,
            quantity=abs_qty,
            order_type="MARKET",
            price=0.0,
            average_price=0.0,
            status="COMPLETED",
            timeline={
                "type": "SQUARE_OFF",
                "product_type": product_type,
                "placed_live": placed_live,
                "broker_order_id": str(order_id),
                "error": broker_err
            }
        )
        db.add(order_entry)
    except Exception as e:
        logger.error(f"Failed creating exit order entry for {symbol}: {e}")

    # Mark all matching DB positions as CLOSED
    try:
        matching_positions = db.query(PositionModel).filter(
            PositionModel.account_id == account_id,
            PositionModel.symbol == symbol,
            PositionModel.status == "OPEN"
        ).all()
        for p in matching_positions:
            p.status = "CLOSED"
            p.quantity = 0
            p.realized_pnl = p.unrealized_pnl
        db.commit()
    except Exception as e:
        logger.error(f"Failed updating DB position status for {symbol}: {e}")

    return {
        "success": True,
        "symbol": symbol,
        "order_id": str(order_id),
        "side": exit_side,
        "quantity": abs_qty,
        "placed_live": placed_live,
        "message": f"Successfully squared off {abs_qty} shares of {symbol} via MARKET {exit_side} order." + (f" (Broker Order ID: {order_id})" if placed_live else "")
    }


@router.get("")
def get_positions(db: Session = Depends(get_db)):
    """
    Returns organized, fully enriched positions list across all accounts.
    Includes strike price, expiry date, contract type, lot count, and live P&L.
    """
    db_positions = db.query(PositionModel).all()
    results: List[Dict[str, Any]] = []

    for pos in db_positions:
        enriched = enrich_position_data({
            "id": pos.id,
            "accountId": pos.account_id,
            "accountName": pos.account_name,
            "symbol": pos.symbol,
            "underlying": pos.underlying,
            "expiry": pos.expiry,
            "strike": pos.strike,
            "type": pos.type,
            "quantity": pos.quantity,
            "averagePrice": pos.average_price,
            "ltp": pos.ltp,
            "unrealizedPnL": pos.unrealized_pnl,
            "pnlPercent": pos.pnl_percent,
            "realizedPnL": pos.realized_pnl,
            "algoId": pos.algo_id,
            "algoName": pos.algo_name,
            "status": pos.status,
            "entryTime": pos.entry_time
        })
        results.append(enriched)

    # Supplement with live positions from connected Angel One sessions
    accounts = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True).all()
    for acc in accounts:
        try:
            if acc.encrypted_api_key:
                api_key = vault.decrypt(acc.encrypted_api_key)
                pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
                totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
                proxy_url = vault.decrypt(acc.encrypted_proxy_url) if getattr(acc, "encrypted_proxy_url", None) else ""
                static_ip = getattr(acc, "static_ip", "") or ""

                session = session_manager.get_or_create_session(
                    acc.id, acc.client_id, api_key, pin, totp_secret, proxy_url=proxy_url, static_ip=static_ip
                )
                if session.status == "CONNECTED":
                    live_pos = session.fetch_positions()
                    for lp in live_pos:
                        net_qty = int(lp.get("netqty", 0) or lp.get("buyqty", 0) or 0)
                        sym = lp.get("tradingsymbol", "")
                        if sym:
                            avg_p = float(lp.get("avgprice", 0.0) or lp.get("buyavgprice", 0.0) or 0.0)
                            ltp = float(lp.get("ltp", 0.0) or avg_p)
                            pnl = float(lp.get("pnl", 0.0) or (ltp - avg_p) * net_qty)

                            # Check if already present in results from DB
                            existing = next((r for r in results if r["symbol"] == sym and r["accountId"] == acc.id), None)
                            if existing:
                                # Update with live LTP, PnL, and broker fields
                                existing["ltp"] = ltp
                                existing["unrealizedPnL"] = round(pnl, 2)
                                if avg_p and net_qty:
                                    existing["pnlPercent"] = round((pnl / (avg_p * abs(net_qty))) * 100, 2)
                                existing["quantity"] = net_qty
                                existing["status"] = "OPEN" if net_qty != 0 else "CLOSED"
                                existing["productType"] = "INTRADAY" if str(lp.get("producttype", "")).upper() in ["INTRADAY", "MIS"] else "CARRYFORWARD"
                            else:
                                live_item = enrich_position_data({
                                    "id": f"live-pos-{acc.id}-{sym}",
                                    "accountId": acc.id,
                                    "accountName": acc.name,
                                    "symbol": sym,
                                    "underlying": lp.get("symbolname") or ("BANKNIFTY" if "BANK" in sym else "FINNIFTY" if "FIN" in sym else "NIFTY"),
                                    "expiry": lp.get("expirydate", "Live"),
                                    "strike": float(lp.get("strikeprice", 0.0) or 0.0),
                                    "type": lp.get("optiontype") or ("CE" if "CE" in sym else "PE" if "PE" in sym else "EQ"),
                                    "productType": lp.get("producttype", "CARRYFORWARD"),
                                    "quantity": net_qty,
                                    "lotSize": int(lp.get("lotsize", 0) or 0),
                                    "averagePrice": avg_p,
                                    "ltp": ltp,
                                    "unrealizedPnL": pnl,
                                    "realizedPnL": float(lp.get("realisedpnl", 0.0) or 0.0),
                                    "algoId": "LIVE-SYNC",
                                    "algoName": "Angel One Live Sync",
                                    "status": "OPEN" if net_qty != 0 else "CLOSED",
                                    "entryTime": "Live",
                                    "symbolToken": lp.get("symboltoken", ""),
                                    "exchange": lp.get("exchange", "NFO")
                                })
                                results.append(live_item)
        except Exception as e:
            logger.warning(f"Failed syncing live positions for account {acc.name}: {e}")

    return results


@router.post("/{position_id}/exit")
def exit_position(
    position_id: str,
    payload: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Exit an individual position immediately at MARKET price.
    Handles both database positions and live Angel One broker positions.
    """
    payload = payload or {}
    acc_id = payload.get("accountId")
    symbol = payload.get("symbol")
    quantity = payload.get("quantity")
    product_type = payload.get("productType", "CARRYFORWARD")
    exchange = payload.get("exchange", "NFO")
    symbol_token = payload.get("symbolToken")

    pos = db.query(PositionModel).filter(PositionModel.id == position_id).first()
    if pos:
        acc_id = acc_id or pos.account_id
        symbol = symbol or pos.symbol
        quantity = quantity if quantity is not None else pos.quantity
        product_type = product_type or "CARRYFORWARD"

    # If position_id is a live-pos compound ID (e.g. live-pos-{accountId}-{symbol})
    if not symbol and position_id.startswith("live-pos-"):
        parts = position_id.replace("live-pos-", "").split("-", 1)
        if len(parts) >= 2:
            acc_id = acc_id or parts[0]
            symbol = symbol or parts[1]

    if not acc_id or not symbol:
        # Fallback: check open DB positions
        if pos:
            acc_id = pos.account_id
            symbol = pos.symbol
            quantity = pos.quantity
        else:
            raise HTTPException(status_code=404, detail=f"Position '{position_id}' not found.")

    res = _execute_position_square_off(
        db=db,
        account_id=acc_id,
        symbol=symbol,
        quantity=int(quantity or 0) if quantity is not None else 1,
        product_type=product_type,
        exchange=exchange,
        symbol_token=symbol_token
    )

    return {
        "success": True,
        "position_id": position_id,
        "status": "CLOSED",
        "details": res
    }


@router.post("/exit-all")
@router.post("/close-all")
def exit_all_positions(
    payload: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Exits ALL open positions across all accounts (or a specified account).
    Squares off both Angel One broker positions via MARKET orders and database positions.
    """
    payload = payload or {}
    target_account_id = payload.get("accountId")
    if target_account_id == "ALL":
        target_account_id = None

    open_items: List[Dict[str, Any]] = []

    # 1. Collect open positions from DB
    db_query = db.query(PositionModel).filter(PositionModel.status == "OPEN")
    if target_account_id:
        db_query = db_query.filter(PositionModel.account_id == target_account_id)
    db_open = db_query.all()
    for p in db_open:
        open_items.append({
            "accountId": p.account_id,
            "symbol": p.symbol,
            "quantity": p.quantity,
            "productType": "CARRYFORWARD",
            "exchange": "NFO",
            "source": "DB"
        })

    # 2. Collect open positions from live connected Angel One accounts
    acc_query = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True)
    if target_account_id:
        acc_query = acc_query.filter(TradingAccountModel.id == target_account_id)
    accounts = acc_query.all()

    for acc in accounts:
        try:
            if acc.encrypted_api_key:
                api_key = vault.decrypt(acc.encrypted_api_key)
                pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
                totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
                proxy_url = vault.decrypt(acc.encrypted_proxy_url) if getattr(acc, "encrypted_proxy_url", None) else ""
                static_ip = getattr(acc, "static_ip", "") or ""

                session = session_manager.get_or_create_session(
                    acc.id, acc.client_id, api_key, pin, totp_secret, proxy_url=proxy_url, static_ip=static_ip
                )
                if session.status == "CONNECTED":
                    live_pos = session.fetch_positions()
                    for lp in live_pos:
                        net_qty = int(lp.get("netqty", 0) or lp.get("buyqty", 0) or 0)
                        sym = lp.get("tradingsymbol", "")
                        if sym and net_qty != 0:
                            # Avoid duplicate if already collected from DB
                            already = next((i for i in open_items if i["symbol"] == sym and i["accountId"] == acc.id), None)
                            if not already:
                                open_items.append({
                                    "accountId": acc.id,
                                    "symbol": sym,
                                    "quantity": net_qty,
                                    "productType": lp.get("producttype", "CARRYFORWARD"),
                                    "exchange": lp.get("exchange", "NFO"),
                                    "symbolToken": lp.get("symboltoken", ""),
                                    "source": "BROKER"
                                })
        except Exception as e:
            logger.warning(f"Error checking live positions for {acc.name}: {e}")

    if not open_items:
        return {
            "success": True,
            "message": "No open positions to close.",
            "closedCount": 0,
            "failedCount": 0,
            "results": []
        }

    results: List[Dict[str, Any]] = []
    closed_count = 0
    failed_count = 0

    for item in open_items:
        try:
            res = _execute_position_square_off(
                db=db,
                account_id=item["accountId"],
                symbol=item["symbol"],
                quantity=item["quantity"],
                product_type=item.get("productType", "CARRYFORWARD"),
                exchange=item.get("exchange", "NFO"),
                symbol_token=item.get("symbolToken"),
            )
            results.append(res)
            closed_count += 1
        except Exception as err:
            logger.error(f"Failed squaring off position {item['symbol']}: {err}")
            failed_count += 1
            results.append({
                "success": False,
                "symbol": item["symbol"],
                "error": str(err)
            })

    return {
        "success": True,
        "message": f"Successfully closed {closed_count} open positions" + (f" ({failed_count} failed)." if failed_count else "."),
        "closedCount": closed_count,
        "failedCount": failed_count,
        "results": results
    }
