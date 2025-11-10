"""
Simple test to check the upload process
"""
import subprocess
import sys
from pathlib import Path

print("SIMPLE UPLOAD TEST")
print("-" * 40)

# Check for ZIP file
zip_files = list(Path(".").glob("*.zip"))
if not zip_files:
    print("ERROR: No ZIP files found")
    print("Please place a test ZIP file in the current directory")
    sys.exit(1)

test_zip = zip_files[0]
print(f"Using ZIP file: {test_zip.name}")

# Build minimal command
cmd = [
    sys.executable,
    "run_report.py",
    "--zip", str(test_zip),
    "--client", "Juliana Shewmaker",
    "--property", test_zip.stem.replace('_', ' '),
    "--email", "julianagomesfl@yahoo.com"
]

print("\nCommand WITHOUT owner-id:")
print(" ".join(cmd))

print("\n" + "-" * 40)
print("Running basic test WITHOUT owner-id...")
result = subprocess.run(cmd, capture_output=True, text=True)

if result.returncode == 0:
    print("SUCCESS: Basic command works")
else:
    print(f"FAILED: Return code {result.returncode}")
    if result.stderr:
        print("Error output:")
        print(result.stderr[:500])

# Now test with owner-id
print("\n" + "-" * 40)
cmd_with_owner = cmd + ["--owner-id", "portal_2", "--register"]

print("Command WITH owner-id:")
print(" ".join(cmd_with_owner))

print("\n" + "-" * 40)
print("Running test WITH owner-id...")
result2 = subprocess.run(cmd_with_owner, capture_output=True, text=True)

if result2.returncode == 0:
    print("SUCCESS: Command with owner-id works")
else:
    print(f"FAILED: Return code {result2.returncode}")
    if result2.stderr:
        print("Error output:")
        print(result2.stderr[:500])

print("\n" + "=" * 40)
print("DIAGNOSIS:")
if result.returncode == 0 and result2.returncode != 0:
    print("The issue is with the owner-id/register functionality")
elif result.returncode != 0:
    print("The basic upload is failing - check OPENAI_API_KEY and dependencies")
else:
    print("Both commands succeeded - upload should work")