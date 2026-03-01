from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import bets, groups, users, wagers

app = FastAPI(title="Poly-Myket", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(bets.router)
app.include_router(wagers.router)


@app.get("/")
async def health():
    return {"status": "ok", "app": "poly-myket"}
