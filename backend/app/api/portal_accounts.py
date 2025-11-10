from __future__ import annotations
import os
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from pydantic import BaseModel, EmailStr, Field

from ..portal_models import SessionLocal, init_portal_tables, PortalClient, ClientPortalToken, PortalCode
from ..portal_security import hash_password, verify_password, create_access_token, get_current_portal_client

router = APIRouter()

# ensure tables exist at import time (safe for SQLite dev)
init_portal_tables()

# ---------- Schemas ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200, description="Full name for identification")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CreateCodeIn(BaseModel):
    portal_token: str = Field(..., description="Your existing portal token for that property/gallery")
    expires_in_days: int = Field(14, ge=1, le=365)
    note: str | None = Field(None, description="Optional note, e.g., property address")


class CreateCodeOut(BaseModel):
    code: str
    expires_at: datetime
    note: str | None = None


class LinkCodeIn(BaseModel):
    code: str = Field(..., min_length=6, max_length=32)


class TokensOut(BaseModel):
    tokens: List[str]


class ProfileOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_paid: bool
    created_at: datetime


class ProfileUpdateIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=200, description="Full name for identification")


# ---------- Helpers ----------
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no O/0/I/1 confusions


def new_code(n: int = 8) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


def get_admin_guard(request: Request):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key:
        # Dev convenience: allow if not configured
        return
    provided = request.headers.get("x-admin-key")
    if provided != admin_key:
        raise HTTPException(status_code=403, detail="Forbidden (admin key required)")


# ---------- Routes (Client) ----------
@router.post("/register", response_model=AuthOut)
def portal_register(payload: RegisterIn):
    db = SessionLocal()
    try:
        email_clean = payload.email.strip().lower()
        
        exists = db.query(PortalClient).filter(PortalClient.email == email_clean).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")
        
        # Create new portal client
        client = PortalClient(
            email=email_clean,
            password_hash=hash_password(payload.password.strip()),
            full_name=payload.full_name.strip(),
            is_active=True,
            is_paid=False
        )
        
        db.add(client)
        db.commit()
        db.refresh(client)
        return AuthOut(access_token=create_access_token(client.id, client.email))
    finally:
        db.close()


@router.post("/login", response_model=AuthOut)
def portal_login(payload: LoginIn):
    db = SessionLocal()
    try:
        # Trim spaces from email for consistency
        email_clean = payload.email.strip().lower()
        client = db.query(PortalClient).filter(PortalClient.email == email_clean).first()
        
        # Try password as-is first, then with trimmed spaces if that fails
        password_valid = False
        if client:
            # First try with exact password
            password_valid = verify_password(payload.password, client.password_hash)
            
            # If that fails, try with trimmed password
            if not password_valid:
                password_valid = verify_password(payload.password.strip(), client.password_hash)
        
        if not client or not password_valid:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return AuthOut(access_token=create_access_token(client.id, client.email))
    finally:
        db.close()


@router.get("/my-tokens", response_model=TokensOut)
def my_tokens(current=Depends(get_current_portal_client)):
    db = SessionLocal()
    try:
        rows = db.query(ClientPortalToken).filter(ClientPortalToken.client_id == current.id).all()
        return TokensOut(tokens=[r.portal_token for r in rows])
    finally:
        db.close()


@router.post("/link-code")
def link_code(payload: LinkCodeIn, current=Depends(get_current_portal_client)):
    db = SessionLocal()
    try:
        code = db.query(PortalCode).filter(PortalCode.code == payload.code.upper()).first()
        if not code:
            raise HTTPException(status_code=404, detail="Code not found")
        if code.expires_at and datetime.utcnow() > code.expires_at:
            raise HTTPException(status_code=410, detail="Code expired")
        # Single-use by default; allow re-link by same client
        if code.used_by_client_id and code.used_by_client_id != current.id:
            raise HTTPException(status_code=409, detail="Code already used")

        # Link token to client (upsert)
        existing = (
            db.query(ClientPortalToken)
            .filter(ClientPortalToken.client_id == current.id, ClientPortalToken.portal_token == code.portal_token)
            .first()
        )
        if not existing:
            db.add(ClientPortalToken(client_id=current.id, portal_token=code.portal_token))

        # Mark code as used by this client for audit
        code.used_by_client_id = current.id
        db.commit()
        return {"status": "linked", "portal_token": code.portal_token}
    finally:
        db.close()


# ---------- Profile Management ----------
@router.get("/profile", response_model=ProfileOut)
def get_profile(current: PortalClient = Depends(get_current_portal_client)):
    """
    Get current user's profile information.
    Requires authentication via JWT token.
    """
    return ProfileOut(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        is_active=current.is_active,
        is_paid=current.is_paid,
        created_at=current.created_at
    )


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdateIn,
    current: PortalClient = Depends(get_current_portal_client)
):
    """
    Update current user's profile information.
    Currently only supports updating full_name.
    """
    db = SessionLocal()
    try:
        # Get the current client from db to update
        client = db.query(PortalClient).filter(PortalClient.id == current.id).first()

        if not client:
            raise HTTPException(status_code=404, detail="User not found")

        # Update full_name
        client.full_name = payload.full_name.strip()
        db.commit()
        db.refresh(client)

        return ProfileOut(
            id=client.id,
            email=client.email,
            full_name=client.full_name,
            is_active=client.is_active,
            is_paid=client.is_paid,
            created_at=client.created_at
        )
    finally:
        db.close()


# ---------- Magic Link Authentication ----------
class MagicLinkRequestIn(BaseModel):
    email: EmailStr

class MagicLinkRequestOut(BaseModel):
    message: str
    magic_link: str | None = None  # Only returned in dev mode

@router.post("/request-magic-link", response_model=MagicLinkRequestOut)
def request_magic_link(payload: MagicLinkRequestIn, request: Request):
    """
    Request a passwordless magic link. In production, this sends an email.
    In development, it returns the link directly for testing.
    """
    db = SessionLocal()
    try:
        email_clean = payload.email.strip().lower()
        client = db.query(PortalClient).filter(PortalClient.email == email_clean).first()

        if not client:
            # For security, don't reveal if account exists
            # In production, we'd still return success but not send email
            return MagicLinkRequestOut(
                message="If an account exists with that email, you'll receive a login link shortly."
            )

        # Generate a short-lived access token (valid for 15 minutes)
        magic_token = create_access_token(client.id, client.email, expires_delta=timedelta(minutes=15))

        # Build the magic link URL
        # In production, this would be your actual domain
        dashboard_url = os.environ.get("PUBLIC_DASHBOARD_URL", "http://localhost:3000")
        magic_link = f"{dashboard_url}?magic={magic_token}"

        # TODO: In production, send email here using SendGrid, AWS SES, etc.
        # For now, we'll return the link in development mode
        is_dev = os.environ.get("ENVIRONMENT", "development") == "development"

        if is_dev:
            return MagicLinkRequestOut(
                message="Development mode: Magic link generated (see magic_link field)",
                magic_link=magic_link
            )
        else:
            # TODO: Send email with magic_link
            # send_email(to=client.email, subject="Your Login Link", body=f"Click here: {magic_link}")
            return MagicLinkRequestOut(
                message="Check your email for a login link!"
            )

    finally:
        db.close()


# ---------- OAuth Social Login ----------
from fastapi.responses import RedirectResponse

@router.get("/oauth/{provider}")
async def oauth_login(provider: str, redirect_uri: str, state: str):
    """
    Initiates OAuth flow with the specified provider (google, apple, microsoft).

    TODO: To enable, add OAuth credentials to .env:
    - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    - APPLE_CLIENT_ID, APPLE_CLIENT_SECRET
    - MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET

    Get credentials from:
    - Google: https://console.cloud.google.com/apis/credentials
    - Apple: https://developer.apple.com/account/resources/identifiers
    - Microsoft: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
    """

    # OAuth configuration
    providers_config = {
        "google": {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "scopes": "email profile openid"
        },
        "apple": {
            "client_id": os.environ.get("APPLE_CLIENT_ID", ""),
            "auth_url": "https://appleid.apple.com/auth/authorize",
            "scopes": "email name"
        },
        "microsoft": {
            "client_id": os.environ.get("MICROSOFT_CLIENT_ID", ""),
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "scopes": "User.Read"
        }
    }

    if provider not in providers_config:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' not supported")

    config = providers_config[provider]

    if not config["client_id"]:
        # OAuth not configured - return helpful error
        raise HTTPException(
            status_code=501,
            detail=f"{provider.capitalize()} OAuth not configured. Add {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET to .env"
        )

    # Build OAuth authorization URL
    import urllib.parse
    params = {
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": config["scopes"],
        "state": state
    }

    auth_url = f"{config['auth_url']}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/oauth/callback")
async def oauth_callback(code: str, state: str):
    """
    Handles OAuth callback after user authorizes.

    Supports Google, Apple, and Microsoft OAuth.
    Extracts user's email and full name, then creates or logs in the user.
    """
    import json
    import httpx
    from urllib.parse import parse_qs, unquote

    # Parse state to determine provider
    try:
        state_data = json.loads(state)
        provider = state_data.get("provider", "google")
    except:
        # Fallback if state is malformed
        provider = "google"

    # Get OAuth config from environment
    from ..config import settings

    # Provider-specific configuration
    oauth_configs = {
        "google": {
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
        },
        "microsoft": {
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
        },
        "apple": {
            "token_url": "https://appleid.apple.com/auth/token",
            "userinfo_url": "https://appleid.apple.com/auth/userinfo",
            "client_id": settings.APPLE_CLIENT_ID,
            "client_secret": settings.APPLE_CLIENT_SECRET,
        }
    }

    if provider not in oauth_configs:
        raise HTTPException(status_code=400, detail=f"Provider '{provider}' not supported")

    config = oauth_configs[provider]

    if not config["client_id"] or not config["client_secret"]:
        raise HTTPException(
            status_code=501,
            detail=f"{provider.capitalize()} OAuth not configured. Add credentials to .env"
        )

    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(
                config["token_url"],
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.OAUTH_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for token: {token_response.text}"
                )

            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(status_code=400, detail="No access token received")

            # Get user info from provider
            userinfo_response = await client.get(
                config["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get user info: {userinfo_response.text}"
                )

            user_info = userinfo_response.json()

        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"OAuth request failed: {str(e)}")

    # Extract email and name from user info (provider-specific)
    if provider == "google":
        email = user_info.get("email")
        given_name = user_info.get("given_name", "")
        family_name = user_info.get("family_name", "")
        full_name = user_info.get("name") or f"{given_name} {family_name}".strip()

    elif provider == "microsoft":
        email = user_info.get("mail") or user_info.get("userPrincipalName")
        full_name = user_info.get("displayName") or ""
        if not full_name:
            given_name = user_info.get("givenName", "")
            surname = user_info.get("surname", "")
            full_name = f"{given_name} {surname}".strip()

    elif provider == "apple":
        email = user_info.get("email")
        # Apple only sends name on first auth, and it's in a different format
        name_obj = user_info.get("name", {})
        first_name = name_obj.get("firstName", "")
        last_name = name_obj.get("lastName", "")
        full_name = f"{first_name} {last_name}".strip()

        # If name not provided, derive from email
        if not full_name and email:
            email_prefix = email.split('@')[0]
            full_name = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth provider")

    # If full_name is still empty, derive from email
    if not full_name:
        email_prefix = email.split('@')[0]
        full_name = email_prefix.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

    # Create or login user in database
    db = SessionLocal()
    try:
        email_clean = email.strip().lower()

        # Check if user already exists
        existing_client = db.query(PortalClient).filter(PortalClient.email == email_clean).first()

        if existing_client:
            # User exists - log them in
            # Update full_name if it was empty
            if not existing_client.full_name or existing_client.full_name.strip() == "":
                existing_client.full_name = full_name
                db.commit()

            client = existing_client
        else:
            # Create new user
            client = PortalClient(
                email=email_clean,
                password_hash=hash_password(secrets.token_urlsafe(32)),  # Random password for OAuth users
                full_name=full_name,
                is_active=True,
                is_paid=False
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        # Generate JWT token
        jwt_token = create_access_token(client.id, client.email)

        # Redirect to dashboard with token
        from ..config import settings as app_settings
        dashboard_url = os.getenv("PUBLIC_DASHBOARD_URL", "http://localhost:3000")
        redirect_url = f"{dashboard_url}?token={jwt_token}"

        return RedirectResponse(url=redirect_url)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create/login user: {str(e)}")
    finally:
        db.close()


# ---------- Routes (Admin) ----------
@router.post("/admin/portal-codes", response_model=CreateCodeOut)
def admin_create_portal_code(payload: CreateCodeIn, request: Request):
    get_admin_guard(request)

    db = SessionLocal()
    try:
        # make a unique 8-char code
        for _ in range(6):
            candidate = new_code(8)
            if not db.query(PortalCode).filter(PortalCode.code == candidate).first():
                code_str = candidate
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate a unique code")

        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
        row = PortalCode(code=code_str, portal_token=payload.portal_token, note=payload.note, expires_at=expires_at)
        db.add(row)
        db.commit()
        return CreateCodeOut(code=code_str, expires_at=expires_at, note=payload.note)
    finally:
        db.close()


@router.get("/dashboard")
def get_portal_dashboard_jwt(current_client=Depends(get_current_portal_client)):
    """Get dashboard data for the authenticated portal client using JWT"""
    from ..database import SessionLocal as AppDB
    from ..models import Client, Property, Report

    app_db = AppDB()
    try:
        print(f"[Dashboard JWT] Fetching data for portal client: {current_client.email}")

        # Try to find linked client in the legacy clients table
        # Portal clients can have portal tokens that link to the old system
        portal_db = SessionLocal()
        try:
            tokens = portal_db.query(ClientPortalToken).filter(
                ClientPortalToken.client_id == current_client.id
            ).all()
            portal_tokens = [t.portal_token for t in tokens]
        finally:
            portal_db.close()

        print(f"[Dashboard JWT] Found {len(portal_tokens)} portal tokens")

        # Collect all properties and reports from all linked portal tokens
        all_properties = []
        for portal_token in portal_tokens:
            client = app_db.query(Client).filter(Client.portal_token == portal_token).first()
            if client:
                print(f"[Dashboard JWT] Found legacy client: {client.name}")
                properties = app_db.query(Property).filter(Property.client_id == client.id).all()

                for prop in properties:
                    reports = app_db.query(Report).filter(
                        Report.property_id == prop.id
                    ).order_by(Report.created_at.desc()).all()

                    report_data = []
                    for report in reports:
                        date_val = None
                        if report.inspection_date:
                            if hasattr(report.inspection_date, 'isoformat'):
                                date_val = report.inspection_date.isoformat()
                            else:
                                date_val = str(report.inspection_date)
                        elif report.created_at:
                            if hasattr(report.created_at, 'isoformat'):
                                date_val = report.created_at.isoformat()
                            else:
                                date_val = str(report.created_at)

                        report_data.append({
                            "id": report.id,
                            "property": prop.address,
                            "date": date_val,
                            "type": report.inspection_type or "Inspection",
                            "criticalIssues": report.critical_count or 0,
                            "importantIssues": report.important_count or 0,
                            "photos": report.photo_count or 0
                        })

                    all_properties.append({
                        "id": prop.id,
                        "address": prop.address,
                        "reports": report_data,
                        "critical_count": sum(r["criticalIssues"] for r in report_data),
                        "important_count": sum(r["importantIssues"] for r in report_data)
                    })

        return {
            "owner": current_client.full_name,
            "email": current_client.email,
            "client_id": current_client.id,
            "full_name": current_client.full_name,
            "properties": all_properties,
            "reports": [r for prop in all_properties for r in prop["reports"]]
        }

    finally:
        app_db.close()
