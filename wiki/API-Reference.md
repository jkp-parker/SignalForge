# API Reference

## Overview

All endpoints are prefixed with `/api`. Interactive Swagger documentation is available at `/docs` when the backend is running.

**Base URL:** `http://localhost/api`

## Authentication

SignalForge uses **OAuth2 password flow** with JWT bearer tokens.

### Login

```
POST /api/auth/token
Content-Type: application/x-www-form-urlencoded

username=admin&password=admin123
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

Include the token in subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid-string",
  "username": "admin",
  "full_name": "Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-02-27T08:00:00Z",
  "updated_at": "2026-02-27T08:00:00Z"
}
```

## Connectors

Manage SCADA connector configurations. All connector endpoints require admin authentication.

### List Connectors

```
GET /api/connectors
```

### Create Connector

```
POST /api/connectors
Content-Type: application/json

{
  "name": "Plant A Ignition",
  "connector_type": "ignition",
  "host": "192.168.1.100",
  "port": 8088,
  "polling_interval": 30,
  "enabled": true
}
```

Valid connector types: `ignition`, `factorytalk`, `wincc`, `plant_scada`

### Get Connector

```
GET /api/connectors/{connector_id}
```

### Update Connector

```
PATCH /api/connectors/{connector_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "polling_interval": 60
}
```

### Delete Connector

```
DELETE /api/connectors/{connector_id}
```

### Check Journal Status

Check if alarm data exists in the journal staging tables.

```
GET /api/connectors/journal/status
```

**Response:**

```json
{
  "has_data": true,
  "event_count": 42,
  "table_exists": true
}
```

### Test Connector

Fetch sample journal events and show normalized preview.

```
POST /api/connectors/{connector_id}/test
```

**Response:**

```json
{
  "success": true,
  "message": "Found 15 alarm events",
  "connection_ms": 45.2,
  "sample_records": [
    {
      "id": 1,
      "eventid": "evt-abc",
      "source": "prov:default:/tag:TK-101/Level",
      "priority": 3,
      "eventtime": "2026-02-27T08:15:00Z",
      "eventtype": 0
    }
  ],
  "normalized_preview": [
    {
      "timestamp": "2026-02-27T08:15:00Z",
      "labels": { "severity": "high", "event_type": "active" },
      "message": "TK-101 Level High",
      "metadata": { "value": 85.2, "priority": 3 }
    }
  ]
}
```

## Transform (Field Mapping)

Configure how vendor alarm fields map to the canonical schema.

### Get Transform Config

```
GET /api/connectors/{connector_id}/transform
```

**Response:**

```json
{
  "connector_id": "uuid",
  "connector_type": "ignition",
  "current_mappings": {
    "timestamp_field": "eventtime",
    "message_field": "displaypath",
    "severity_field": "priority"
  },
  "available_fields": ["id", "eventid", "source", "displaypath", "priority", "eventtime", "eventtype"],
  "sample_data": [...],
  "preview": [...]
}
```

### Save Transform Config

```
PATCH /api/connectors/{connector_id}/transform
Content-Type: application/json

{
  "timestamp_field": "eventtime",
  "message_field": "displaypath",
  "severity_field": "priority",
  "source_field": "source",
  "area_field": "displaypath",
  "equipment_field": "source",
  "alarm_type_field": "name",
  "event_type_field": "eventtype"
}
```

### Toggle Export

Enable or disable Loki push for a connector.

```
PATCH /api/connectors/{connector_id}/transform/export
Content-Type: application/json

{
  "enabled": true
}
```

## Alarms

Query normalized alarm data from Loki.

### Query Alarms

```
GET /api/alarms?query={job="signalforge"}&limit=100&start=2026-02-26T00:00:00Z&end=2026-02-27T00:00:00Z
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | `{job="signalforge"}` | LogQL query expression |
| `limit` | int | 100 | Maximum number of results |
| `start` | ISO datetime | 24h ago | Start of time range |
| `end` | ISO datetime | now | End of time range |

**Response:** Array of alarm events matching the LogQL query.

### Get Alarm Labels

```
GET /api/alarms/labels
```

Returns available label values for building filter dropdowns (severity levels, areas, equipment, etc.).

## Metrics

### Overview

```
GET /api/metrics/overview
```

**Response:**

```json
{
  "hourly_alarm_rate": [
    { "timestamp": "2026-02-27T07:00:00Z", "count": 23 },
    { "timestamp": "2026-02-27T08:00:00Z", "count": 31 }
  ],
  "severity_distribution": {
    "critical": 5,
    "high": 28,
    "medium": 112,
    "low": 455
  },
  "connector_stats": {
    "total": 3,
    "connected": 2,
    "error": 0,
    "disconnected": 1,
    "enabled": 2,
    "export_enabled": 1
  },
  "connectors": [
    {
      "id": "uuid",
      "name": "Plant A Ignition",
      "status": "connected",
      "last_successful_pull": "2026-02-27T08:14:30Z",
      "error_message": null
    }
  ]
}
```

## Health

### System Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "components": {
    "database": { "status": "ok", "latency_ms": 2.1 },
    "loki": { "status": "ok", "latency_ms": 5.3 },
    "grafana": { "status": "ok", "latency_ms": 12.7 }
  },
  "journal_stats": {
    "event_count": 0,
    "table_size": "48 kB"
  }
}
```

Status is `"healthy"` if both database and Loki are OK, otherwise `"degraded"`.

## Users (Admin Only)

### List Users

```
GET /api/users
```

### Create User

```
POST /api/users
Content-Type: application/json

{
  "username": "operator1",
  "password": "secure_password",
  "full_name": "John Smith",
  "role": "operator"
}
```

### Get User

```
GET /api/users/{user_id}
```

### Update User

```
PATCH /api/users/{user_id}
Content-Type: application/json

{
  "full_name": "John D. Smith",
  "role": "admin"
}
```

### Delete User

```
DELETE /api/users/{user_id}
```

## Error Responses

All endpoints return standard HTTP error codes:

| Code | Description |
|------|-------------|
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 422 | Validation error (Pydantic) |
| 500 | Internal server error |

Error response body:

```json
{
  "detail": "Description of the error"
}
```
