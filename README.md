# SignalForge

Treat your **SCADA alarms like logs**. SignalForge is a vendor-agnostic middleware that pipes OT alarm and event data into Loki and Grafana so you can search, filter, and analyze at scale — with built-in **ISA-18.2** alarm performance benchmarking.

## Quick Start

```bash
git clone https://github.com/jkp-parker/SignalForge.git
cd SignalForge
cp .env.example .env
# Edit .env — set SECRET_KEY and POSTGRES_PASSWORD
docker compose up -d
```

Open http://localhost and log in with `admin` / `admin123`.

## What It Does

- **Connects** to Ignition (FactoryTalk, WinCC, Plant SCADA planned) via alarm journal
- **Normalizes** every alarm into a canonical schema with consistent labels
- **Stores** normalized alarms in Grafana Loki for LogQL queries
- **Grades** alarm system performance against ISA-18.2-2016 benchmarks
- **Detects** chattering, stale, flooding, and priority distribution issues

## Stack

| Service | Technology |
|---------|-----------|
| Reverse proxy | nginx |
| Frontend | React + Vite + D3.js |
| Backend API | FastAPI + SQLAlchemy |
| Alarm ingestion | Python + APScheduler |
| Database | PostgreSQL 16 |
| Log storage | Grafana Loki |
| Dashboards | Grafana |

## Documentation

Full documentation is in the [wiki](wiki/Home.md):

| Page | Description |
|------|-------------|
| [Architecture](wiki/Architecture.md) | System design, data flow, database schema |
| [Getting Started](wiki/Getting-Started.md) | Prerequisites, installation, first-run setup |
| [Connector Setup](wiki/Connector-Setup.md) | Connecting to Ignition and other SCADA platforms |
| [Alarm Normalization](wiki/Alarm-Normalization.md) | Canonical schema, field mapping, transformation pipeline |
| [Alarm Rationalization](wiki/Alarm-Rationalization-Philosophy.md) | ISA-18.2 philosophy, metrics framework, and performance spec |
| [ISA-18.2 Analysis Engine](wiki/ISA-18.2-Analysis-Engine.md) | KPI calculations, detection algorithms, grading |
| [Frontend Guide](wiki/Frontend-Guide.md) | Dashboard, connector wizard, alarm transformation UI |
| [API Reference](wiki/API-Reference.md) | Complete REST API documentation |
| [Configuration](wiki/Configuration.md) | Environment variables, deployment, tuning |
| [Development Guide](wiki/Development-Guide.md) | Project structure, adding connectors |

## License

Apache 2.0 — see [LICENSE](LICENSE)
