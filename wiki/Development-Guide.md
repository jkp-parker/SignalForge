# Development Guide

## Project Structure

```
SignalForge/
├── docker-compose.yml                      # Service orchestration
├── .env.example                            # Environment variable template
├── nginx/
│   └── nginx.conf                          # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── start.sh                            # alembic upgrade head + uvicorn
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                         # FastAPI app + admin user seeding
│   │   ├── api/
│   │   │   ├── router.py                   # Route aggregator
│   │   │   ├── auth.py                     # JWT authentication
│   │   │   ├── users.py                    # User CRUD
│   │   │   ├── connectors.py              # Connector CRUD + journal endpoints
│   │   │   ├── transform.py               # Field mapping + export toggle
│   │   │   ├── alarms.py                   # Loki alarm queries
│   │   │   ├── metrics.py                  # Dashboard metrics
│   │   │   └── health.py                   # Multi-service health checks
│   │   ├── core/
│   │   │   ├── config.py                   # Pydantic settings
│   │   │   ├── security.py                 # JWT + bcrypt
│   │   │   ├── database.py                 # SQLAlchemy async engine
│   │   │   └── loki.py                     # Loki HTTP client
│   │   ├── models/                         # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   └── connector.py
│   │   └── schemas/                        # Pydantic request/response schemas
│   │       ├── auth.py
│   │       ├── user.py
│   │       └── connector.py
│   └── migrations/
│       └── versions/
│           ├── 001_initial_schema.py
│           ├── 002_rename_email_to_username.py
│           └── 003_alarm_journal_tables.py
├── signal-service/
│   ├── Dockerfile
│   ├── main.py                             # APScheduler entry point
│   ├── config.py                           # Service settings
│   ├── db.py                               # Async session factory
│   ├── models.py                           # Read-only connector model
│   ├── connectors/
│   │   ├── base.py                         # Abstract base connector
│   │   ├── ignition.py                     # Ignition journal connector
│   │   ├── factorytalk.py                  # Stub
│   │   ├── wincc.py                        # Stub
│   │   └── plant_scada.py                  # Stub
│   ├── normalizer/
│   │   ├── schema.py                       # Canonical alarm event models
│   │   └── transform.py                    # Vendor → canonical mapping
│   ├── scheduler/
│   │   ├── ingestion.py                    # Alarm ingestion pipeline
│   │   └── isa182_analysis.py              # ISA-18.2 analysis job
│   └── analyzers/
│       ├── isa182.py                       # ISA-18.2 KPI engine
│       ├── chattering.py                   # Chattering detection
│       ├── stale.py                        # Stale alarm detection
│       ├── flooding.py                     # Flood detection
│       └── distribution.py                # Priority distribution
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                         # Routes + auth wrapper
│       ├── lib/api.ts                      # Axios + JWT interceptor
│       ├── hooks/useAuth.ts                # Auth state hook
│       ├── components/
│       │   ├── Layout.tsx                  # Sidebar layout
│       │   └── charts/
│       │       ├── AlarmRateChart.tsx      # D3 area chart
│       │       └── SeverityDonut.tsx       # D3 donut chart
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx               # Pipeline status + charts
│           ├── AlarmTransform.tsx          # Field mapping editor
│           └── admin/
│               ├── Connectors.tsx          # Connector list
│               ├── ConnectorDetail.tsx     # Setup wizard
│               ├── Users.tsx               # User management
│               └── Settings.tsx            # System health
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── loki.yml                    # Auto-provisioned datasource
├── loki/
│   └── loki-config.yml                     # Storage config
└── wiki/                                   # This documentation
```

## Key Design Decisions

### Alarm Journal vs REST API

SignalForge uses Ignition's native **alarm journal** feature rather than polling a REST API. This provides:

- **No API configuration** required on the Ignition side — just configure a database connection
- **No missed events** — Ignition writes every state transition; REST polling can miss events between intervals
- **Native Ignition feature** — alarm journals are a first-class feature that Ignition users already understand
- **Batch processing** — staging tables accumulate events for efficient batch normalization

### Loki as the Alarm Store

Alarms are stored in Loki rather than PostgreSQL because:

- **LogQL** provides powerful query language purpose-built for log data
- **Label-based filtering** maps naturally to alarm attributes (severity, area, equipment)
- **Metric extraction** from log streams enables KPI calculation without a separate time-series database
- **Grafana integration** is native — no additional configuration needed
- **Horizontal scalability** — Loki scales to millions of log entries per day
- **Cost-effective storage** — compressed log chunks with index-only labels

### Canonical Schema

All vendor-specific data is normalized to a single canonical schema because:

- **Consistent querying** — same LogQL queries work regardless of SCADA vendor
- **Cross-vendor analysis** — ISA-18.2 KPIs are calculated from the canonical schema, enabling comparison across platforms
- **Extensibility** — new vendors only need to implement the normalization layer

## Adding a New Connector

### 1. Create the Connector Class

Create `signal-service/connectors/myvendor.py`:

```python
from connectors.base import BaseConnector

class MyVendorConnector(BaseConnector):
    async def connect(self) -> bool:
        # Establish connection to the SCADA system
        # Return True if successful
        pass

    async def disconnect(self) -> None:
        # Close connection
        pass

    async def fetch_alarms(self, since=None) -> list[dict]:
        # Fetch alarm events since timestamp
        # Return list of raw alarm dicts
        pass

    async def health_check(self) -> dict:
        # Return health status
        return {"status": "ok", "event_count": 0}
```

### 2. Add Normalization Logic

Add a normalization function to `signal-service/normalizer/transform.py`:

```python
def normalize_myvendor_alarm(raw_event: dict, connector_name: str, connector_id: str) -> CanonicalAlarmEvent:
    # Map vendor-specific fields to canonical schema
    pass
```

### 3. Register in the Ingestion Pipeline

Update `signal-service/scheduler/ingestion.py` to instantiate your connector:

```python
if connector.connector_type == "myvendor":
    conn = MyVendorConnector(config)
```

### 4. Add Backend Support

Update these files:
- `backend/app/api/connectors.py` — add `"myvendor"` to valid connector types
- `backend/app/api/transform.py` — add sample data and default field mappings

### 5. Add Frontend Support

Update `frontend/src/pages/admin/Connectors.tsx` to add the vendor to the platform picker.

### 6. Add Database Migration (if needed)

If your connector requires additional staging tables, create a new Alembic migration:

```bash
docker compose exec backend alembic revision --autogenerate -m "add_myvendor_tables"
```

## Database Migrations

Migrations are managed with **Alembic** and run automatically on backend startup via `start.sh`:

```bash
alembic upgrade head
```

Existing migrations:

| Version | Description |
|---------|-------------|
| `001` | Initial schema — users and connectors tables |
| `002` | Rename email to username on users table |
| `003` | Add alarm journal staging tables (alarm_events, alarm_event_data) |

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Docker stack, backend API, frontend admin portal, Loki + Grafana, D3 dashboard, alarm transformation UI | Complete |
| **Phase 2** | Ignition connector, API key auth, alarm ingestion pipeline, platform picker, test results UI | Complete |
| **Phase 3** | Alarm journal ingestion, 4-step setup wizard, live pipeline health, auto-refresh dashboard, export toggle, staging cleanup | Complete |
| **Phase 4** | Operator UI — alarm dashboard, explorer (LogQL search), timeline visualization | Planned |
| **Phase 5** | ISA-18.2 analysis engine — chattering, stale, flooding, distribution KPIs, compliance scorecard | Planned |
| **Phase 6** | FactoryTalk, WinCC, and Plant SCADA connectors | Planned |
