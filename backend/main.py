# main.py
# FastAPI backend for the Healthcare AI Architecture Reviewer.
# Chunk 2: component detection
# Chunk 3: control evaluation + findings engine
# Chunk 4: PHI detection + risk scoring

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
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_components():
    return load_yaml("components.yaml")["components"]


def load_controls_catalog():
    return load_yaml("controls_catalog.yaml")["controls"]


def load_crosswalk():
    return load_yaml("framework_crosswalk.yaml")["crosswalk"]


def load_phi_indicators():
    return load_yaml("phi_indicators.yaml")["phi_indicators"]


# ---------- Chunk 2: component detection ----------

class ArchitectureInput(BaseModel):
    description: str


@app.get("/")
def root():
    return {"status": "ok", "message": "Healthcare AI Architecture Reviewer API is running"}


@app.get("/controls")
def get_controls_catalog():
    """
    Returns the full controls catalog so the frontend can build
    a checklist for whichever components were detected.
    """
    return load_controls_catalog()

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


# ---------- Chunk 4: PHI detection ----------

@app.post("/phi-scan")
def phi_scan(payload: ArchitectureInput):
    """
    Scans the architecture description text for PHI indicator keywords.
    This is a keyword match, not a clinical NLP model, so results are
    consistent and explainable — same input always gives same output.
    """
    text = payload.description.lower()
    indicators = load_phi_indicators()

    matches = []
    for indicator in indicators:
        if indicator["term"].lower() in text:
            matches.append({
                "term": indicator["term"],
                "category": indicator["category"],
                "risk_note": indicator["risk_note"]
            })

    return {
        "phi_matches": matches,
        "count": len(matches)
    }


# ---------- Chunk 3: control evaluation + findings engine ----------

class ControlStatus(BaseModel):
    component_id: str
    control_id: str
    status: str  # "pass", "warning", or "missing"


class EvaluationInput(BaseModel):
    component_controls: List[ControlStatus]


SEVERITY_DOWNGRADE = {
    "critical": "high",
    "high": "medium",
    "medium": "low",
    "low": "low"
}

# Chunk 4: numeric weights used to calculate an overall risk score (0-100)
SEVERITY_WEIGHT = {
    "critical": 10,
    "high": 6,
    "medium": 3,
    "low": 1
}


def get_component_name(component_id, components):
    for c in components:
        if c["id"] == component_id:
            return c["name"]
    return component_id


def get_control_info(component_id, control_id, controls_catalog):
    controls_for_component = controls_catalog.get(component_id, [])
    for control in controls_for_component:
        if control["id"] == control_id:
            return control
    return None


def calculate_risk_score(findings):
    """
    Simple, transparent scoring: sum severity weights across all findings,
    then cap at 100. Not a statistical model — just an explainable total
    that lets a reviewer compare assessments over time.
    """
    if not findings:
        return {"score": 0, "level": "Minimal"}

    total = sum(SEVERITY_WEIGHT.get(f["severity"], 0) for f in findings)
    score = min(total, 100)

    if score >= 70:
        level = "Critical"
    elif score >= 45:
        level = "High"
    elif score >= 20:
        level = "Medium"
    elif score > 0:
        level = "Low"
    else:
        level = "Minimal"

    return {"score": score, "level": level}


@app.post("/evaluate")
def evaluate_controls(payload: EvaluationInput):
    """
    Takes a list of component/control/status entries and generates findings
    for anything marked "missing" or "warning", plus an overall risk score.
    """
    components = load_components()
    controls_catalog = load_controls_catalog()
    crosswalk = load_crosswalk()

    findings = []
    finding_counter = 1

    for entry in payload.component_controls:
        if entry.status not in ("missing", "warning"):
            continue

        control_info = get_control_info(entry.component_id, entry.control_id, controls_catalog)
        crosswalk_info = crosswalk.get(entry.control_id)

        if control_info is None or crosswalk_info is None:
            continue

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

    risk = calculate_risk_score(findings)

    return {
        "findings": findings,
        "total_findings": len(findings),
        "risk_score": risk["score"],
        "risk_level": risk["level"]
    }
# ---------- Chunk 9: JSON/CSV export ----------

from fastapi.responses import StreamingResponse
from fastapi import Query
import csv
import io
import json
from datetime import datetime


class FrameworkMapping(BaseModel):
    hipaa: str | None = None
    nist_800_53: List[str] | None = None
    owasp_llm_top10: str | None = None
    nist_ai_rmf: str | None = None
    mitre_attack: str | None = None
    mitre_atlas: str | None = None


class Finding(BaseModel):
    finding_id: str
    severity: str
    status: str
    component: str
    control_name: str
    description: str
    framework_mapping: FrameworkMapping


class ExportPayload(BaseModel):
    findings: List[Finding]
    total_findings: int
    risk_score: float
    risk_level: str


@app.post("/export")
def export_findings(payload: ExportPayload, format: str = Query("json", pattern="^(json|csv)$")):
    """
    Takes the findings data the frontend already generated via /evaluate
    and returns it as a downloadable JSON or CSV file. This does not
    re-run detection or evaluation logic -- it only formats results
    that were already produced deterministically, so nothing new is
    invented at export time.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    if format == "json":
        json_bytes = json.dumps(payload.model_dump(), indent=2).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(json_bytes),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="findings-{timestamp}.json"'}
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Finding ID", "Severity", "Status", "Component", "Control Name",
        "Description", "HIPAA", "NIST 800-53", "OWASP LLM Top 10",
        "NIST AI RMF", "MITRE ATT&CK", "MITRE ATLAS"
    ])
    for f in payload.findings:
        fm = f.framework_mapping
        writer.writerow([
            f.finding_id, f.severity, f.status, f.component, f.control_name,
            f.description, fm.hipaa or "", ", ".join(fm.nist_800_53) if fm.nist_800_53 else "",
            fm.owasp_llm_top10 or "", fm.nist_ai_rmf or "",
            fm.mitre_attack or "", fm.mitre_atlas or ""
        ])
    writer.writerow([])
    writer.writerow(["Total Findings", payload.total_findings])
    writer.writerow(["Risk Score", payload.risk_score])
    writer.writerow(["Risk Level", payload.risk_level])

    csv_bytes = output.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="findings-{timestamp}.csv"'}
    )