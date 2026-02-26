# SignalForge

Treat your **SCADA alarms like logs**. SignalForge is a vendor-agnostic middleware that pipes OT alarm and event data into Loki and Grafana so you can search, filter, and analyze at scale — with built-in **ISA-18.2** alarm performance benchmarking.

Connect to Ignition, FactoryTalk, WinCC, or Plant SCADA, normalize every alarm into a canonical schema, and push it to Loki for modern observability. The ISA-18.2 analysis engine automatically detects chattering alarms, alarm floods, stale alarms, and priority distribution issues against industry benchmarks.

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2+
- Git

### 1. Clone and configure

```bash
git clone https://github.com/jkp-parker/SignalForge.git
cd SignalForge
cp .env.example .env
```

Edit `.env` — at minimum set `SECRET_KEY` and `POSTGRES_PASSWORD`:

```bash
SECRET_KEY=$(openssl rand -hex 32)
```

### 2. Start the stack

```bash
docker compose up -d
```

Database migrations run automatically on first start. The stack is ready in ~60 seconds.

### 3. Open the app

| Service | URL |
|---------|-----|
| App (Admin / Operator portal) | http://localhost |
| API docs (Swagger) | http://localhost/docs |
| Loki API | http://localhost:3100 |
| Grafana | http://localhost:3001 |

**Default admin:** `admin@signalforge.local` / `admin123`

### 4. Load sample data (optional)

```bash
docker compose exec backend python /app/scripts/seed_sample_data.py
```

This seeds a sample operator account and two example connector configurations (Ignition and FactoryTalk) so the admin UI populates immediately.

## Stack

| Service | Technology | Purpose |
|---------|-----------|---------|
| `nginx` | nginx 1.27 | Reverse proxy — `/api/*` → backend, `/` → frontend |
| `frontend` | React 18 + Vite | Admin and operator portals |
| `backend` | FastAPI + SQLAlchemy | REST API + auth + connector management |
| `signal-service` | Python + APScheduler | Alarm ingestion engine + ISA-18.2 analysis jobs |
| `postgres` | PostgreSQL 16 | Connector configs, alarm metadata, user accounts |
| `loki` | Grafana Loki | Log storage engine for normalized alarm/event data |
| `grafana` | Grafana (main-ubuntu) | Dashboarding and alarm analysis (auto-provisioned Loki datasource) |

## Architecture

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐
│  nginx   │───▶│   frontend   │    │   Grafana    │
│  :80     │    │   :3000      │    │   :3001      │
│          │───▶│              │    │              │
│          │    └──────────────┘    └──────┬───────┘
│          │───▶┌──────────────┐          │
│          │    │   backend    │          │
└─────────┘    │   :8000      │          │
               └──────┬───────┘          │
                      │                  │
               ┌──────▼───────┐   ┌──────▼───────┐
               │   postgres   │   │    loki      │
               │   :5432      │   │    :3100     │
               └──────▲───────┘   └──────▲───────┘
                      │                  │
               ┌──────┴──────────────────┴───────┐
               │        signal-service           │
               │   (APScheduler background jobs) │
               └─────────────────────────────────┘
```

**Data flow:** SCADA system → signal-service connector → normalizer → Loki push API → queryable via backend API or Grafana.

## Connector Plugin Architecture

SignalForge uses an abstract base class that all vendor connectors implement:

```python
class BaseConnector(ABC):
    async def connect(self) -> bool
    async def disconnect(self) -> None
    async def fetch_alarms(self, since: str | None = None) -> list[dict]
    async def health_check(self) -> dict
```

| Connector | Vendor | Status |
|-----------|--------|--------|
| `ignition` | Inductive Automation Ignition | Phase 2 |
| `factorytalk` | Rockwell Automation FactoryTalk | Phase 5 |
| `wincc` | Siemens WinCC | Phase 5 |
| `plant_scada` | AVEVA Plant SCADA (Citect) | Phase 5 |

To add a new connector, subclass `BaseConnector` in `signal-service/connectors/` and implement the four methods.

## Canonical Alarm Schema

Every alarm event is normalized to this structure before being pushed to Loki:

```json
{
  "timestamp": "2026-02-25T14:30:00Z",
  "labels": {
    "source": "ignition-plant-a",
    "severity": "critical",
    "area": "boiler-room",
    "equipment": "boiler-01",
    "alarm_type": "high_temperature",
    "connector_id": "conn-001",
    "isa_priority": "high"
  },
  "message": "Boiler 01 temperature exceeded 450°F threshold",
  "metadata": {
    "value": 462.5,
    "threshold": 450.0,
    "unit": "°F",
    "state": "ACTIVE",
    "priority": 1,
    "vendor_alarm_id": "ALM-2024-00451",
    "ack_required": true,
    "shelved": false
  }
}
```

Labels become Loki stream selectors, enabling queries like:

```logql
{severity="critical", area="boiler-room"} |= "temperature"
```

## ISA-18.2 Alarm Performance Analysis

The built-in analysis engine calculates key ISA-18.2 performance indicators from alarm history stored in Loki:

| KPI | ISA-18.2 Benchmark | Description |
|-----|-------------------|-------------|
| Alarm rate | ≤6/operator/hour manageable, >12 overloaded | Average alarms per operator per hour |
| Alarm floods | >10 alarms in 10 minutes | Periods of excessive alarm rate |
| Chattering alarms | >5 transitions in 1 hour | Alarms oscillating between ACTIVE and CLEAR |
| Stale alarms | Active >24 hours | Alarms stuck in ACTIVE state without resolution |
| Priority distribution | ~80% low, ~15% medium, ~5% high | Actual vs recommended priority distribution |
| Bad actors | Top N by frequency | Most frequently alarming points for rationalization |

Analysis runs on a configurable schedule via APScheduler (default: hourly summaries).

## API Reference

All endpoints are prefixed with `/api`. Full Swagger documentation is available at `/docs` when the backend is running.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/token` | Login (OAuth2 password flow) → Bearer token |
| `GET` | `/api/auth/me` | Get current user profile |

### Connectors (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/connectors` | List all connectors |
| `POST` | `/api/connectors` | Create a connector |
| `GET` | `/api/connectors/{id}` | Get connector details |
| `PATCH` | `/api/connectors/{id}` | Update connector config |
| `DELETE` | `/api/connectors/{id}` | Delete a connector |
| `POST` | `/api/connectors/{id}/test` | Test connector connection |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users/{id}` | Get user details |
| `PATCH` | `/api/users/{id}` | Update user |
| `DELETE` | `/api/users/{id}` | Delete user |

### Alarms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alarms` | Query alarms via LogQL (params: `query`, `limit`, `start`, `end`) |
| `GET` | `/api/alarms/labels` | Get available alarm label values |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System health (database + Loki status) |

## Configuration

All configuration is via environment variables. See `.env.example` for the full list:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `signalforge` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `signalforge_dev` | PostgreSQL password |
| `POSTGRES_DB` | `signalforge` | PostgreSQL database name |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ADMIN_EMAIL` | `admin@signalforge.local` | Default admin email |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `LOKI_URL` | `http://loki:3100` | Loki endpoint |
| `GF_SECURITY_ADMIN_USER` | `admin` | Grafana admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Grafana admin password |

## Project Structure

```
SignalForge/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf                          # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── start.sh                            # alembic upgrade head + uvicorn
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                         # FastAPI app + admin user creation
│   │   ├── api/
│   │   │   ├── router.py                   # Route aggregator
│   │   │   ├── auth.py                     # JWT authentication
│   │   │   ├── users.py                    # User CRUD
│   │   │   ├── connectors.py              # Connector CRUD
│   │   │   ├── alarms.py                  # Loki alarm queries
│   │   │   └── health.py                  # Health checks
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic settings
│   │   │   ├── security.py               # JWT + bcrypt
│   │   │   ├── database.py               # SQLAlchemy async
│   │   │   └── loki.py                   # Loki HTTP client
│   │   ├── models/                        # SQLAlchemy ORM models
│   │   └── schemas/                       # Pydantic request/response schemas
│   ├── migrations/
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   └── scripts/
│       └── seed_sample_data.py
├── signal-service/
│   ├── Dockerfile
│   ├── main.py                            # APScheduler entry point
│   ├── config.py
│   ├── connectors/
│   │   ├── base.py                        # Abstract base connector
│   │   ├── ignition.py                    # Ignition connector
│   │   ├── factorytalk.py                # FactoryTalk stub
│   │   ├── wincc.py                      # WinCC stub
│   │   └── plant_scada.py               # Plant SCADA stub
│   ├── normalizer/
│   │   ├── schema.py                     # Canonical alarm event schema
│   │   └── transform.py                  # Vendor → canonical mapping
│   ├── scheduler/
│   │   ├── ingestion.py                  # Alarm ingestion job
│   │   └── isa182_analysis.py            # ISA-18.2 KPI job
│   └── analyzers/
│       ├── isa182.py                     # ISA-18.2 KPI engine
│       ├── chattering.py                 # Chattering detection
│       ├── stale.py                      # Stale alarm detection
│       ├── flooding.py                   # Flood detection
│       └── distribution.py              # Priority distribution analysis
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                        # Routes + protected route wrapper
│       ├── lib/api.ts                     # Axios client + JWT interceptor
│       ├── hooks/useAuth.ts               # Auth state management
│       ├── components/
│       │   └── Layout.tsx                 # Sidebar navigation layout
│       └── pages/
│           ├── Login.tsx
│           └── admin/
│               ├── Connectors.tsx         # Connector list + create
│               ├── ConnectorDetail.tsx    # Edit, test, delete connector
│               ├── Users.tsx             # User management
│               └── Settings.tsx          # System health dashboard
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── loki.yml                  # Auto-provisioned Loki datasource
└── loki/
    └── loki-config.yml                   # Local filesystem storage config
```

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Docker Compose stack, backend API with auth & connector CRUD, frontend admin portal, Loki + Grafana | **Complete** |
| **Phase 2** | Ignition connector implementation, normalizer pipeline, end-to-end alarm flow | Planned |
| **Phase 3** | Operator UI — alarm dashboard, explorer (LogQL search), timeline visualization | Planned |
| **Phase 4** | ISA-18.2 analysis engine — chattering, stale, flooding, distribution KPIs, compliance scorecard | Planned |
| **Phase 5** | FactoryTalk, WinCC, and Plant SCADA connectors | Planned |

## License

Apache 2.0 — see [LICENSE](LICENSE)
