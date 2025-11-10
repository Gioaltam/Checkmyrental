"""
Seasonal Tasks API for Florida-specific property maintenance tracking
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime

from ..database import get_db
from ..models import SeasonalTask, Client

router = APIRouter()

# Default seasonal tasks for each month (Florida-specific)
DEFAULT_TASKS = {
    1: [  # January
        {"key": "jan_exterior_maintenance", "name": "Complete exterior maintenance window tasks"},
        {"key": "jan_smoke_detectors", "name": "Test smoke detectors and carbon monoxide alarms"},
        {"key": "jan_plumbing_inspect", "name": "Inspect plumbing for leaks and winterization needs"},
        {"key": "jan_gutter_clean", "name": "Deep clean gutters and downspouts"},
    ],
    2: [  # February
        {"key": "feb_hvac_filter", "name": "Replace HVAC filters"},
        {"key": "feb_windows_caulk", "name": "Inspect and caulk windows for air leaks"},
        {"key": "feb_irrigation_test", "name": "Test irrigation system for leaks"},
        {"key": "feb_exterior_paint", "name": "Schedule exterior painting if needed"},
    ],
    3: [  # March
        {"key": "mar_roof_inspect", "name": "Schedule annual roof inspection"},
        {"key": "mar_ac_tuneup", "name": "Professional A/C tune-up before summer"},
        {"key": "mar_emergency_kit", "name": "Replenish emergency supply kit"},
        {"key": "mar_insurance_review", "name": "Review property insurance coverage"},
    ],
    4: [  # April
        {"key": "apr_tree_trim", "name": "Trim trees and remove dead branches"},
        {"key": "apr_roof_cert", "name": "Obtain roof certification if due"},
        {"key": "apr_drainage_test", "name": "Test drainage systems before wet season"},
        {"key": "apr_outdoor_furniture", "name": "Secure or store outdoor furniture"},
    ],
    5: [  # May
        {"key": "may_hurricane_prep", "name": "Complete final pre-hurricane preparations"},
        {"key": "may_generator_test", "name": "Test backup generator if installed"},
        {"key": "may_gutter_clear", "name": "Clear all gutters and drainage systems"},
        {"key": "may_inventory", "name": "Update property inventory for insurance"},
    ],
    6: [  # June
        {"key": "jun_shutters_inspect", "name": "Inspect and test storm shutters"},
        {"key": "jun_photo_document", "name": "Document property condition with photos"},
        {"key": "jun_secure_items", "name": "Secure all outdoor items and equipment"},
        {"key": "jun_contact_update", "name": "Update emergency contact information"},
    ],
    7: [  # July
        {"key": "jul_weather_monitor", "name": "Monitor tropical weather forecasts daily"},
        {"key": "jul_ac_check", "name": "Check A/C performance during peak heat"},
        {"key": "jul_emergency_supplies", "name": "Stock emergency supplies (water, batteries)"},
        {"key": "jul_drainage_inspect", "name": "Inspect property drainage after heavy rains"},
    ],
    8: [  # August
        {"key": "aug_storm_shutters", "name": "Verify storm shutter deployment readiness"},
        {"key": "aug_roof_check", "name": "Check roof for any loose shingles or damage"},
        {"key": "aug_generator_fuel", "name": "Check generator fuel and maintenance"},
        {"key": "aug_hurricane_plan", "name": "Review hurricane evacuation plan"},
    ],
    9: [  # September
        {"key": "sep_storm_watch", "name": "Maintain vigilant storm watch (peak season)"},
        {"key": "sep_interior_prep", "name": "Prep interior for potential storm impacts"},
        {"key": "sep_valuables_secure", "name": "Secure or move valuable items to safety"},
        {"key": "sep_insurance_docs", "name": "Keep insurance documents accessible"},
    ],
    10: [  # October
        {"key": "oct_storm_monitor", "name": "Continue monitoring tropical activity"},
        {"key": "oct_damage_assess", "name": "Assess any storm damage from recent weather"},
        {"key": "oct_roof_inspect", "name": "Inspect roof after any major storms"},
        {"key": "oct_mold_check", "name": "Check for water intrusion and mold growth"},
    ],
    11: [  # November
        {"key": "nov_post_season", "name": "Complete post-hurricane season assessment"},
        {"key": "nov_hvac_maintain", "name": "Schedule HVAC system deep cleaning"},
        {"key": "nov_repair_schedule", "name": "Schedule any needed storm repairs"},
        {"key": "nov_winterize", "name": "Winterize outdoor faucets and irrigation"},
    ],
    12: [  # December
        {"key": "dec_annual_review", "name": "Conduct end-of-year property review"},
        {"key": "dec_certifications", "name": "Schedule annual certifications and inspections"},
        {"key": "dec_maintenance_plan", "name": "Plan next year's maintenance schedule"},
        {"key": "dec_exterior_repairs", "name": "Complete any exterior repairs before spring"},
    ],
}


# ---------- Schemas ----------
class SeasonalTaskResponse(BaseModel):
    id: str
    task_key: str
    task_name: str
    month: int
    completed: bool
    completed_at: str | None
    year: int

    class Config:
        from_attributes = True


class ToggleTaskRequest(BaseModel):
    client_id: str
    task_key: str
    completed: bool
    year: int
    month: int


# ---------- Helper Functions ----------
def get_or_create_tasks_for_month(
    db: Session,
    client_id: str,
    month: int,
    year: int
) -> List[SeasonalTask]:
    """Get existing tasks or create default tasks for the month"""
    # Try to get existing tasks
    tasks = db.query(SeasonalTask).filter(
        SeasonalTask.client_id == client_id,
        SeasonalTask.month == month,
        SeasonalTask.year == year
    ).all()

    # If no tasks exist, create defaults
    if not tasks:
        default_tasks = DEFAULT_TASKS.get(month, [])
        for task_def in default_tasks:
            task = SeasonalTask(
                client_id=client_id,
                task_key=task_def["key"],
                task_name=task_def["name"],
                month=month,
                year=year,
                completed=False
            )
            db.add(task)
        db.commit()

        # Re-fetch the newly created tasks
        tasks = db.query(SeasonalTask).filter(
            SeasonalTask.client_id == client_id,
            SeasonalTask.month == month,
            SeasonalTask.year == year
        ).all()

    return tasks


# ---------- API Endpoints ----------
@router.get("/seasonal-tasks", response_model=List[SeasonalTaskResponse])
def get_seasonal_tasks(
    client_id: str,
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Get seasonal tasks for a client and month"""
    # Use current month/year if not provided
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    # Verify client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get or create tasks
    tasks = get_or_create_tasks_for_month(db, client_id, month, year)

    # Convert to response format
    return [
        SeasonalTaskResponse(
            id=task.id,
            task_key=task.task_key,
            task_name=task.task_name,
            month=task.month,
            completed=task.completed,
            completed_at=task.completed_at.isoformat() if task.completed_at else None,
            year=task.year
        )
        for task in tasks
    ]


@router.post("/seasonal-tasks/toggle")
def toggle_seasonal_task(
    request: ToggleTaskRequest,
    db: Session = Depends(get_db)
):
    """Toggle completion status of a seasonal task"""
    # Find the task
    task = db.query(SeasonalTask).filter(
        SeasonalTask.client_id == request.client_id,
        SeasonalTask.task_key == request.task_key,
        SeasonalTask.month == request.month,
        SeasonalTask.year == request.year
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update completion status
    task.completed = request.completed
    task.completed_at = datetime.now() if request.completed else None

    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "task_key": task.task_key,
        "completed": task.completed,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None
    }


@router.get("/seasonal-tasks/status")
def get_seasonal_task_status(
    client_id: str,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Get completion status for all tasks in the current year"""
    if year is None:
        year = datetime.now().year

    # Get all tasks for the year
    tasks = db.query(SeasonalTask).filter(
        SeasonalTask.client_id == client_id,
        SeasonalTask.year == year
    ).all()

    # Build status dict
    status = {}
    for task in tasks:
        status[task.task_key] = task.completed

    return {
        "client_id": client_id,
        "year": year,
        "task_status": status,
        "total_tasks": len(tasks),
        "completed_tasks": sum(1 for t in tasks if t.completed)
    }
