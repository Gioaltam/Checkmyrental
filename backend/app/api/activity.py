"""Recent activity feed for owner dashboard"""
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import Client, Property, Report
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter()

@router.get("/recent")
def get_recent_activity(
    portal_token: str = Query(..., description="Owner portal token"),
    limit: int = Query(10, description="Number of activities to return")
) -> List[Dict[str, Any]]:
    """
    Get recent activity for an owner based on their reports
    Generates activity feed from actual inspection data
    """
    db: Session = next(get_db())

    try:
        # Find the client by portal token
        client = db.query(Client).filter(Client.portal_token == portal_token).first()

        if not client:
            raise HTTPException(status_code=404, detail="Owner not found")

        # Get all properties for this client
        properties = db.query(Property).filter(Property.client_id == client.id).all()
        property_ids = [p.id for p in properties]

        if not property_ids:
            return []

        # Get recent reports
        reports_list = (
            db.query(Report)
            .filter(Report.property_id.in_(property_ids))
            .order_by(desc(Report.created_at))
            .limit(20)
            .all()
        )

        # Generate activity items from reports
        activities = []

        for report in reports_list:
            # Calculate time ago
            time_diff = datetime.utcnow() - report.created_at
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
            elif time_diff.seconds >= 3600:
                hours = time_diff.seconds // 3600
                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                minutes = max(1, time_diff.seconds // 60)
                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"

            # Create activity for inspection completion
            activities.append({
                "type": "inspection",
                "message": f"Inspection completed at {report.address}",
                "time": time_ago,
                "propertyAddress": report.address,
                "reportId": report.id
            })

            # If there are critical issues, add an issue activity
            if report.critical_count and report.critical_count > 0:
                activities.append({
                    "type": "issue",
                    "message": f"{report.critical_count} critical {'issue' if report.critical_count == 1 else 'issues'} found at {report.address}",
                    "time": time_ago,
                    "propertyAddress": report.address,
                    "reportId": report.id
                })

            # If there are important issues (for resolution activity)
            elif report.important_count and report.important_count > 0:
                activities.append({
                    "type": "resolution",
                    "message": f"{report.important_count} maintenance {'item' if report.important_count == 1 else 'items'} identified at {report.address}",
                    "time": time_ago,
                    "propertyAddress": report.address,
                    "reportId": report.id
                })

        # Return most recent activities (already sorted by report creation time)
        return activities[:limit]

    except Exception as e:
        import traceback
        print(f"Activity endpoint error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
