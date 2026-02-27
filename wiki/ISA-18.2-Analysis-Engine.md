# ISA-18.2 Analysis Engine

## Overview

SignalForge includes a built-in ISA-18.2 performance analysis engine that automatically calculates key performance indicators (KPIs) from alarm history stored in Loki. The engine runs on a configurable schedule via APScheduler and grades each metric against ISA-18.2-2016 benchmarks.

For the complete metrics specification and alarm rationalization philosophy, see [Alarm Rationalization Philosophy](Alarm-Rationalization-Philosophy.md).

## Architecture

The analysis engine lives in the `signal-service` and consists of:

```
signal-service/
├── analyzers/
│   ├── isa182.py          # Main ISA-18.2 KPI engine with thresholds
│   ├── chattering.py      # Chattering alarm detection
│   ├── stale.py           # Stale alarm detection
│   ├── flooding.py        # Flood detection
│   └── distribution.py    # Priority distribution analysis
└── scheduler/
    └── isa182_analysis.py # APScheduler job entry point
```

## Scheduling

The ISA-18.2 analysis job runs on a configurable interval (default: every 60 minutes):

```python
# signal-service/main.py
scheduler.add_job(
    run_isa182_analysis,
    'interval',
    minutes=config.ISA182_ANALYSIS_INTERVAL_MINUTES
)
```

Configure the interval via environment variable:

```
ISA182_ANALYSIS_INTERVAL_MINUTES=60
```

## KPI Thresholds

The `ISA182Analyzer` class defines ISA-18.2 benchmark thresholds:

| Constant | Value | ISA-18.2 Reference |
|----------|-------|--------------------|
| `ALARM_RATE_MANAGEABLE` | 6 alarms/operator/hour | Table 5 — very likely acceptable |
| `ALARM_RATE_OVERLOADED` | 12 alarms/operator/hour | Table 5 — maximum manageable |
| `FLOOD_THRESHOLD` | 10 alarms in 10 minutes | Section 16.4.4 |
| `CHATTERING_THRESHOLD` | 5 transitions in 1 hour | Section 16.4.6 |
| `STALE_THRESHOLD` | 24 hours active | Section 16.4.7 |
| `PRIORITY_TARGET_LOW` | 80% | Table 6 |
| `PRIORITY_TARGET_MEDIUM` | 15% | Table 6 |
| `PRIORITY_TARGET_HIGH` | 5% | Table 6 |

## Analysis Functions

### Alarm Rate Calculation

Calculates the average annunciated alarm rate per operator per hour over a configurable time window.

**Data source:** Loki metric query counting `{job="signalforge", event_type="active"}` events per hour.

**Grading:**

| Grade | Criteria |
|-------|----------|
| GREEN | ≤ 6 alarms/hr |
| AMBER | 6 – 12 alarms/hr |
| RED | > 12 alarms/hr |

### Flood Detection

Identifies periods where the alarm rate exceeds operator response capability.

**Algorithm:**
1. Query Loki for alarm counts in 10-minute buckets
2. Mark buckets with > 10 alarms as flood periods
3. Merge adjacent flood buckets into flood events
4. Calculate flood duration, alarm count, and peak rate per event
5. Calculate percentage of total time in flood state

**Grading:**

| Grade | Criteria |
|-------|----------|
| GREEN | < 1% of time in flood |
| AMBER | 1% – 5% of time in flood |
| RED | > 5% of time in flood |

### Chattering Detection

Identifies alarms oscillating between ACTIVE and CLEAR states.

**Algorithm:**
1. Query Loki for all state transitions per tag within the analysis window
2. Count transitions (active → clear → active cycles) per tag per hour
3. Flag tags with > 5 transitions in any 1-hour window as chattering

**Grading:**

| Grade | Criteria |
|-------|----------|
| GREEN | 0 chattering alarms |
| AMBER | 1 – 3 chattering alarms |
| RED | > 3 chattering alarms |

### Stale Alarm Detection

Identifies alarms stuck in ACTIVE state without resolution.

**Algorithm:**
1. Query Loki for the most recent event per tag
2. Identify tags whose last event was `active` and occurred more than 24 hours ago
3. Calculate stale duration for each

**Grading:**

| Grade | Criteria |
|-------|----------|
| GREEN | 0 stale alarms |
| AMBER | 1 – 5 stale alarms |
| RED | > 5 stale alarms |

### Priority Distribution Analysis

Compares actual alarm priority distribution against ISA-18.2 recommended targets.

**Algorithm:**
1. Query Loki for alarm counts grouped by `isa_priority` label
2. Calculate percentage distribution
3. Compare against target: ~80% low, ~15% medium, ~5% high
4. Calculate deviation from target for each priority level

**Grading:**

| Grade | Criteria |
|-------|----------|
| GREEN | Within 5% of target for all priorities |
| AMBER | 5% – 15% deviation |
| RED | > 15% deviation |

### Bad Actor Identification

Identifies the most frequently alarming points for targeted rationalization.

**Algorithm:**
1. Query Loki for alarm counts grouped by tag/source
2. Rank by frequency (descending)
3. Calculate each tag's contribution to total alarm load
4. Return top N bad actors with count, percentage, and tag details

## Current Implementation Status

The ISA-18.2 analysis engine has its threshold constants and analyzer class structure defined. The full implementation of each KPI calculation (querying Loki, computing metrics, storing results) is planned for a future phase. The scheduled job currently logs that analysis is pending implementation.

**Implemented:**
- Threshold constants matching ISA-18.2-2016
- Analyzer class structure with method signatures
- APScheduler recurring job configuration
- Grading criteria for all KPIs

**Planned:**
- Loki LogQL queries for each metric
- Result storage and historical trending
- Grafana dashboard integration for scorecard display
- Alert notifications when metrics degrade
