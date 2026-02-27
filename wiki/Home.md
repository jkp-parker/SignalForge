# SignalForge Wiki

Welcome to the SignalForge wiki — the comprehensive reference for understanding, deploying, and extending SignalForge.

## What is SignalForge?

SignalForge is a **vendor-agnostic SCADA alarm middleware** that treats OT alarm and event data like structured logs. It connects to industrial control systems (Ignition, FactoryTalk, WinCC, Plant SCADA), normalizes every alarm into a canonical schema, and pushes it to [Grafana Loki](https://grafana.com/oss/loki/) for modern observability — with built-in **ISA-18.2** alarm performance benchmarking.

### Why SignalForge?

Industrial alarm systems are critical safety infrastructure, but most sites have no way to objectively measure alarm system health. Operators are often buried under thousands of alarms per shift — alarm floods, chattering tags, stale alarms — while management has no visibility into the problem.

SignalForge solves this by:

- **Centralizing alarm data** from multiple SCADA vendors into a single queryable store
- **Normalizing vendor-specific formats** into a canonical schema with consistent labels
- **Grading alarm system performance** against ISA-18.2-2016 benchmarks automatically
- **Identifying actionable improvements** — top offenders, chattering alarms, alarm floods, priority distribution issues
- **Providing modern observability** through Grafana dashboards and LogQL queries

### Who is it for?

- **Alarm management teams** assessing brownfield sites with alarm flooding issues
- **Control system engineers** rationalizing alarm systems against ISA-18.2
- **Operations managers** who need objective metrics on alarm system health
- **Integrators** building alarm management solutions across multiple SCADA platforms

## Wiki Contents

| Page | Description |
|------|-------------|
| [Architecture](Architecture.md) | System architecture, data flow, service topology, and technology stack |
| [Getting Started](Getting-Started.md) | Prerequisites, installation, first-run configuration |
| [Connector Setup](Connector-Setup.md) | Connecting to Ignition and other SCADA platforms |
| [Alarm Normalization](Alarm-Normalization.md) | Canonical schema, field mapping, and the transformation pipeline |
| [Alarm Rationalization Philosophy](Alarm-Rationalization-Philosophy.md) | ISA-18.2 principles, performance monitoring specification, and the metrics framework |
| &nbsp;&nbsp;&nbsp;&nbsp;[ISA-18.2 Compliance Metrics](alarm-rationalization/ISA-18.2-Compliance-Metrics.md) | Alarm rates, floods, chattering, stale, priority distribution |
| &nbsp;&nbsp;&nbsp;&nbsp;[Operator Effectiveness Metrics](alarm-rationalization/Operator-Effectiveness-Metrics.md) | Acknowledgement times, rubber-stamping, load profiling |
| &nbsp;&nbsp;&nbsp;&nbsp;[Alarm Correlation Analysis](alarm-rationalization/Alarm-Correlation-Analysis.md) | Co-occurrence, cascades, signal-to-noise ratio |
| &nbsp;&nbsp;&nbsp;&nbsp;[Precursor & Predictive Analysis](alarm-rationalization/Precursor-Predictive-Analysis.md) | Precursor detection, missed opportunity rate |
| &nbsp;&nbsp;&nbsp;&nbsp;[Scorecard & Grading](alarm-rationalization/Scorecard-and-Grading.md) | Composite RAG scorecard, formula reference |
| &nbsp;&nbsp;&nbsp;&nbsp;[Loki Data Model](alarm-rationalization/Loki-Data-Model.md) | Label schema, metadata, Grafana dashboard layout |
| [ISA-18.2 Analysis Engine](ISA-18.2-Analysis-Engine.md) | KPI calculations, detection algorithms, grading criteria |
| [Frontend Guide](Frontend-Guide.md) | Dashboard, connector wizard, alarm transformation UI |
| [API Reference](API-Reference.md) | Complete REST API documentation |
| [Configuration](Configuration.md) | Environment variables, deployment options, tuning |
| [Development Guide](Development-Guide.md) | Project structure, adding connectors, contributing |

## Quick Links

| Resource | URL |
|----------|-----|
| App (Admin / Operator portal) | `http://localhost` |
| API docs (Swagger) | `http://localhost/docs` |
| Grafana dashboards | `http://localhost:3001` |
| Loki API | `http://localhost:3100` |
| GitHub repository | `https://github.com/jkp-parker/SignalForge` |
