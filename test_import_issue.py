"""
Test if there's an import issue with the dashboard endpoint
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'backend')

try:
    from backend.app.portal_models import PortalClient
    print("OK: PortalClient imported successfully")
except Exception as e:
    print(f"ERROR: Failed to import PortalClient: {e}")

try:
    from backend.app.portal_security import PORTAL_JWT_SECRET, ALGO
    print("OK: Portal security imported successfully")
    print(f"  - JWT Secret: {PORTAL_JWT_SECRET[:20]}...")
    print(f"  - Algorithm: {ALGO}")
except Exception as e:
    print(f"ERROR: Failed to import portal security: {e}")

try:
    from backend.app.models import Report
    print("OK: Report model imported successfully")
except Exception as e:
    print(f"ERROR: Failed to import Report: {e}")

try:
    import jwt
    print("OK: JWT library imported successfully")
except Exception as e:
    print(f"ERROR: Failed to import JWT: {e}")