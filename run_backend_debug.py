"""
Run backend with debug mode to capture errors
"""
import sys
import os
import uvicorn

# Change to backend directory
os.chdir('backend')

# Set up environment for better error capture
os.environ['PYTHONUNBUFFERED'] = '1'

# Run the backend
if __name__ == "__main__":
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="debug"
        )
    except Exception as e:
        print(f"ERROR STARTING SERVER: {e}")
        import traceback
        traceback.print_exc()