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
| PostgreSQL (external access) | `localhost:5432` |

**Default admin:** `admin` / `admin123`

### 4. Connect an Ignition Gateway

SignalForge ingests alarms via Ignition's **alarm journal** — Ignition writes alarm state transitions (Active, Clear, Ack) directly to SignalForge's PostgreSQL database. No API keys or REST API configuration required.

1. In SignalForge, go to **Admin > Connectors** and create a new Ignition connector
2. The setup wizard walks you through 4 steps:
   - **Step 1 — Connector Details**: Name, host (for reference), polling interval
   - **Step 2 — Alarm Journal Setup**: Provides pre-filled JDBC connection details to configure in Ignition's gateway. A "Check for Data" button polls until alarm events appear.
   - **Step 3 — Test & Preview**: Shows sample alarm events from the journal with raw + canonical side-by-side view
   - **Step 4 — Transform & Export**: Links to the Transform page to configure field mappings and enable export to Loki
3. In the Ignition Gateway:
   - Add a PostgreSQL database connection using the JDBC URL shown in Step 2
   - Create an alarm journal profile pointing to that connection
4. Once alarms are journaled, SignalForge automatically ingests, normalizes, pushes to Loki, and cleans up processed events

> **Tip:** Load one of Ignition's sample projects (e.g. the **Oil & Gas** demo) to get a set of preconfigured tags with alarm definitions for testing.

## Stack

| Service | Technology | Purpose |
|---------|-----------|---------|
| `nginx` | nginx 1.27 | Reverse proxy — `/api/*` → backend, `/` → frontend |
| `frontend` | React 18 + Vite + D3.js | Admin and operator portals |
| `backend` | FastAPI + SQLAlchemy | REST API + auth + connector management |
| `signal-service` | Python + APScheduler | Alarm ingestion engine + ISA-18.2 analysis jobs |
| `postgres` | PostgreSQL 16 | Connector configs, alarm journal staging, user accounts |
| `loki` | Grafana Loki | Log storage engine for normalized alarm/event data |
| `grafana` | Grafana (main-ubuntu) | Dashboarding and alarm analysis (auto-provisioned Loki datasource) |

## Architecture

```
                              ┌──────────────┐
                              │   Ignition    │
                              │   Gateway     │
                              └──────┬───────┘
                                     │ JDBC (alarm journal)
                                     ▼
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  nginx   │───▶│   frontend   │    │   postgres   │    │   Grafana    │
│  :80     │    │   :3000      │    │   :5432      │    │   :3001      │
│          │───▶│              │    │              │    │              │
│          │    └──────────────┘    └──────┬───────┘    └──────┬───────┘
│          │───▶┌──────────────┐          │                   │
│          │    │   backend    │◀─────────┤                   │
└─────────┘    │   :8000      │          │                   │
               └──────────────┘          │                   │
                                  ┌──────▼───────┐    ┌──────▼───────┐
                                  │ signal-svc   │───▶│    loki      │
                                  │ (APScheduler)│    │    :3100     │
                                  └──────────────┘    └──────────────┘
```

**Data flow:** Ignition alarm journal → PostgreSQL staging tables → signal-service normalizer → Loki push API → queryable via backend API, dashboard, or Grafana.

**Ingestion cycle** (every 30s by default):
1. Query `alarm_events` + `alarm_event_data` tables for new journal entries
2. Normalize each event to the canonical schema (severity, area, equipment, event type)
3. Push normalized events to Loki with structured labels
4. Delete processed rows from the staging tables

## Frontend Features

### Dashboard

The home page visualises the full signal pipeline as a live status board with 15-second auto-refresh:

- **Pipeline flow diagram** — six stage boxes (SCADA Sources → Signal Service → Loki → Grafana + PostgreSQL + Backend API) with live health indicators:
  - SCADA Sources: red if no connectors configured or none enabled
  - Signal Service: red if no connectors have export enabled
  - Loki, PostgreSQL, Grafana: real health checks against each service
- **Infrastructure stats** — PostgreSQL journal queue depth and table size for monitoring staging table growth
- **Alarm rate chart** — D3.js area chart showing hourly alarm ingest over the last 24 hours, sourced from Loki metric queries
- **Severity donut** — D3.js donut chart breaking alarm volume down by critical / high / medium / low with a centre-total callout
- **Stat strip** — quick-glance totals for alarms in the last hour and last 24 hours, active connector count, and overall system health

### Connector Setup Wizard

`/admin/connectors/{id}` provides a 4-step guided setup:

- **Step 1 — Connector Details**: Name, host, port, polling interval, enabled toggle
- **Step 2 — Alarm Journal Database Setup**: Pre-filled JDBC URL, credentials, and table names to copy into Ignition's gateway configuration. "Check for Data" button auto-polls every 5 seconds until events appear.
- **Step 3 — Test & Preview**: Fetches sample journal events and shows raw vendor data alongside normalized canonical output
- **Step 4 — Transform & Export**: Links to the Transform page with current export status

### Alarm Transformation

`/alarms/transform` lets you configure the per-connector field mapping before alarms are written to Loki:

- **Vendor raw data table** — columns from the actual SCADA journal records; mapped columns are highlighted blue with their canonical target name shown below the header
- **Mapping editor** — grouped by Core / Labels / Metadata; each canonical field has a dropdown listing every available raw field from the vendor's schema
- **Live canonical preview** — runs entirely client-side via `useMemo` so the preview updates instantly as you change mappings, no server round-trip needed
- **Export toggle** — enables/disables the Loki push for each connector independently
- **Save / Reset** — persists the mapping to `connector.label_mappings`; dirty-state tracking prevents accidental loss of unsaved changes

## Alarm Journal Integration

SignalForge receives alarm events via Ignition's native **alarm journal** feature. Ignition writes alarm state transitions directly to two PostgreSQL staging tables:

**`alarm_events`** — one row per state transition:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Row ID |
| `eventid` | VARCHAR(255) | Groups related transitions (Active+Clear+Ack share same eventid) |
| `source` | TEXT | Tag path |
| `displaypath` | TEXT | Human-readable alarm path |
| `priority` | INTEGER | 0=Diagnostic, 1=Low, 2=Medium, 3=High, 4=Critical |
| `eventtime` | TIMESTAMPTZ | Event timestamp |
| `eventtype` | INTEGER | 0=Active, 1=Clear, 2=Ack |
| `eventflags` | INTEGER | Bitmask flags |

**`alarm_event_data`** — key/value properties per event:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER FK | References alarm_events.id |
| `propname` | VARCHAR(255) | Property name (e.g. "name", "ackUser", "eventValue") |
| `dtype` | INTEGER | 0=Int, 1=Float, 2=String |
| `intvalue` / `floatvalue` / `strvalue` | Various | Property value |

After each ingestion cycle, successfully processed events are deleted from these staging tables to prevent unbounded growth.

## Connector Plugin Architecture

SignalForge uses an abstract base class that all vendor connectors implement:

```python
class BaseConnector(ABC):
    async def connect(self) -> bool
    async def disconnect(self) -> None
    async def fetch_alarms(self) -> list[dict]
    async def cleanup_processed(self, event_ids: list[int]) -> int
    async def health_check(self) -> dict
```

| Connector | Vendor | Status |
|-----------|--------|--------|
| `ignition` | Inductive Automation Ignition | **Live** — PostgreSQL alarm journal integration |
| `factorytalk` | Rockwell Automation FactoryTalk | Phase 5 |
| `wincc` | Siemens WinCC | Phase 5 |
| `plant_scada` | AVEVA Plant SCADA (Citect) | Phase 5 |

To add a new connector, subclass `BaseConnector` in `signal-service/connectors/` and implement the required methods.

## Canonical Alarm Schema

Every alarm event is normalized to this structure before being pushed to Loki:

```json
{
  "timestamp": "2026-02-27T08:15:00+00:00",
  "labels": {
    "source": "ignition-plant-a",
    "severity": "high",
    "area": "Compressor Section",
    "equipment": "Compressor_01",
    "alarm_type": "High Pressure",
    "connector_id": "conn-001",
    "isa_priority": "high",
    "event_type": "active",
    "job": "signalforge"
  },
  "message": "Compressor Section/Compressor_01 High Pressure",
  "metadata": {
    "value": 462.5,
    "threshold": 450.0,
    "unit": "psi",
    "state": "ACTIVE",
    "priority": 3,
    "vendor_alarm_id": "evt-a1b2c3",
    "event_id": "evt-a1b2c3",
    "ack_user": "",
    "ack_required": true,
    "shelved": false
  }
}
```

Labels become Loki stream selectors, enabling queries like:

```logql
{job="signalforge", severity="critical", event_type="active"}
{job="signalforge", event_type="ack"} | json | ack_user != ""
```

## ISA-18.2 Alarm Performance Analysis

The built-in analysis engine calculates key ISA-18.2 performance indicators from alarm history stored in Loki:

| KPI | ISA-18.2 Benchmark | Description |
|-----|-------------------|-------------|
| Alarm rate | <=6/operator/hour manageable, >12 overloaded | Average alarms per operator per hour |
| Alarm floods | >10 alarms in 10 minutes | Periods of excessive alarm rate |
| Chattering alarms | >5 transitions in 1 hour | Alarms oscillating between ACTIVE and CLEAR |
| Stale alarms | Active >24 hours | Alarms stuck in ACTIVE state without resolution |
| Priority distribution | ~80% low, ~15% medium, ~5% high | Actual vs recommended priority distribution |
| Bad actors | Top N by frequency | Most frequently alarming points for rationalization |

Analysis runs on a configurable schedule via APScheduler (default: every 60 minutes).

## API Reference

All endpoints are prefixed with `/api`. Full Swagger documentation is available at `/docs` when the backend is running.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/token` | Login (OAuth2 password flow) -> Bearer token |
| `GET` | `/api/auth/me` | Get current user profile |

### Connectors (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/connectors` | List all connectors |
| `POST` | `/api/connectors` | Create a connector |
| `GET` | `/api/connectors/{id}` | Get connector details |
| `PATCH` | `/api/connectors/{id}` | Update connector config |
| `DELETE` | `/api/connectors/{id}` | Delete a connector |
| `POST` | `/api/connectors/{id}/test` | Test journal data + show normalized preview |
| `GET` | `/api/connectors/journal/status` | Check alarm journal staging table for data |
| `GET` | `/api/connectors/{id}/transform` | Get field mapping config and sample preview |
| `PATCH` | `/api/connectors/{id}/transform` | Save field mapping to connector |
| `PATCH` | `/api/connectors/{id}/transform/export` | Toggle Loki export on/off |

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

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/metrics/overview` | Hourly alarm rate (24h), severity breakdown, connector + export stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System health (database, Loki, Grafana, journal table stats) |

## Configuration

All configuration is via environment variables. See `.env.example` for the full list:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `signalforge` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `signalforge_dev` | PostgreSQL password |
| `POSTGRES_DB` | `signalforge` | PostgreSQL database name |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ADMIN_USERNAME` | `admin` | Default admin username |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `LOKI_URL` | `http://loki:3100` | Loki endpoint |
| `INGESTION_INTERVAL_SECONDS` | `30` | Alarm journal polling interval |
| `ISA182_ANALYSIS_INTERVAL_MINUTES` | `60` | ISA-18.2 analysis job interval |
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
│   │   │   ├── connectors.py              # Connector CRUD + journal data endpoints
│   │   │   ├── transform.py               # Field mapping config + export toggle
│   │   │   ├── alarms.py                   # Loki alarm queries
│   │   │   ├── metrics.py                  # Dashboard metrics (alarm rate, severity, export stats)
│   │   │   └── health.py                   # Health checks (DB, Loki, Grafana, journal stats)
│   │   ├── core/
│   │   │   ├── config.py                   # Pydantic settings
│   │   │   ├── security.py                 # JWT + bcrypt
│   │   │   ├── database.py                 # SQLAlchemy async
│   │   │   └── loki.py                     # Loki HTTP client (push + query)
│   │   ├── models/                         # SQLAlchemy ORM models
│   │   └── schemas/                        # Pydantic request/response schemas
│   └── migrations/
│       └── versions/
│           ├── 001_initial_schema.py
│           ├── 002_rename_email_to_username.py
│           └── 003_alarm_journal_tables.py  # alarm_events + alarm_event_data staging
├── signal-service/
│   ├── Dockerfile
│   ├── main.py                             # APScheduler entry point
│   ├── config.py
│   ├── db.py                               # Async SQLAlchemy session factory
│   ├── models.py                           # Minimal ORM models (shared table schema)
│   ├── connectors/
│   │   ├── base.py                         # Abstract base connector
│   │   ├── ignition.py                     # Ignition journal connector (Postgres queries)
│   │   ├── factorytalk.py                  # FactoryTalk stub
│   │   ├── wincc.py                        # WinCC stub
│   │   └── plant_scada.py                  # Plant SCADA stub
│   ├── normalizer/
│   │   ├── schema.py                       # Canonical alarm event schema
│   │   └── transform.py                    # Journal event → canonical mapping
│   ├── scheduler/
│   │   ├── ingestion.py                    # Alarm ingestion + Loki push + cleanup
│   │   └── isa182_analysis.py              # ISA-18.2 KPI job
│   └── analyzers/
│       ├── isa182.py                       # ISA-18.2 KPI engine
│       ├── chattering.py                   # Chattering detection
│       ├── stale.py                        # Stale alarm detection
│       ├── flooding.py                     # Flood detection
│       └── distribution.py                # Priority distribution analysis
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                         # Routes + protected route wrapper
│       ├── lib/api.ts                      # Axios client + JWT interceptor
│       ├── hooks/useAuth.ts                # Auth state management
│       ├── components/
│       │   ├── Layout.tsx                  # Sidebar navigation layout
│       │   └── charts/
│       │       ├── AlarmRateChart.tsx      # D3 area chart (24h alarm rate)
│       │       └── SeverityDonut.tsx       # D3 donut chart (severity breakdown)
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx               # Live pipeline status + D3 charts (15s refresh)
│           ├── AlarmTransform.tsx          # Field mapping editor + live preview
│           └── admin/
│               ├── Connectors.tsx          # Connector list + platform picker creation
│               ├── ConnectorDetail.tsx     # 4-step setup wizard
│               ├── Users.tsx               # User management
│               └── Settings.tsx            # System health dashboard
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── loki.yml                    # Auto-provisioned Loki datasource
└── loki/
    └── loki-config.yml                     # Local filesystem storage config
```

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Docker Compose stack, backend API with auth & connector CRUD, frontend admin portal, Loki + Grafana, D3 dashboard, alarm transformation UI | **Complete** |
| **Phase 2** | Ignition connector (REST API), API key auth, alarm ingestion pipeline, platform picker UI, scrollable test results with filters | **Complete** |
| **Phase 3** | Alarm journal ingestion via PostgreSQL, 4-step setup wizard, live pipeline health monitoring, auto-refresh dashboard, export toggle, staging table cleanup | **Complete** |
| **Phase 4** | Operator UI — alarm dashboard, explorer (LogQL search), timeline visualization | Planned |
| **Phase 5** | ISA-18.2 analysis engine — chattering, stale, flooding, distribution KPIs, compliance scorecard | Planned |
| **Phase 6** | FactoryTalk, WinCC, and Plant SCADA connectors | Planned |

## License

Apache 2.0 — see [LICENSE](LICENSE)
