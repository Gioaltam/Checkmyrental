"""
Test backend with error capture
"""
import sys
import os

# Get the current directory
current_dir = os.getcwd()
if current_dir.endswith('backend'):
    # We're already in backend
    pass
else:
    # Add backend to path
    sys.path.insert(0, os.path.join(current_dir, 'backend'))

try:
    # Direct import to test for errors
    from app.api import client
    print("Client module imported successfully")

    # Check if dashboard function exists
    if hasattr(client, 'get_portal_dashboard'):
        print("Dashboard function exists")

    # Try to get the router
    if hasattr(client, 'router'):
        print("Router exists")

        # Check routes
        for route in client.router.routes:
            if hasattr(route, 'path'):
                print(f"  Route: {route.path}")

except Exception as e:
    import traceback
    print(f"Error importing client module: {e}")
    print("Full traceback:")
    traceback.print_exc()