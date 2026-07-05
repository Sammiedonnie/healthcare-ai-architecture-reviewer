# main.py
# FastAPI backend for the Healthcare AI Architecture Reviewer.
# This file currently handles component detection (Chunk 2).

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yaml
import os

app = FastAPI(title="Healthcare AI Architecture Reviewer API")

# Allow the frontend (running on a different port) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local development; we'll restrict this later
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the knowledge_base folder, one level up from /backend
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")


def load_components():
    """Load components.yaml into a Python list."""
    file_path = os.path.join(KNOWLEDGE_BASE_PATH, "components.yaml")
    with open(file_path, "r") as f:
        data = yaml.safe_load(f)
    return data["components"]


class ArchitectureInput(BaseModel):
    description: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Healthcare AI Architecture Reviewer API is running"}


@app.post("/detect")
def detect_components(payload: ArchitectureInput):
    """
    Detects which known components are mentioned in the architecture description.
    This is a simple keyword match against components.yaml — no AI model involved,
    so results are consistent and explainable.
    """
    text = payload.description.lower()
    components = load_components()

    detected = []
    for component in components:
        for keyword in component["keywords"]:
            if keyword.lower() in text:
                detected.append({
                    "id": component["id"],
                    "name": component["name"],
                    "category": component["category"]
                })
                break  # stop checking keywords once we've matched this component once

    return {
        "detected_components": detected,
        "count": len(detected)
    }