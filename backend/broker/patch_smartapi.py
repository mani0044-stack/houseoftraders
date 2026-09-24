import os
import tempfile
import logging
import logzero
from SmartApi import SmartConnect

# Patch SmartConnect.__init__ to prevent failure on read-only file systems (e.g. Vercel, AWS Lambda, Docker)
_original_smartconnect_init = SmartConnect.__init__

def _safe_smartconnect_init(self, *args, **kwargs):
    orig_makedirs = os.makedirs
    orig_logfile = logzero.logfile

    def patched_makedirs(path, mode=0o777, exist_ok=False):
        try:
            return orig_makedirs(path, mode=mode, exist_ok=exist_ok)
        except OSError:
            # If creating 'logs' in working directory fails due to read-only FS or permissions, redirect to temp directory
            tmp_path = os.path.join(tempfile.gettempdir(), "angel_logs")
            try:
                return orig_makedirs(tmp_path, mode=mode, exist_ok=exist_ok)
            except Exception:
                pass

    def patched_logfile(filename, *largs, **lkwargs):
        try:
            return orig_logfile(filename, *largs, **lkwargs)
        except Exception:
            # If logzero file creation fails, attempt fallback to temp folder or ignore
            try:
                tmp_log = os.path.join(tempfile.gettempdir(), "angel_app.log")
                return orig_logfile(tmp_log, *largs, **lkwargs)
            except Exception:
                pass

    os.makedirs = patched_makedirs
    logzero.logfile = patched_logfile
    try:
        _original_smartconnect_init(self, *args, **kwargs)
    finally:
        os.makedirs = orig_makedirs
        logzero.logfile = orig_logfile

SmartConnect.__init__ = _safe_smartconnect_init
