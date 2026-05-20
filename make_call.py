import os
import sys
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

to_number = sys.argv[1]
tunnel_url = sys.argv[2]

call = client.calls.create(
    to=to_number,
    from_=os.getenv("TWILIO_PHONE_NUMBER"),
    url=tunnel_url + "/incoming-call",
    method="POST",
)

print("Call SID:", call.sid)
print("Status:", call.status)
print("Calling", to_number, "...")
