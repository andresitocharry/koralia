import os
import sys
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

TUNNEL_URL = sys.argv[1] if len(sys.argv) > 1 else None

client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

numbers = client.incoming_phone_numbers.list()
for n in numbers:
    print("Number:", n.phone_number, "| SID:", n.sid)
    if TUNNEL_URL:
        n.update(
            voice_url=TUNNEL_URL + "/incoming-call",
            voice_method="POST",
        )
        print("  Updated voice URL to:", TUNNEL_URL + "/incoming-call")
