# Client endpoints
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import requests
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..database import get_db
from ..auth import get_current_user, get_password_hash, verify_password, create_access_token
from ..models import Client, Property, Report
from ..storage import StorageService
from ..config import settings

router = APIRouter()

# ---------- Schemas ----------
class OwnerRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    owner_id: str
    password: str
    phone: Optional[str] = None

class OwnerLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    owner_id: Optional[str] = None
    is_paid: bool = False

# ---------- Owner Registration & Login ----------
@router.post("/register-owner", response_model=AuthResponse)
def register_owner(request: OwnerRegisterRequest, db: Session = Depends(get_db)):
    """Register a new property owner with their own dashboard"""
    
    # Check if owner_id already exists
    existing = db.query(Client).filter(
        (Client.name == request.owner_id) | (Client.email == request.email)
    ).first()
    
    if existing:
        if existing.email == request.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            raise HTTPException(status_code=400, detail="Owner ID already taken")
    
    # Create new client/owner
    client = Client(
        name=request.owner_id,  # Use owner_id as the unique identifier
        company_name=request.full_name,
        contact_name=request.full_name,
        email=request.email,
        phone=request.phone,
        portal_token=request.owner_id,  # Set portal token to owner_id for easy access
        password_hash=get_password_hash(request.password)
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    # Create access token
    access_token = create_access_token(data={"sub": request.email, "owner_id": request.owner_id})

    return AuthResponse(
        access_token=access_token,
        owner_id=request.owner_id,
        is_paid=False  # New registrations are unpaid by default
    )

@router.post("/login-owner", response_model=AuthResponse)
def login_owner(request: OwnerLoginRequest, db: Session = Depends(get_db)):
    """Login for property owners"""
    
    # Find client by email
    client = db.query(Client).filter(Client.email == request.email).first()
    
    if not client:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not hasattr(client, 'password_hash') or not client.password_hash:
        raise HTTPException(status_code=401, detail="Account not set up for login")
    
    if not verify_password(request.password, client.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    owner_id = client.name if client.name else client.email.split('@')[0]
    access_token = create_access_token(data={"sub": client.email, "owner_id": owner_id})

    # Get paid status (default to False if not set)
    is_paid = getattr(client, 'is_paid', False)

    return AuthResponse(
        access_token=access_token,
        owner_id=owner_id,
        is_paid=is_paid
    )

# ---------- Get Paid Owners for Inspector GUI ----------
@router.get("/paid-owners")
def get_paid_owners(db: Session = Depends(get_db)):
    """Get list of PAID owners only - for inspector GUI to know where to send reports"""
    import json
    from ..portal_models import PortalClient, ClientPortalToken

    paid_owners = []

    # Get all paid portal clients from the database
    portal_clients = db.query(PortalClient).filter(PortalClient.is_paid == True).all()

    for client in portal_clients:
        # Parse properties data if available
        property_list = []
        if hasattr(client, 'properties_data') and client.properties_data:
            try:
                properties = json.loads(client.properties_data)
                for prop in properties:
                    property_list.append({
                        "name": prop.get("name", ""),
                        "address": prop.get("address", "")
                    })
            except:
                property_list = []

        # Get portal token for this client
        portal_token = ""
        token_obj = db.query(ClientPortalToken).filter(ClientPortalToken.client_id == client.id).first()
        if token_obj:
            portal_token = token_obj.portal_token

        owner_data = {
            "owner_id": client.email,  # Use email as owner_id
            "name": client.full_name or client.email,
            "full_name": client.full_name or "",
            "email": client.email,
            "is_paid": True,  # Only paid owners are returned
            "properties": property_list,
            "portal_token": portal_token  # Include for dashboard navigation
        }
        paid_owners.append(owner_data)

    return {"owners": paid_owners, "message": "Only showing paid customers"}

# ---------- Payment Webhook (Stripe simulation) ----------
@router.post("/payment-webhook")
def handle_payment_webhook(request: dict, db: Session = Depends(get_db)):
    """
    Webhook endpoint to mark customer as paid when payment is received.
    In production, this would be called by Stripe/PayPal/etc.

    Expected payload:
    {
        "email": "customer@example.com",
        "payment_status": "completed",
        "amount": 49.00
    }
    """

    email = request.get("email")
    payment_status = request.get("payment_status")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    if payment_status != "completed":
        return {"message": "Payment not completed, no action taken"}

    # Find the client by email
    client = db.query(Client).filter(Client.email == email).first()

    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Mark as paid
    client.is_paid = True
    db.commit()

    # Log the payment
    print(f"✅ Payment received for {email} - Customer marked as PAID")

    return {
        "message": "Payment processed successfully",
        "customer": email,
        "status": "paid",
        "owner_id": client.name or client.portal_token
    }

# ---------- Get All Registered Owners ----------
@router.get("/owners")
def get_all_owners(db: Session = Depends(get_db)):
    """Get list of all registered owners for frontend selection"""
    
    owner_list = []
    
    # Always include Juliana's demo account
    owner_list.append({
        "owner_id": "DEMO1234",
        "name": "Juliana Shewmaker",
        "full_name": "Juliana Shewmaker",
        "email": "juliana@checkmyrental.com",
        "is_paid": True,
        "properties": [
            {"name": "Harborview 12B", "address": "4155 Key Thatch Dr, Tampa, FL"},
            {"name": "Seaside Cottage", "address": "308 Lookout Dr, Apollo Beach"},
            {"name": "Palm Grove 3C", "address": "Pinellas Park"}
        ]
    })
    
    # Try to add portal clients if they exist
    try:
        import json
        from ..portal_models import PortalClient
        
        portal_clients = db.query(PortalClient).all()
        for client in portal_clients:
            # Skip if already added (like Juliana)
            if client.email == "juliana@checkmyrental.com":
                continue
                
            # Parse properties if available
            properties = []
            if hasattr(client, 'properties_data') and client.properties_data:
                try:
                    properties = json.loads(client.properties_data)
                except:
                    properties = []
            
            owner_data = {
                "owner_id": f"portal_{client.id}",
                "name": client.full_name or client.email,
                "full_name": client.full_name or "",
                "email": client.email,
                "is_paid": getattr(client, 'is_paid', False),
                "properties": properties
            }
            owner_list.append(owner_data)
    except Exception as e:
        # Portal clients table might not exist or have issues
        print(f"Could not load portal clients: {e}")
    
    return {"owners": owner_list}

# ---------- Portal Dashboard (for simple token-based access) ----------
@router.get("/dashboard")
def get_portal_dashboard(portal_token: str, db: Session = Depends(get_db)):
    """Get dashboard data for a specific portal token (owner ID)"""
    import sqlite3
    from pathlib import Path
    import json
    from ..portal_models import ClientPortalToken, PortalClient

    print(f"Dashboard requested for token: {portal_token}")

    # First, try to find in the regular clients table
    client = db.query(Client).filter(Client.portal_token == portal_token).first()
    if client:
        # Found in clients table, return their data
        print(f"Found client in clients table: {client.name}")
        return {
            "owner": client.contact_name or client.company_name or client.name,
            "full_name": client.contact_name or client.company_name,
            "email": client.email,
            "properties": []  # No properties yet for this client
        }

    # Find the portal client by token
    token_obj = db.query(ClientPortalToken).filter(ClientPortalToken.portal_token == portal_token).first()
    if not token_obj:
        raise HTTPException(status_code=404, detail="Invalid portal token")

    portal_client = db.query(PortalClient).filter(PortalClient.id == token_obj.client_id).first()
    if not portal_client:
        raise HTTPException(status_code=404, detail="Portal client not found")

    # Query the workspace database for real reports
    workspace_db_path = Path("../workspace/inspection_portal.db")
    if not workspace_db_path.exists():
        raise HTTPException(status_code=404, detail="Reports database not found")

    conn = sqlite3.connect(str(workspace_db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Find the client by email in workspace database
    print(f"Looking for workspace client with name={portal_client.email}")
    cur.execute("SELECT id, name FROM clients WHERE name = ?", (portal_client.email,))
    workspace_client = cur.fetchone()
    print(f"Found workspace client: {workspace_client}")
    if not workspace_client:
        conn.close()
        print("No workspace client found, returning empty properties")
        return {
            "owner": portal_client.full_name or portal_client.email,
            "full_name": portal_client.full_name,
            "email": portal_client.email,
            "properties": []
        }

    workspace_client_id = workspace_client['id']

    # Get all properties for this client from workspace database
    cur.execute("""
        SELECT id, address FROM properties
        WHERE client_id = ?
    """, (workspace_client_id,))
    properties_rows = cur.fetchall()

    property_data = []
    for prop_row in properties_rows:
        prop_id = prop_row['id']
        prop_address = prop_row['address']

        # Get all reports for this property
        cur.execute("""
            SELECT id, web_dir, pdf_path, created_at
            FROM reports
            WHERE property_id = ?
            ORDER BY created_at DESC
        """, (prop_id,))
        reports_rows = cur.fetchall()

        report_data = []
        for report_row in reports_rows:
            report_id = report_row['id']
            web_dir = report_row['web_dir']
            pdf_path = report_row['pdf_path']
            created_at = report_row['created_at']

            # Try to load report.json for issue counts
            critical_count = 0
            important_count = 0
            if web_dir:
                try:
                    report_json_path = Path("..") / web_dir / "report.json"
                    if report_json_path.exists():
                        with open(report_json_path, 'r', encoding='utf-8') as f:
                            report_json = json.load(f)
                            items = report_json.get("items", [])
                            critical_count = sum(1 for i in items if i.get("severity") in ["critical", "major"])
                            important_count = sum(1 for i in items if i.get("severity") in ["important", "minor"])
                except Exception as e:
                    print(f"Error loading report JSON: {e}")

            report_data.append({
                "id": report_id,
                "date": created_at,
                "inspector": "Inspection Agent",
                "status": "completed",
                "criticalIssues": critical_count,
                "importantIssues": important_count,
                "hasPdf": bool(pdf_path),
                "hasInteractiveView": bool(web_dir)
            })

        last_inspection = reports_rows[0]['created_at'] if reports_rows else None
        property_data.append({
            "id": str(prop_id),
            "address": prop_address,
            "type": "single",
            "label": prop_address,
            "lastInspection": last_inspection,
            "reportCount": len(reports_rows),
            "reports": report_data
        })

    conn.close()

    return {
        "owner": portal_client.full_name or portal_client.email,
        "full_name": portal_client.full_name,
        "email": portal_client.email,
        "properties": property_data
    }

# ---------- Dashboard (client-level) ----------
@router.get("/")
def get_client_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.user_id == getattr(current_user, "id", None)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client profile not found")

    props = db.query(Property).filter(Property.client_id == client.id).all()
    data = {
        "client": {
            "id": client.id,
            "company_name": client.company_name,
            "contact_name": client.contact_name,
        },
        "properties": [],
    }

    for p in props:
        latest = (
            db.query(Report)
            .filter(Report.property_id == p.id)
            .order_by(Report.created_at.desc())
            .first()
        )
        data["properties"].append({
            "id": p.id,
            "address": p.address,
            "property_type": p.property_type,
            "latest_report": None if not latest else {
                "id": latest.id,
                "inspection_date": latest.inspection_date.isoformat(),
                "critical_count": latest.critical_count,
                "important_count": latest.important_count,
            },
        })

    return data

# ---------- List reports for one property ----------
@router.get("/properties/{property_id}")
def get_property_reports(
    property_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.user_id == getattr(current_user, "id", None)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client profile not found")

    prop = (
        db.query(Property)
        .filter(Property.id == property_id, Property.client_id == client.id)
        .first()
    )
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    reports = (
        db.query(Report)
        .filter(Report.property_id == property_id)
        .order_by(Report.created_at.desc())
        .all()
    )

    return {
        "property": {"id": prop.id, "address": prop.address, "property_type": prop.property_type},
        "reports": [
            {
                "id": r.id,
                "inspection_date": r.inspection_date.isoformat(),
                "critical_count": r.critical_count,
                "important_count": r.important_count,
                "pdf_standard_available": bool(r.pdf_standard_url),
                "pdf_hq_available": bool(r.pdf_hq_url and (r.pdf_hq_expires_at or datetime.min) > datetime.utcnow()),
                "created_at": r.created_at.isoformat(),
            }
            for r in reports
        ],
    }

# ---------- Portal report details (for token-based access) ----------
@router.get("/portal/report/{report_id}")
def get_portal_report_details(
    report_id: str,
    portal_token: str,
    db: Session = Depends(get_db),
):
    """Get detailed report data for portal access"""
    # Verify token and fetch report
    client = db.query(Client).filter(Client.portal_token == portal_token).first()
    if not client:
        raise HTTPException(status_code=404, detail="Invalid portal token")
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify the report belongs to this client's property
    prop = db.query(Property).filter(Property.id == report.property_id).first()
    if not prop or prop.client_id != client.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this report")
    
    # Try to get JSON data
    report_json = None
    if report.json_url:
        try:
            resp = requests.get(report.json_url, timeout=20)
            resp.raise_for_status()
            report_json = resp.json()
        except Exception as e:
            print(f"Failed to fetch report JSON from URL: {e}")
    elif report.json_path:
        # Try local file
        try:
            import json
            with open(report.json_path, 'r') as f:
                report_json = json.load(f)
        except Exception as e:
            print(f"Failed to read local JSON file: {e}")
    
    # Build PDF URLs
    pdf_urls = {}
    if report.pdf_standard_url:
        pdf_urls["standard"] = report.pdf_standard_url
    elif report.pdf_path:
        # For local files, we'll need to serve them through the API
        pdf_urls["standard"] = f"/api/portal/report/{report_id}/pdf?portal_token={portal_token}"
    
    if report.pdf_hq_url and (report.pdf_hq_expires_at or datetime.min) > datetime.utcnow():
        pdf_urls["highquality"] = report.pdf_hq_url
    
    return {
        "report": report_json or {"summary": report.summary or "No interactive data available"},
        "pdf_urls": pdf_urls,
        "property": {
            "address": prop.address,
            "property_type": prop.property_type,
            "label": prop.label or prop.address
        },
        "metadata": {
            "inspection_date": report.inspection_date.isoformat() if report.inspection_date else report.created_at.isoformat(),
            "critical_count": report.critical_count or 0,
            "important_count": report.important_count or 0
        }
    }

# ---------- PDF download for portal ----------
@router.get("/portal/report/{report_id}/pdf")
def download_portal_report_pdf(
    report_id: str,
    portal_token: str,
    db: Session = Depends(get_db),
):
    """Download PDF for portal access"""
    from fastapi.responses import FileResponse
    import os
    
    # Verify token and fetch report
    client = db.query(Client).filter(Client.portal_token == portal_token).first()
    if not client:
        raise HTTPException(status_code=404, detail="Invalid portal token")
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify the report belongs to this client's property
    prop = db.query(Property).filter(Property.id == report.property_id).first()
    if not prop or prop.client_id != client.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this report")
    
    # Check if we have a local PDF file
    if report.pdf_path and os.path.exists(report.pdf_path):
        return FileResponse(
            report.pdf_path,
            media_type="application/pdf",
            filename=f"inspection_report_{report_id}.pdf"
        )
    elif report.pdf_standard_url:
        # Redirect to external URL
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=report.pdf_standard_url)
    else:
        raise HTTPException(status_code=404, detail="PDF not available")

# ---------- Theme/Branding Endpoints ----------
@router.get("/owners/{owner_id}/theme")
def get_owner_theme(owner_id: str, db: Session = Depends(get_db)):
    """Get theme configuration for an owner"""
    # Try to find client by owner_id (name or portal_token)
    client = db.query(Client).filter(
        (Client.name == owner_id) | (Client.portal_token == owner_id)
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Owner not found")

    # Return theme config or default
    if client.theme_config:
        return client.theme_config

    # Return default theme structure
    return {
        "brandName": "CheckMyRental",
        "brandSubtitle": "Owner Portal",
        "colors": {
            "primary": "#ef4444",
            "primaryDark": "#dc2626",
            "primaryLight": "#fee2e2",
            "accent": "#3b82f6"
        },
        "features": {
            "hvacMaintenance": True,
            "photoAnalysis": True,
            "reportFiltering": True,
            "notifications": True
        }
    }

@router.post("/owners/{owner_id}/theme")
def update_owner_theme(
    owner_id: str,
    theme: dict,
    db: Session = Depends(get_db)
):
    """Update theme configuration for an owner"""
    # Find client
    client = db.query(Client).filter(
        (Client.name == owner_id) | (Client.portal_token == owner_id)
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Owner not found")

    # Update theme config
    client.theme_config = theme
    db.commit()

    return {
        "message": "Theme updated successfully",
        "theme": theme
    }

# ---------- Detailed interactive report payload ----------
@router.get("/reports/{report_id}")
def get_report_details(
    report_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch report + verify ownership via the property's client
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    prop = db.query(Property).filter(Property.id == report.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found for report")

    client = db.query(Client).filter(Client.id == prop.client_id).first()
    if not client or client.user_id != getattr(current_user, "id", None):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this report")

    # Pull JSON describing the interactive report
    try:
        resp = requests.get(report.json_url, timeout=20)
        resp.raise_for_status()
        report_json = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch report JSON: {e}")

    # Build (pre)signed PDF links based on our storage prefix convention
    storage = StorageService(
        settings.S3_ACCESS_KEY,
        settings.S3_SECRET_KEY,
        settings.S3_BUCKET_NAME,
        settings.S3_ENDPOINT_URL,
    )
    prefix = f"clients/{client.id}/properties/{prop.id}/reports/{report.id}"

    pdf_urls = {
        "standard": storage.get_signed_url(f"{prefix}/report-standard.pdf"),
        "highquality": None,
    }
    if report.pdf_hq_url and (report.pdf_hq_expires_at or datetime.min) > datetime.utcnow():
        pdf_urls["highquality"] = storage.get_signed_url(f"{prefix}/report-highquality.pdf")

    return {
        "report": report_json,
        "pdf_urls": pdf_urls,
        "property": {
            "address": prop.address,
            "property_type": prop.property_type,
        },
    }

