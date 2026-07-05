# main.py
# FastAPI backend for the Healthcare AI Architecture Reviewer.
# Chunk 2: component detection
# Chunk 3: control evaluation + findings engine

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import yaml
import os

app = FastAPI(title="Healthcare AI Architecture Reviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")


def load_yaml(filename):
    """Generic helper to load any YAML file from the knowledge_base folder."""
    file_path = os.path.join(KNOWLEDGE_BASE_PATH, filename)
    with open(file_path, "r",encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_components():
    return load_yaml("components.yaml")["components"]


def load_controls_catalog():
    return load_yaml("controls_catalog.yaml")["controls"]


def load_crosswalk():
    return load_yaml("framework_crosswalk.yaml")["crosswalk"]


# ---------- Chunk 2: component detection ----------

class ArchitectureInput(BaseModel):
    description: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Healthcare AI Architecture Reviewer API is running"}


@app.post("/detect")
def detect_components(payload: ArchitectureInput):
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
                break

    return {
        "detected_components": detected,
        "count": len(detected)
    }


# ---------- Chunk 3: control evaluation + findings engine ----------

class ControlStatus(BaseModel):
    component_id: str      # e.g. "azure_openai"
    control_id: str        # e.g. "private_endpoint"
    status: str             # "pass", "warning", or "missing"


class EvaluationInput(BaseModel):
    component_controls: List[ControlStatus]


# If a control is marked "warning" instead of "missing", we treat it as
# one severity level less urgent than the control's default severity.
SEVERITY_DOWNGRADE = {
    "critical": "high",
    "high": "medium",
    "medium": "low",
    "low": "low"
}


def get_component_name(component_id, components):
    for c in components:
        if c["id"] == component_id:
            return c["name"]
    return component_id  # fallback if not found


def get_control_info(component_id, control_id, controls_catalog):
    controls_for_component = controls_catalog.get(component_id, [])
    for control in controls_for_component:
        if control["id"] == control_id:
            return control
    return None


@app.post("/evaluate")
def evaluate_controls(payload: EvaluationInput):
    """
    Takes a list of component/control/status entries and generates findings
    for anything marked "missing" or "warning". Every finding is built
    directly from the knowledge base — nothing is inferred or guessed.
    """
    components = load_components()
    controls_catalog = load_controls_catalog()
    crosswalk = load_crosswalk()

    findings = []
    finding_counter = 1

    for entry in payload.component_controls:
        if entry.status not in ("missing", "warning"):
            continue  # "pass" controls don't generate findings

        control_info = get_control_info(entry.component_id, entry.control_id, controls_catalog)
        crosswalk_info = crosswalk.get(entry.control_id)

        if control_info is None or crosswalk_info is None:
            continue  # skip anything not found in the knowledge base

        severity = crosswalk_info["default_severity"]
        if entry.status == "warning":
            severity = SEVERITY_DOWNGRADE.get(severity, severity)

        finding = {
            "finding_id": f"FIND-2026-{finding_counter:04d}",
            "severity": severity,
            "status": entry.status,
            "component": get_component_name(entry.component_id, components),
            "control_name": control_info["name"],
            "description": control_info["description"],
            "framework_mapping": {
                "hipaa": crosswalk_info.get("hipaa"),
                "nist_800_53": crosswalk_info.get("nist_800_53"),
                "owasp_llm_top10": crosswalk_info.get("owasp_llm_top10"),
                "nist_ai_rmf": crosswalk_info.get("nist_ai_rmf"),
                "mitre_attack": crosswalk_info.get("mitre_attack"),
                "mitre_atlas": crosswalk_info.get("mitre_atlas"),
            }
        }
        findings.append(finding)
        finding_counter += 1

    return {
        "findings": findings,
        "total_findings": len(findings)
    }