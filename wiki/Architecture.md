# Architecture

## Overview

SignalForge is a containerized microservices application deployed via Docker Compose. Seven services work together to ingest, normalize, store, and visualize SCADA alarm data.

## System Diagram

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

## Service Topology

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **nginx** | nginx 1.27 | 80 | Reverse proxy — routes `/api/*` to backend, `/` to frontend |
| **frontend** | React 18 + Vite + D3.js | 3000 | Admin and operator portals |
| **backend** | FastAPI + SQLAlchemy | 8000 | REST API, authentication, connector management |
| **signal-service** | Python + APScheduler | — | Alarm ingestion engine, ISA-18.2 analysis scheduler |
| **postgres** | PostgreSQL 16 | 5432 | Connector configs, alarm journal staging, user accounts |
| **loki** | Grafana Loki | 3100 | Log storage engine for normalized alarm data |
| **grafana** | Grafana OSS | 3001 | Dashboarding and alarm analysis (auto-provisioned Loki datasource) |

## Data Flow

The alarm data pipeline has four stages:

### 1. Journal Ingestion

The SCADA system (e.g., Ignition) writes alarm state transitions directly to PostgreSQL staging tables via JDBC. This is Ignition's native alarm journal feature — no API configuration required.

Two staging tables receive data:

- **`alarm_events`** — one row per alarm state transition (Active, Clear, Ack)
- **`alarm_event_data`** — key/value properties for each event (name, value, ackUser, etc.)

### 2. Normalization

The signal-service polls the staging tables on a configurable interval (default: 30 seconds). For each batch of events:

1. Raw events are fetched and joined with their properties
2. Each event is normalized to the **canonical alarm schema** — mapping vendor-specific fields to standardized labels (severity, area, equipment, event_type)
3. User-configured field mappings (set via the Transform UI) override default mappings

### 3. Loki Push

Normalized events are pushed to Loki as structured log entries. Each entry has:

- **Stream labels** (indexed, low cardinality): source, severity, area, equipment, alarm_type, connector_id, isa_priority, event_type, job
- **Log line**: JSON containing the alarm message and all metadata
- **Timestamp**: nanosecond-precision event time

### 4. Cleanup

After successful push to Loki, the processed rows are deleted from the PostgreSQL staging tables to prevent unbounded growth.

### 5. Query & Visualization

Alarm data in Loki is queryable through three paths:

- **SignalForge API** — `/api/alarms` endpoint executes LogQL queries
- **SignalForge Dashboard** — React frontend displays charts and metrics sourced from Loki
- **Grafana** — Direct LogQL queries against the auto-provisioned Loki datasource

## Ingestion Cycle Detail

The signal-service runs two recurring jobs via APScheduler:

| Job | Default Interval | Description |
|-----|-----------------|-------------|
| `run_ingestion_cycle` | 30 seconds | Poll journal tables, normalize, push to Loki, cleanup |
| `run_isa182_analysis` | 60 minutes | Calculate ISA-18.2 KPIs from Loki alarm history |

The ingestion cycle processes each enabled connector independently:

```
for each enabled connector:
    1. Instantiate vendor-specific connector class
    2. connect() — verify table access
    3. fetch_alarms() — query staging tables (max 1000 per cycle)
    4. Check label_mappings._export_enabled flag
    5. If export enabled:
       a. normalize each event → CanonicalAlarmEvent
       b. push to Loki via HTTP POST
    6. cleanup_processed(event_ids) — delete from staging tables
    7. Update connector status in database
    8. disconnect()
```

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | User identifier |
| `username` | VARCHAR (unique) | Login username |
| `hashed_password` | VARCHAR | bcrypt hash |
| `full_name` | VARCHAR | Display name |
| `role` | VARCHAR | `admin` or `operator` |
| `is_active` | BOOLEAN | Account enabled flag |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit timestamps |

### Connectors Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Connector identifier |
| `name` | VARCHAR | Display name |
| `connector_type` | VARCHAR | `ignition`, `factorytalk`, `wincc`, `plant_scada` |
| `host` / `port` | VARCHAR / INT | SCADA system address |
| `credentials` | JSON | Authentication details |
| `connection_params` | JSON | Vendor-specific connection settings |
| `polling_interval` | INT | Seconds between ingestion cycles |
| `label_mappings` | JSON | Field mapping config + `_export_enabled` flag |
| `enabled` | BOOLEAN | Whether the connector is active |
| `status` | VARCHAR | `connected`, `polling`, `error`, `disconnected` |
| `last_successful_pull` | TIMESTAMPTZ | Last successful ingestion timestamp |
| `error_message` | TEXT | Last error description |

### Alarm Journal Staging Tables

These tables are written to by the SCADA system and read/cleaned by signal-service:

**`alarm_events`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | Row identifier |
| `eventid` | VARCHAR(255) | Groups related transitions (Active+Clear+Ack share same eventid) |
| `source` | TEXT | Tag path in the control system |
| `displaypath` | TEXT | Human-readable alarm path |
| `priority` | INTEGER | 0=Diagnostic, 1=Low, 2=Medium, 3=High, 4=Critical |
| `eventtime` | TIMESTAMPTZ | Event timestamp |
| `eventtype` | INTEGER | 0=Active, 1=Clear, 2=Ack |
| `eventflags` | INTEGER | Bitmask flags |

**`alarm_event_data`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (FK) | References alarm_events.id |
| `propname` | VARCHAR(255) | Property name (e.g., `name`, `ackUser`, `eventValue`) |
| `dtype` | INTEGER | 0=Int, 1=Float, 2=String |
| `intvalue` / `floatvalue` / `strvalue` | Various | Property value by type |

## Authentication Flow

1. Client sends `POST /api/auth/token` with username + password (OAuth2 password flow)
2. Backend verifies credentials against bcrypt hash in PostgreSQL
3. Backend issues a JWT access token (HS256, 8-hour expiry)
4. Client includes `Authorization: Bearer <token>` on subsequent requests
5. Backend `get_current_user()` dependency decodes and validates the JWT per request
6. Admin-only endpoints use `get_current_admin()` which additionally checks `role == "admin"`

## Network Topology

All services communicate on an internal Docker network. Only nginx (port 80) is exposed externally by default:

- **External access**: Browser → nginx:80 → frontend:3000 or backend:8000
- **Internal only**: signal-service → postgres:5432, signal-service → loki:3100
- **Optional external**: postgres:5432 (for SCADA JDBC connections), grafana:3001 (for direct dashboard access)
