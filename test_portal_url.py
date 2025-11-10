#!/usr/bin/env python3
"""Test what portal URL the operator_ui module is using"""

import sys
import os

# Import the same way operator_ui does
PORTAL_EXTERNAL_BASE_URL = os.getenv("PORTAL_EXTERNAL_BASE_URL", "http://localhost:8000").strip().rstrip("/")

def portal_url(path: str) -> str:
    """Join base portal URL with a path; accepts '/reports/...' or 'reports/...'. """
    path = path.strip()
    if not path.startswith("/"):
        path = "/" + path
    return f"{PORTAL_EXTERNAL_BASE_URL}{path}"

print("Testing Portal URL Configuration")
print("=" * 50)
print(f"Environment variable PORTAL_EXTERNAL_BASE_URL: {os.getenv('PORTAL_EXTERNAL_BASE_URL', 'NOT SET')}")
print(f"Base URL being used: {PORTAL_EXTERNAL_BASE_URL}")
print(f"Test API URL: {portal_url('/api/owners/paid-owners')}")
print("=" * 50)

# Now try to import from operator_ui and see what it has
print("\nTrying to import from operator_ui.py...")
try:
    # Temporarily add to path if needed
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    # Import operator_ui to see what it has
    import operator_ui

    print(f"operator_ui.PORTAL_EXTERNAL_BASE_URL: {operator_ui.PORTAL_EXTERNAL_BASE_URL}")
    print(f"operator_ui.portal_url test: {operator_ui.portal_url('/api/owners/paid-owners')}")
except Exception as e:
    print(f"Error importing operator_ui: {e}")