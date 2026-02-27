# Alarm Rationalization Philosophy

## Purpose

This section defines the alarm system performance monitoring and assessment philosophy that underpins SignalForge. The platform is designed to **scan brownfield industrial sites experiencing alarm flooding issues**, grade the effectiveness of their alarm systems against **ISA-18.2-2016** benchmarks, and provide continuous operational intelligence.

This specification is based on:

- **ANSI/ISA-18.2-2016**, Management of Alarm Systems for the Process Industries
- **IEC 62682:2014**, Management of Alarm Systems for the Process Industries
- **EEMUA Publication No. 191**, Alarm Systems: A Guide to Design, Management and Procurement (3rd Edition, 2013)
- **ANSI/ISA-101.01-2015**, Human Machine Interfaces for Process Automation Systems

## The Problem: Alarm Flooding

Most industrial sites have alarm systems that were never properly rationalized. Over years of operation, alarms accumulate — each one added for a reason that seemed important at the time — until operators face thousands of alarms per shift. The symptoms are well-documented:

- **Alarm fatigue** — operators stop reading individual alarms because the volume is overwhelming
- **Rubber-stamping** — operators acknowledge alarms in bulk without investigating
- **Missed critical alarms** — high-priority alarms are buried in noise
- **Nuisance alarms** — chattering, stale, and fleeting alarms that provide no operational value

ISA-18.2 quantifies this: a manageable alarm rate is **~6 alarms per operator per hour**. Above **12 alarms per hour**, the operator is overloaded. Brownfield sites commonly run at 50-200+ alarms per hour.

## The Solution: Treat Alarms Like Logs

SignalForge approaches alarm management through the lens of modern observability. Alarm events are structured log data — they have timestamps, labels, metadata, and lifecycle states. By treating them as logs and storing them in a purpose-built log engine (Loki), we gain:

- **Full-text search** across all alarm history
- **Label-based filtering** by severity, area, equipment, event type
- **Metric extraction** from log streams for KPI calculation
- **Long-term retention** for trend analysis and compliance reporting
- **Dashboard visualization** through Grafana's mature ecosystem

## Metrics Framework

SignalForge's analysis engine covers four categories of metrics, each building on the previous. Each category is documented in detail on its own page.

### Category 1: ISA-18.2 Compliance Metrics

The baseline metrics prescribed by ISA-18.2-2016 Section 16.4. These tell you **how bad the problem is**.

**[Read the full specification →](alarm-rationalization/ISA-18.2-Compliance-Metrics.md)**

| Metric | What It Measures | ISA-18.2 Reference |
|--------|-----------------|-------------------|
| Average alarm rate | Overall alarm system health | Section 16.4.2, Table 5 |
| Peak alarm rate | Burst periods that overwhelm operators | Section 16.4.3 |
| Alarm floods | Extended periods of operator overload | Section 16.4.4 |
| Frequently occurring alarms | Top offenders driving alarm load | Section 16.4.5 |
| Chattering & fleeting alarms | Signal noise from unstable alarms | Section 16.4.6 |
| Stale alarms | Permanently active alarms adding clutter | Section 16.4.7 |
| Priority distribution | Effectiveness of priority assignment | Section 16.4.8, Table 6 |
| Suppression monitoring | Unauthorized alarm suppression | Sections 16.5, 16.6 |

### Category 2: Operator Effectiveness Metrics

Extends ISA-18.2 Section 5.4 into quantifiable metrics. These tell you **how operators are coping**.

**[Read the full specification →](alarm-rationalization/Operator-Effectiveness-Metrics.md)**

| Metric | What It Measures |
|--------|-----------------|
| Acknowledgement response time | Operator awareness and workload |
| Operator action effectiveness | Whether acknowledgement leads to resolution |
| Rubber-stamping detection | Alarm fatigue indicators |
| Operator load profiling | Time-of-day and shift patterns |

### Category 3: Alarm Correlation & Redundancy Analysis

Goes beyond ISA-18.2 baseline to identify structural improvements. These tell you **where to focus rationalization effort**.

**[Read the full specification →](alarm-rationalization/Alarm-Correlation-Analysis.md)**

| Metric | What It Measures |
|--------|-----------------|
| Co-occurrence analysis | Redundant alarm pairs that always fire together |
| Alarm cascade fingerprinting | Recurring alarm sequences from single root causes |
| Wasted alarm analysis | Signal-to-noise ratio of the alarm system |

### Category 4: Precursor & Predictive Analysis

The most operationally valuable analysis. These tell you **what to change to prevent incidents**.

**[Read the full specification →](alarm-rationalization/Precursor-Predictive-Analysis.md)**

| Metric | What It Measures |
|--------|-----------------|
| Precursor alarm detection | Early warnings before high-priority alarms |
| Missed opportunity rate | How often early warnings are ignored |

## Supporting Pages

| Page | Description |
|------|-------------|
| [ISA-18.2 Compliance Metrics](alarm-rationalization/ISA-18.2-Compliance-Metrics.md) | Alarm rates, floods, chattering, stale, priority distribution, suppression |
| [Operator Effectiveness Metrics](alarm-rationalization/Operator-Effectiveness-Metrics.md) | Acknowledgement times, action effectiveness, rubber-stamping, load profiling |
| [Alarm Correlation & Redundancy Analysis](alarm-rationalization/Alarm-Correlation-Analysis.md) | Co-occurrence, cascade fingerprinting, wasted alarm / signal-to-noise ratio |
| [Precursor & Predictive Analysis](alarm-rationalization/Precursor-Predictive-Analysis.md) | Precursor detection, missed opportunity rate |
| [Composite Scorecard & Grading](alarm-rationalization/Scorecard-and-Grading.md) | RAG scorecard, overall system grade, complete formula reference |
| [Loki Data Model](alarm-rationalization/Loki-Data-Model.md) | Label schema, structured metadata, ingest-time enrichment, Grafana dashboard layout |
