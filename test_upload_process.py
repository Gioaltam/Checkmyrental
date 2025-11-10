"""
Test the upload process to identify the exact issue
"""
import os
import sys
import subprocess
from pathlib import Path

def test_upload():
    # Check if run_report.py exists
    run_report_path = Path("run_report.py")
    if not run_report_path.exists():
        print("ERROR: run_report.py not found!")
        return

    print("=== TESTING UPLOAD PROCESS ===\n")

    # Check for a test zip file
    zip_files = list(Path(".").glob("*.zip"))
    if not zip_files:
        print("ERROR: No ZIP files found in current directory")
        print("Please place a test ZIP file in the directory")
        return

    test_zip = zip_files[0]
    print(f"Using test ZIP: {test_zip}")

    # Build the command that operator app would use
    cmd = [
        sys.executable,
        "run_report.py",
        "--zip", str(test_zip),
        "--register",
        "--client", "Juliana Shewmaker",
        "--property", test_zip.stem.replace('_', ' '),
        "--owner-id", "portal_2",
        "--email", "julianagomesfl@yahoo.com"
    ]

    print("\nCommand that would be executed:")
    print(" ".join(cmd))

    print("\n" + "="*60)
    response = input("Do you want to run this command? (yes/no): ").strip().lower()

    if response == 'yes':
        print("\nRunning command...\n")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)

            print("STDOUT:")
            print(result.stdout)

            if result.stderr:
                print("\nSTDERR:")
                print(result.stderr)

            print(f"\nReturn code: {result.returncode}")

            if result.returncode != 0:
                print("\n❌ Command failed!")
            else:
                print("\n✅ Command succeeded!")

        except Exception as e:
            print(f"ERROR running command: {e}")
    else:
        print("Test cancelled.")

    print("\n" + "="*60)
    print("Common issues and fixes:")
    print("1. Missing OPENAI_API_KEY in .env file")
    print("2. Database connection issues")
    print("3. Invalid owner_id format")
    print("4. File permissions")
    print("5. Missing dependencies")

if __name__ == "__main__":
    test_upload()