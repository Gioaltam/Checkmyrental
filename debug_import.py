import sys
import importlib.util

# Load the spec for operator_ui
spec = importlib.util.spec_from_file_location("operator_ui", "operator_ui.py")
print(f"Loading from: {spec.origin}")

# Create a module from the spec
operator_ui = importlib.util.module_from_spec(spec)

# Before executing, let's see what's in the source
with open("operator_ui.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for i in range(119, 123):  # Lines around 121
        print(f"Line {i+1}: {lines[i].strip()}")

print("\nNow executing the module...")

# Execute the module
spec.loader.exec_module(operator_ui)

print(f"\nAfter import, PORTAL_EXTERNAL_BASE_URL = {operator_ui.PORTAL_EXTERNAL_BASE_URL}")