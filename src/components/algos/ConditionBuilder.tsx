import React from 'react';
import { EntryCondition } from '../../types/algo';
import { Plus, Trash2 } from 'lucide-react';

interface ConditionBuilderProps {
  conditions: EntryCondition[];
  onChange: (conditions: EntryCondition[]) => void;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ conditions, onChange }) => {
  const addCondition = () => {
    const newCond: EntryCondition = {
      id: `c-${Date.now()}`,
      indicator1: 'EMA',
      period1: 9,
      operator: 'Crosses Above',
      indicator2: 'EMA',
      period2: 21,
      logicalOp: 'AND'
    };
    onChange([...conditions, newCond]);
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updated: Partial<EntryCondition>) => {
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-wider text-slate-700 font-semibold">Entry Rule Condition Tree</h4>
        <button
          type="button"
          onClick={addCondition}
          className="px-2.5 py-1 text-xs font-medium text-[#0F4C3A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Condition
        </button>
      </div>

      <div className="space-y-2">
        {conditions.map((cond, idx) => (
          <div key={cond.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2 text-xs font-mono">
            {idx > 0 && (
              <select
                value={cond.logicalOp || 'AND'}
                onChange={(e) => updateCondition(cond.id, { logicalOp: e.target.value as 'AND' | 'OR' })}
                className="bg-emerald-100 text-[#0F4C3A] font-bold px-2 py-1 rounded border border-emerald-300 outline-none"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            {/* Indicator 1 */}
            <select
              value={cond.indicator1}
              onChange={(e) => updateCondition(cond.id, { indicator1: e.target.value })}
              className="bg-white text-slate-800 px-2 py-1.5 rounded border border-slate-200 outline-none"
            >
              <option value="EMA">EMA</option>
              <option value="SMA">SMA</option>
              <option value="RSI">RSI</option>
              <option value="Price">Price</option>
              <option value="VWAP">VWAP</option>
              <option value="Supertrend">Supertrend</option>
              <option value="Delta">Delta</option>
            </select>

            {['EMA', 'SMA', 'RSI'].includes(cond.indicator1) && (
              <input
                type="number"
                value={cond.period1 || 9}
                onChange={(e) => updateCondition(cond.id, { period1: parseInt(e.target.value) || 9 })}
                placeholder="Period"
                className="w-16 bg-white text-slate-800 px-2 py-1.5 rounded border border-slate-200 text-center"
              />
            )}

            {/* Operator */}
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
              className="bg-white text-amber-700 font-semibold px-2 py-1.5 rounded border border-slate-200 outline-none"
            >
              <option value="Crosses Above">Crosses Above</option>
              <option value="Crosses Below">Crosses Below</option>
              <option value="> font-bold">&gt; Greater Than</option>
              <option value="<">&lt; Less Than</option>
              <option value="==">== Equal To</option>
            </select>

            {/* Indicator 2 or Value */}
            <select
              value={cond.indicator2}
              onChange={(e) => updateCondition(cond.id, { indicator2: e.target.value })}
              className="bg-white text-slate-800 px-2 py-1.5 rounded border border-slate-200 outline-none"
            >
              <option value="EMA">EMA</option>
              <option value="SMA">SMA</option>
              <option value="VWAP">VWAP</option>
              <option value="Price">Price</option>
              <option value="Value">Static Value</option>
            </select>

            {cond.indicator2 === 'Value' ? (
              <input
                type="number"
                value={cond.value || 50}
                onChange={(e) => updateCondition(cond.id, { value: parseFloat(e.target.value) || 0 })}
                placeholder="Value"
                className="w-20 bg-white text-slate-800 px-2 py-1.5 rounded border border-slate-200 text-center"
              />
            ) : (
              ['EMA', 'SMA'].includes(cond.indicator2) && (
                <input
                  type="number"
                  value={cond.period2 || 21}
                  onChange={(e) => updateCondition(cond.id, { period2: parseInt(e.target.value) || 21 })}
                  placeholder="Period"
                  className="w-16 bg-white text-slate-800 px-2 py-1.5 rounded border border-slate-200 text-center"
                />
              )
            )}

            <button
              type="button"
              onClick={() => removeCondition(cond.id)}
              className="ml-auto p-1 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
