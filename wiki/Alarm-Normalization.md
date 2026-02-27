# Alarm Normalization

## Overview

SignalForge normalizes vendor-specific alarm data into a **canonical schema** before storing it in Loki. This ensures consistent querying, dashboarding, and analysis regardless of which SCADA system generated the alarm.

The normalization pipeline has three stages:

1. **Raw ingestion** — vendor-specific data is read from staging tables
2. **Field mapping** — user-configured mappings translate vendor fields to canonical fields
3. **Canonical output** — standardized alarm events are pushed to Loki

## Canonical Alarm Schema

Every alarm event is normalized to this structure:

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

### Labels (Loki Stream Selectors)

Labels are indexed by Loki and used for fast filtering. They must be low cardinality.

| Label | Description | Example |
|-------|-------------|---------|
| `source` | Connector name identifier | `ignition-plant-a` |
| `severity` | Alarm severity level | `low`, `medium`, `high`, `critical` |
| `area` | Process area or unit | `Compressor Section` |
| `equipment` | Specific equipment tag | `Compressor_01` |
| `alarm_type` | Alarm classification | `High Pressure` |
| `connector_id` | SignalForge connector UUID | `conn-001` |
| `isa_priority` | ISA-18.2 priority mapping | `low`, `medium`, `high` |
| `event_type` | Alarm state transition | `active`, `clear`, `ack` |
| `job` | Fixed label for Loki queries | `signalforge` |

### Metadata (Parsed at Query Time)

Metadata is stored in the JSON log line body and available for LogQL pattern matching.

| Field | Type | Description |
|-------|------|-------------|
| `value` | float | Process value at time of alarm |
| `threshold` | float | Alarm setpoint value |
| `unit` | string | Engineering unit |
| `state` | string | Alarm state: `ACTIVE`, `CLEAR`, `ACK` |
| `priority` | int | Raw vendor priority integer |
| `vendor_alarm_id` | string | Vendor's unique alarm identifier |
| `event_id` | string | Event identifier for lifecycle grouping |
| `ack_user` | string | Username of acknowledging operator |
| `ack_required` | bool | Whether acknowledgement is required |
| `shelved` | bool | Whether the alarm is shelved |

## LogQL Query Examples

Labels become Loki stream selectors, enabling powerful queries:

```logql
# All critical active alarms
{job="signalforge", severity="critical", event_type="active"}

# Acknowledged alarms with operator info
{job="signalforge", event_type="ack"} | json | ack_user != ""

# All alarms from a specific area
{job="signalforge", area="Compressor Section"}

# High priority alarms from a specific connector
{job="signalforge", isa_priority="high", connector_id="conn-001"}
```

## Field Mapping Configuration

### Default Mappings

SignalForge ships with default field mappings for each supported vendor. For Ignition:

| Canonical Field | Default Vendor Field | Category |
|----------------|---------------------|----------|
| `timestamp_field` | `eventtime` | Core |
| `message_field` | `displaypath` | Core |
| `severity_field` | `priority` | Core |
| `source_field` | `source` | Labels |
| `area_field` | `displaypath` | Labels |
| `equipment_field` | `source` | Labels |
| `alarm_type_field` | `name` | Labels |
| `event_type_field` | `eventtype` | Labels |
| `value_field` | `eventValue` | Metadata |
| `threshold_field` | `setpointA` | Metadata |
| `ack_user_field` | `ackUser` | Metadata |

### Customizing Mappings

Use the **Alarm Transformation** page (`/alarms/transform`) to customize which vendor fields map to which canonical fields:

1. Select a connector from the dropdown
2. The **Raw Data Table** shows actual vendor data with current mappings highlighted in blue
3. The **Mapping Editor** groups canonical fields by category (Core, Labels, Metadata)
4. Each canonical field has a dropdown listing every available raw field from the vendor's schema
5. The **Live Preview** updates instantly as you change mappings — no server round-trip needed
6. Click **Save** to persist the mapping to the connector's `label_mappings` configuration

### Export Toggle

Each connector has an independent export toggle that controls whether normalized alarms are pushed to Loki:

- **Export OFF** — alarms are ingested and cleaned from staging tables, but not pushed to Loki
- **Export ON** — alarms are ingested, normalized, pushed to Loki, then cleaned

This allows you to configure and test field mappings before enabling data flow to Loki.

## Normalization Pipeline Detail

### Ignition Event Normalization

The `normalize_ignition_alarm()` function in `signal-service/normalizer/transform.py` handles Ignition-specific logic:

1. **Timestamp parsing** — handles datetime objects, ISO strings, and epoch milliseconds
2. **Priority mapping** — converts Ignition integers (0-4) to severity strings:
   - 0 → `diagnostic`
   - 1 → `low`
   - 2 → `medium`
   - 3 → `high`
   - 4 → `critical`
3. **Event type mapping** — converts Ignition integers to state strings:
   - 0 → `active`
   - 1 → `clear`
   - 2 → `ack`
4. **Area extraction** — parses the first segment of `displaypath` (e.g., `Compressor Section/Compressor_01` → `Compressor Section`)
5. **Equipment extraction** — parses the tag name from `source` path
6. **Process value** — extracts `eventValue` as float for the metadata
7. **Message construction** — combines displaypath segments and alarm name

### Loki Push Format

The canonical event is converted to Loki's push format:

```json
{
  "streams": [{
    "stream": {
      "job": "signalforge",
      "source": "ignition-plant-a",
      "severity": "high",
      "area": "Compressor Section",
      "equipment": "Compressor_01",
      "alarm_type": "High Pressure",
      "connector_id": "conn-001",
      "isa_priority": "high",
      "event_type": "active"
    },
    "values": [
      ["1740643500000000000", "{\"message\": \"...\", \"metadata\": {...}}"]
    ]
  }]
}
```

The timestamp is converted to nanosecond precision for Loki's requirements.
