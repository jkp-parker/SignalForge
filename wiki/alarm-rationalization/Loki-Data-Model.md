# Loki Data Model

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

This page defines the Loki data model used by SignalForge's alarm performance monitoring platform, including the label schema, structured metadata, ingest-time enrichment, and Grafana dashboard layout specification.

---

## Label Schema (Indexed, Low Cardinality)

Labels are indexed by Loki and must be low-cardinality to maintain query performance. The following labels shall be applied to every alarm log line:

| Label | Example | Description |
|-------|---------|-------------|
| `console` | `CONSOLE-01` | Operator console identifier (span of control) |
| `priority` | `low`, `medium`, `high`, `highest` | Alarm priority as assigned during rationalization |
| `alarm_class` | `safety`, `general`, `diagnostic` | Classification per alarm philosophy |
| `area` | `UNIT-100` | Process area or unit identifier |
| `state_change` | `UNACK`, `ACKED`, `RTNUN`, `NORM` | Type of alarm state transition being logged |

---

## Structured Metadata (Parsed at Query Time)

The following fields are included in the structured log line body or as Loki structured metadata. These are not indexed but are available for LogQL pattern matching and metric extraction:

| Field | Description | Example |
|-------|-------------|---------|
| `tag_name` | Unique tag identifier within the control system | `TK-101-LT-001` |
| `alarm_type` | Type classification | `absolute`, `deviation`, `rate-of-change`, `discrepancy` |
| `setpoint` | Alarm setpoint value at time of annunciation | `85.0` |
| `process_value` | Measured process variable at time of state change | `87.3` |
| `deadband` | Configured alarm deadband value | `2.0` |
| `alarm_message` | Configured alarm message text | `High Level` |
| `alarm_description` | Tag or alarm description text | `Tank 101 Level Transmitter` |

---

## Ingest-Time Enrichment Fields

The following fields are computed at ingest time by the transformation pipeline and attached to the log line. Computing these at ingest avoids expensive real-time correlation queries.

| Field | Description | Populated On |
|-------|-------------|-------------|
| `instance_id` | Unique identifier linking the complete lifecycle of a single alarm occurrence from UNACK through ACKED through RTNUN/NORM. Enables duration calculations across log lines. | All events |
| `time_to_ack` | Elapsed seconds between UNACK and ACKED events for the same alarm instance | ACKED log line |
| `time_to_rtn` | Elapsed seconds between UNACK and RTNUN/NORM events for the same alarm instance | RTNUN/NORM log line |
| `time_ack_to_rtn` | Elapsed seconds between ACKED and RTNUN/NORM. Indicates whether operator action was effective | RTNUN/NORM log line |
| `cascade_id` | Identifier grouping alarms that are part of the same detected alarm cascade event | Cascade members |
| `co_occurring_tags` | Comma-separated list of other tag_names with active alarms within a configurable window (default: 60 seconds) of this alarm annunciation | All events |
| `is_chattering` | Boolean flag set to `true` if this tag has exceeded the chattering threshold (>5 state transitions in 5 minutes) at the time of this event | All events |
| `is_fleeting` | Boolean flag set to `true` if the alarm duration was less than the fleeting threshold (e.g., <10 seconds) without rapid repetition | Short-duration events |
| `previous_state_duration` | Duration in seconds that the previous alarm state was held for this tag, enabling rapid-toggle detection | All events |

---

## Grafana Dashboard Layout

### Dashboard Hierarchy

The monitoring platform is organised as a hierarchy of Grafana dashboards:

| Level | Name | Purpose | Audience |
|-------|------|---------|----------|
| **Level 1** | Executive Scorecard | Composite RAG scorecard ([Section 7](Scorecard-and-Grading.md)) with single-stat panels for each metric | Management, auditors |
| **Level 2** | Operational Overview | Time-series panels for alarm rate, flood detection, and operator effectiveness | Alarm management personnel |
| **Level 3** | Detailed Analysis | Drill-down dashboards for top offenders, chattering/stale analysis, co-occurrence matrices, precursor tables, and operator load profiling | Engineers, analysts |
| **Level 4** | Investigation | Tag-level detail dashboards showing full alarm history, state transitions, and related alarms | Tag-level investigation |

### Refresh & Data Ranges

| Level | Refresh Interval | Default View |
|-------|-----------------|--------------|
| Level 1 | 5 minutes | 30 days |
| Level 2 | 1 minute | 24 hours |
| Level 3 | 5 minutes | 7 days |
| Level 4 | On demand | Configurable |

All dashboards support Grafana time range picker for ad-hoc analysis.

### Variables & Filters

All dashboards include Grafana template variables for:

| Variable | Description |
|----------|-------------|
| **Console** | Filter by operator console |
| **Process Area** | Filter by process area or unit |
| **Priority** | Filter by alarm priority |
| **Alarm Class** | Filter by alarm classification |
| **Shift** | Filter by shift period (if shift data is available) |
