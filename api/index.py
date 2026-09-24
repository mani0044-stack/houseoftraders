import os
import sys

# Add project root directory to Python path for Vercel Serverless runtime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# Export FastAPI app for Vercel Serverless Functions
app = app
