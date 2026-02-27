# Configuration

## Environment Variables

All configuration is via environment variables. Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `signalforge` | Database username |
| `POSTGRES_PASSWORD` | `signalforge_dev` | Database password |
| `POSTGRES_DB` | `signalforge` | Database name |
| `POSTGRES_HOST` | `postgres` | Database host (Docker service name) |
| `POSTGRES_PORT` | `5432` | Database port |

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **must change in production** |
| `ADMIN_USERNAME` | `admin` | Default admin account username |
| `ADMIN_PASSWORD` | `admin123` | Default admin account password |
| `DATABASE_URL` | (constructed) | Full async PostgreSQL connection string |
| `LOKI_URL` | `http://loki:3100` | Loki endpoint for backend queries |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT token lifetime (8 hours) |

### Signal Service

| Variable | Default | Description |
|----------|---------|-------------|
| `INGESTION_INTERVAL_SECONDS` | `30` | How often to poll alarm journal staging tables |
| `ISA182_ANALYSIS_INTERVAL_MINUTES` | `60` | How often to run ISA-18.2 KPI analysis |

### Grafana

| Variable | Default | Description |
|----------|---------|-------------|
| `GF_SECURITY_ADMIN_USER` | `admin` | Grafana admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Grafana admin password |
| `GF_SERVER_ROOT_URL` | `http://localhost:3001` | Grafana public URL |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL (relative to nginx) |

## Docker Compose Services

### Service Dependencies

```
postgres ──┬── backend ──── nginx (:80)
           │                  ├── frontend (:3000)
           │                  └── /docs (Swagger)
           │
loki ──────┤── signal-service
           │
           └── grafana (:3001)
```

### Exposed Ports

| Port | Service | Required |
|------|---------|----------|
| 80 | nginx (app + API) | Yes |
| 5432 | PostgreSQL | Only for external SCADA JDBC connections |
| 3001 | Grafana | Optional (for direct dashboard access) |
| 3100 | Loki | Optional (for direct LogQL queries) |

### Volume Mounts

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL data directory |
| `loki_data` | Loki chunk and index storage |
| `grafana_data` | Grafana dashboards and settings |

### Health Checks

Docker Compose health checks ensure services start in the correct order:

- **postgres:** `pg_isready` command
- **loki:** HTTP GET to `/ready` endpoint
- **backend:** Depends on postgres and loki health
- **signal-service:** Depends on postgres and loki health

## Tuning

### Ingestion Interval

The `INGESTION_INTERVAL_SECONDS` setting controls how frequently the signal-service polls the journal staging tables. Consider:

- **Lower values** (10-15s): Near-real-time alarm data in Loki, but higher database load
- **Default** (30s): Good balance between freshness and resource usage
- **Higher values** (60-120s): Lower load, suitable for sites with low alarm rates

### Loki Retention

Loki's retention is configured in `loki/loki-config.yml`. The default configuration uses local filesystem storage. For production deployments, consider:

- Setting appropriate retention periods (30-90 days for compliance reporting)
- Using object storage (S3, GCS) for long-term retention
- Adjusting chunk and index sizes based on alarm volume

### Database Maintenance

The staging tables (`alarm_events`, `alarm_event_data`) are automatically cleaned after each ingestion cycle. If the signal-service is stopped for an extended period, these tables may grow. Monitor queue depth via the Dashboard's PostgreSQL panel.

## Production Deployment

### Security Checklist

1. Generate a strong `SECRET_KEY`: `openssl rand -hex 32`
2. Set unique `POSTGRES_PASSWORD`
3. Change `ADMIN_USERNAME` and `ADMIN_PASSWORD`
4. Change Grafana admin credentials
5. Configure TLS termination at nginx or a load balancer
6. Restrict PostgreSQL port (5432) access to only trusted SCADA systems
7. Consider network segmentation between OT and IT networks

### Scaling Considerations

- **Loki** can be deployed in microservices mode for high-throughput sites
- **PostgreSQL** staging tables handle burst well — size the polling interval to match your alarm volume
- **Signal-service** processes connectors sequentially within each cycle — for many connectors, consider reducing the polling interval
