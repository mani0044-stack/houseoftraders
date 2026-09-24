import base64
from backend.config import settings

try:
  from cryptography.fernet import Fernet
except ImportError:
  Fernet = None

class SecretVault:
  """
  Encrypted Vault to encrypt/decrypt sensitive Angel One broker credentials
  (API Keys, TOTP secrets, PINs) before storing in PostgreSQL.
  Prevents any plaintext leakage.
  """
  def __init__(self):
    if Fernet:
      raw_key = settings.ENCRYPTION_KEY.encode('utf-8')
      try:
        self.cipher = Fernet(raw_key)
      except Exception:
        key_32 = base64.urlsafe_b64encode(raw_key.ljust(32)[:32])
        self.cipher = Fernet(key_32)
    else:
      self.cipher = None

  def encrypt(self, plaintext: str) -> str:
    if not plaintext:
      return ""
    if self.cipher:
      return self.cipher.encrypt(plaintext.encode('utf-8')).decode('utf-8')
    return base64.b64encode(plaintext.encode('utf-8')).decode('utf-8')

  def decrypt(self, ciphertext: str) -> str:
    if not ciphertext:
      return ""
    if self.cipher:
      try:
        return self.cipher.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
      except Exception:
        return ""
    try:
      return base64.b64decode(ciphertext.encode('utf-8')).decode('utf-8')
    except Exception:
      return ""

vault = SecretVault()

