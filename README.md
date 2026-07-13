# Healthcare AI Architecture Reviewer

A full-stack tool that analyzes healthcare IT architecture descriptions and maps them against compliance and security frameworks — built as a hands-on portfolio project demonstrating GRC, ISSO, and cybersecurity compliance skills.

**Live app:** https://healthcare-ai-architecture-reviewer.vercel.app
**API:** https://healthcare-ai-architecture-reviewer.onrender.com

> ⚠️ The backend runs on Render's free tier, which spins down after inactivity. The first request after idle time may take 30–50 seconds to respond while the service wakes up.

---

## What It Does

You describe a healthcare IT architecture in plain text (e.g. "Epic EHR, Azure OpenAI, Azure Blob Storage, Microsoft Entra ID..."), and the app:

1. **Detects components** from the description using keyword-based matching against a fixed component library
2. **Maps each component to relevant controls** across six compliance and security frameworks
3. **Generates findings** with severity ratings (Critical / High / Medium / Low)
4. **Displays a dashboard** summarizing overall risk posture
5. **Exports results** to JSON or CSV for use in audit documentation or reporting

Detection is deterministic and rule-based — mappings come from a structured YAML knowledge base, not a language model, so results are consistent and explainable rather than probabilistic.

## Frameworks Covered

| Framework | Purpose |
|---|---|
| **HIPAA** | Healthcare data privacy and security requirements |
| **NIST 800-53** | Federal security and privacy controls |
| **OWASP LLM Top 10** | Security risks specific to LLM-integrated applications |
| **NIST AI RMF** | AI risk management practices |
| **MITRE ATT&CK** | Adversary tactics and techniques |
| **MITRE ATLAS** | Adversarial threats specific to AI/ML systems |

## Tech Stack

**Backend**
- FastAPI + Pydantic
- Python
- YAML-based knowledge base for control mappings
- Deployed on Render (Docker)

**Frontend**
- React + Vite
- Deployed on Vercel

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   React     │  HTTPS  │   FastAPI    │         │  YAML Knowledge │
│  Frontend   │────────▶│   Backend    │────────▶│      Base       │
│  (Vercel)   │◀────────│   (Render)   │◀────────│  (6 frameworks) │
└─────────────┘         └──────────────┘         └─────────────────┘
```

The frontend calls the backend via the `VITE_API_URL` environment variable, keeping the API endpoint configurable across local development and production without code changes.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/detect` | POST | Detects architecture components from a text description |
| `/evaluate` | POST | Evaluates detected components against control mappings |
| `/phi-scan` | POST | Scans for potential PHI-related risk indicators |
| `/controls` | GET | Returns the full control catalog |
| `/export` | GET | Exports findings as JSON or CSV |

Interactive API documentation is available at `/docs` on the backend (Swagger UI).

## Running Locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://127.0.0.1:8000` by default.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file inside `frontend/` with:
```
VITE_API_URL=http://127.0.0.1:8000
```

## Project Structure

```
healthcare-ai-architecture-reviewer/
├── backend/
│   ├── main.py
│   ├── knowledge_base/       # YAML control mappings
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── Dockerfile
│   └── .env                  # not tracked in git
├── docker-compose.yml
└── README.md
```

## Design Notes

- **Deterministic over generative:** Component detection and control mapping are rule-based against a fixed YAML library, not inferred by an LLM. This keeps results auditable and reproducible — important in a compliance context where "the AI guessed" isn't an acceptable answer.
- **Environment-based configuration:** The frontend never hardcodes the backend URL; it reads `VITE_API_URL` at build time, allowing the same codebase to run against local, staging, or production backends.
- **Containerized for portability:** Dockerfiles are included for both services, even though the deployed version runs on Render/Vercel rather than local Docker, to demonstrate the app can be containerized and self-hosted if needed.

## About This Project

Built as a portfolio piece to demonstrate practical application of compliance frameworks (HIPAA, NIST 800-53, NIST AI RMF) and AI/ML-specific security frameworks (OWASP LLM Top 10, MITRE ATLAS) to a realistic healthcare technology scenario — the kind of architecture review a GRC analyst or ISSO might be asked to perform when a healthcare organization proposes adopting new AI tooling.