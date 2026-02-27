# Getting Started

## Prerequisites

- **Docker 24+** and **Docker Compose v2+**
- **Git**
- A SCADA system with alarm data (Ignition recommended for first setup)

## Installation

### 1. Clone and Configure

```bash
git clone https://github.com/jkp-parker/SignalForge.git
cd SignalForge
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)

# Set a strong database password
POSTGRES_PASSWORD=your_secure_password
```

### 2. Start the Stack

```bash
docker compose up -d
```

Database migrations run automatically on first start. The full stack is ready in approximately 60 seconds.

### 3. Verify Services

| Service | URL | Expected |
|---------|-----|----------|
| App portal | http://localhost | Login page |
| Swagger API docs | http://localhost/docs | Interactive API documentation |
| Loki API | http://localhost:3100/ready | `ready` |
| Grafana | http://localhost:3001 | Grafana login page |
| PostgreSQL | `localhost:5432` | Accepting connections |

### 4. First Login

Sign in with the default admin credentials:

- **Username:** `admin`
- **Password:** `admin123`

> Change these immediately in production by setting `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.

## What to Do Next

1. **[Connect a SCADA system](Connector-Setup.md)** — Set up your first Ignition connector using the 4-step wizard
2. **[Configure field mappings](Alarm-Normalization.md)** — Map vendor-specific fields to the canonical alarm schema
3. **[Enable Loki export](Alarm-Normalization.md#export-toggle)** — Start pushing normalized alarms to Loki
4. **[Explore the dashboard](Frontend-Guide.md)** — Monitor the pipeline health and alarm metrics

## Stopping and Restarting

```bash
# Stop all services (data persists in Docker volumes)
docker compose down

# Restart
docker compose up -d

# Stop and remove all data
docker compose down -v
```

## Troubleshooting

### Services not starting

Check container logs:

```bash
docker compose logs backend
docker compose logs signal-service
docker compose logs postgres
```

### Database migration errors

Migrations run automatically via `alembic upgrade head` in the backend's `start.sh`. If they fail, check the backend logs for schema conflicts.

### Loki not receiving data

1. Verify Loki is healthy: `curl http://localhost:3100/ready`
2. Check that your connector has export enabled (Transform page → Export toggle)
3. Verify the signal-service is running: `docker compose logs signal-service`
4. Check that alarm events exist in the journal staging tables (Dashboard → PostgreSQL panel)
