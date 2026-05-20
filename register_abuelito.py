import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY"),
)


def get_or_create_test_nieto():
    """Get or create a test nieto user for development."""
    test_email = "test-nieto@koralia.dev"

    # Try to find existing test user
    users = supabase.auth.admin.list_users()
    for user in users:
        if user.email == test_email:
            return user.id

    # Create test user
    user = supabase.auth.admin.create_user({
        "email": test_email,
        "password": "test-koralia-2026",
        "email_confirm": True,
    })
    print(f"Created test nieto: {user.user.id}")
    return user.user.id


if len(sys.argv) < 3:
    print("Usage: python register_abuelito.py <name> <phone> [personality_notes]")
    print("Example: python register_abuelito.py 'Doña María' '+573196807220'")
    sys.exit(1)

name = sys.argv[1]
phone = sys.argv[2]
notes = sys.argv[3] if len(sys.argv) > 3 else None

nieto_id = get_or_create_test_nieto()

result = supabase.table("abuelitos").insert({
    "nieto_id": nieto_id,
    "name": name,
    "phone": phone,
    "personality_notes": notes,
}).execute()

abuelito = result.data[0]
print(f"Registered: {abuelito['name']} ({abuelito['phone']})")
print(f"ID: {abuelito['id']}")
