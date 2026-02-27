# Connector Setup

## Overview

SignalForge uses a plugin architecture to connect to different SCADA platforms. Each vendor connector implements the `BaseConnector` abstract class, providing a consistent interface for alarm ingestion regardless of the underlying SCADA system.

## Supported Platforms

| Connector | Vendor | Method | Status |
|-----------|--------|--------|--------|
| `ignition` | Inductive Automation Ignition | PostgreSQL alarm journal (JDBC) | **Live** |
| `factorytalk` | Rockwell Automation FactoryTalk | — | Planned |
| `wincc` | Siemens WinCC | — | Planned |
| `plant_scada` | AVEVA Plant SCADA (Citect) | — | Planned |

## Connecting Ignition

SignalForge ingests alarms via Ignition's native **alarm journal** feature. Ignition writes alarm state transitions (Active, Clear, Ack) directly to SignalForge's PostgreSQL database over JDBC. No API keys, no REST API configuration, no polling — Ignition pushes data directly.

### Step-by-Step Setup

#### 1. Create a Connector in SignalForge

1. Navigate to **Admin > Connectors**
2. Click **New Connector**
3. Select **Ignition** from the platform picker
4. Enter a name (e.g., "Plant A Ignition Gateway")
5. You'll be taken to the 4-step setup wizard

#### 2. Configure Alarm Journal (Step 2 of Wizard)

The wizard provides pre-filled connection details to configure in Ignition:

- **JDBC URL**: `jdbc:postgresql://<signalforge-host>:5432/signalforge`
- **Username**: Your PostgreSQL username (from `.env`)
- **Password**: Your PostgreSQL password (from `.env`)
- **Table prefix**: `alarm` (creates `alarm_events` and `alarm_event_data`)

Copy these details into your Ignition Gateway:

1. Open the Ignition Gateway web interface
2. Go to **Config > Databases > Connections**
3. Add a new **PostgreSQL** connection using the JDBC URL above
4. Go to **Config > Alarming > Journal Profiles**
5. Create a new journal profile pointing to the SignalForge database connection
6. Assign the journal profile to your alarm sources (tags, UDTs, etc.)

#### 3. Verify Data Flow (Step 2 of Wizard)

Click the **"Check for Data"** button in the wizard. It polls the journal staging tables every 5 seconds until alarm events appear. Once data is detected, you can proceed to the next step.

> **Tip:** Trigger a test alarm in Ignition (e.g., force a tag value past its alarm setpoint) to verify the journal is writing correctly.

#### 4. Test & Preview (Step 3 of Wizard)

This step fetches sample alarm events from the journal and displays them in two views:

- **Raw vendor data** — the exact columns and values written by Ignition
- **Normalized canonical output** — how SignalForge will represent the alarm after transformation

Review the normalization to ensure severity, area, equipment, and event type are mapped correctly.

#### 5. Transform & Export (Step 4 of Wizard)

This step links to the [Alarm Transformation](Alarm-Normalization.md) page where you can:

- Customize field mappings (which vendor fields map to which canonical fields)
- Enable the Loki export toggle to start pushing alarms to Loki
- Preview the canonical output in real-time as you adjust mappings

### Ignition Journal Tables

Ignition writes to two PostgreSQL tables:

**`alarm_events`** — one row per alarm state transition:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing row ID |
| `eventid` | VARCHAR(255) | Groups related transitions — Active, Clear, and Ack events for the same alarm occurrence share the same eventid |
| `source` | TEXT | Full tag path in Ignition (e.g., `prov:default:/tag:Tanks/TK-101/Level`) |
| `displaypath` | TEXT | Human-readable alarm path (e.g., `Compressor Section/Compressor_01`) |
| `priority` | INTEGER | Ignition priority: 0=Diagnostic, 1=Low, 2=Medium, 3=High, 4=Critical |
| `eventtime` | TIMESTAMPTZ | Timestamp of the state transition |
| `eventtype` | INTEGER | 0=Active (alarm triggered), 1=Clear (alarm returned to normal), 2=Ack (operator acknowledged) |
| `eventflags` | INTEGER | Bitmask flags (Ignition-specific) |

**`alarm_event_data`** — key/value properties attached to each event:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER FK | References `alarm_events.id` |
| `propname` | VARCHAR(255) | Property name: `name`, `ackUser`, `eventValue`, `setpointA`, etc. |
| `dtype` | INTEGER | Data type: 0=Integer, 1=Float, 2=String |
| `intvalue` | INTEGER | Value if dtype=0 |
| `floatvalue` | FLOAT | Value if dtype=1 |
| `strvalue` | VARCHAR | Value if dtype=2 |

### Staging Table Lifecycle

1. **Ignition writes** alarm events to the staging tables via JDBC
2. **Signal-service reads** new events every 30 seconds (configurable)
3. **Normalization** converts raw events to canonical schema
4. **Loki push** sends normalized events to Loki (if export enabled)
5. **Cleanup** deletes processed rows from the staging tables

This cycle prevents unbounded table growth. The Dashboard's PostgreSQL panel shows the current queue depth and table size for monitoring.

### Ignition Tips

- Load one of Ignition's **sample projects** (e.g., the Oil & Gas demo) to get preconfigured tags with alarm definitions for testing
- Multiple Ignition gateways can write to the same SignalForge database — each gets its own connector for independent field mapping and export control
- The journal tables are created by Alembic migration `003_alarm_journal_tables.py` — they exist in the database before Ignition connects

## Connector Plugin Architecture

All connectors implement the `BaseConnector` abstract class:

```python
class BaseConnector(ABC):
    def __init__(self, config: dict):
        self.host = config.get("host", "localhost")
        self.port = config.get("port")
        self.credentials = config.get("credentials", {})
        self.connection_params = config.get("connection_params", {})

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the SCADA system."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection."""

    @abstractmethod
    async def fetch_alarms(self, since: str | None = None) -> list[dict]:
        """Fetch alarm events since the given timestamp."""

    @abstractmethod
    async def health_check(self) -> dict:
        """Return health status of the connector."""
```

### Adding a New Connector

To add support for a new SCADA platform:

1. Create a new file in `signal-service/connectors/` (e.g., `myvendor.py`)
2. Subclass `BaseConnector` and implement all abstract methods
3. Add the connector type to the platform list in:
   - `backend/app/api/connectors.py` (type validation)
   - `backend/app/api/transform.py` (sample data and default mappings)
   - `frontend/src/pages/admin/Connectors.tsx` (platform picker UI)
4. Add normalization logic in `signal-service/normalizer/transform.py`
5. Register the connector class in `signal-service/scheduler/ingestion.py`

See the [Development Guide](Development-Guide.md) for more detail on extending SignalForge.
