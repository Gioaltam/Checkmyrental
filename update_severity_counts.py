"""Update database reports with accurate severity counts from report JSON files"""
import json
from pathlib import Path
from backend.app.database import SessionLocal
from backend.app.models import Report

def update_severity_counts():
    """Scan all report JSON files and update database with severity counts"""
    db = SessionLocal()

    try:
        # Get all reports from database
        reports = db.query(Report).all()
        print(f"Found {len(reports)} reports in database")

        outputs_dir = Path("workspace/outputs")
        updated_count = 0

        for report in reports:
            # Find the report directory by address
            report_dirs = list(outputs_dir.glob(f"{report.address}*"))

            if not report_dirs:
                print(f"WARNING: No directory found for: {report.address}")
                continue

            # Use the most recent directory
            report_dir = sorted(report_dirs, key=lambda x: x.stat().st_mtime, reverse=True)[0]
            json_path = report_dir / "web" / "report.json"

            if not json_path.exists():
                print(f"WARNING: No report.json found for: {report.address}")
                continue

            try:
                # Load the report JSON
                with open(json_path, 'r', encoding='utf-8') as f:
                    report_data = json.load(f)

                # Count severities
                critical_count = 0
                important_count = 0
                minor_count = 0
                informational_count = 0

                for item in report_data.get("items", []):
                    severity = item.get("severity", "").lower()
                    if severity == "critical":
                        critical_count += 1
                    elif severity == "important":
                        important_count += 1
                    elif severity == "minor":
                        minor_count += 1
                    elif severity == "informational":
                        informational_count += 1

                # Update database
                old_critical = report.critical_count or 0
                old_important = report.important_count or 0

                report.critical_count = critical_count
                report.important_count = important_count

                if old_critical != critical_count or old_important != important_count:
                    print(f"Updated {report.address}:")
                    print(f"   Critical: {old_critical} -> {critical_count}")
                    print(f"   Important: {old_important} -> {important_count}")
                    print(f"   Minor: {minor_count}, Informational: {informational_count}")
                    updated_count += 1
                else:
                    print(f"{report.address} - Already up to date")

            except json.JSONDecodeError as e:
                print(f"ERROR: Error reading JSON for {report.address}: {e}")
                continue
            except Exception as e:
                print(f"ERROR: Error processing {report.address}: {e}")
                continue

        # Commit all changes
        db.commit()
        print(f"\n{'='*60}")
        print(f"Successfully updated {updated_count} reports")
        print(f"{'='*60}")

        # Show summary
        print("\nSummary:")
        total_critical = sum(r.critical_count or 0 for r in reports)
        total_important = sum(r.important_count or 0 for r in reports)
        print(f"   Total Critical Issues: {total_critical}")
        print(f"   Total Important Issues: {total_important}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: Database error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Updating severity counts from report JSON files...\n")
    update_severity_counts()
    print("\nDone!")
