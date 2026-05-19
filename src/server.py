from fastapi import FastAPI

app = FastAPI(title="Koralia")


@app.get("/health")
def health():
    return {"status": "ok"}
