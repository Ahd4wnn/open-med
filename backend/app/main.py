from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes.auth import router as auth_router
from app.api.routes.patient import router as patient_router
from app.api.routes.interactions import router as interactions_router
from app.api.routes.risk import router as risk_router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("OpenMed API started")
    print("OpenMed API started")
    yield
    # Shutdown
    logger.info("OpenMed API shutting down")

app = FastAPI(
    title="OpenMed API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(interactions_router)
app.include_router(risk_router)

@app.get("/")
async def root():
    return {"status": "OpenMed API is running", "version": "1.0.0"}
