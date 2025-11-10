
from app.database import SessionLocal
from app.portal_models import PortalClient, ClientPortalToken
import json

def test_get_paid_owners():
    db = SessionLocal()
    try:
        paid_owners = []
        portal_clients = db.query(PortalClient).filter(PortalClient.is_paid == True).all()
        
        for client in portal_clients:
            property_list = []
            if hasattr(client, "properties_data") and client.properties_data:
                try:
                    properties = json.loads(client.properties_data)
                    for prop in properties:
                        property_list.append({
                            "name": prop.get("name", ""),
                            "address": prop.get("address", "")
                        })
                except Exception as e:
                    print(f"Error parsing properties: {e}")
                    property_list = []
            
            portal_token = ""
            token_obj = db.query(ClientPortalToken).filter(ClientPortalToken.client_id == client.id).first()
            if token_obj:
                portal_token = token_obj.portal_token
            
            owner_data = {
                "owner_id": client.email,
                "name": client.full_name or client.email,
                "full_name": client.full_name or "",
                "email": client.email,
                "is_paid": True,
                "properties": property_list,
                "portal_token": portal_token
            }
            paid_owners.append(owner_data)
        
        print(json.dumps({"owners": paid_owners, "message": "Only showing paid customers"}, indent=2))
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()

test_get_paid_owners()
