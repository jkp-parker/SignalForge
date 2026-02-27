# Frontend Guide

## Overview

The SignalForge frontend is built with **React 18**, **TypeScript**, **Vite**, and **D3.js**. It provides both admin and operator interfaces for managing connectors, configuring alarm normalization, and monitoring pipeline health.

## Navigation

The sidebar navigation is organized into three groups:

| Group | Pages | Access |
|-------|-------|--------|
| **Overview** | Dashboard | All users |
| **Alarms** | Transformation, Explorer (planned) | All users |
| **Admin** | Connectors, Users, Settings | Admin only |

## Dashboard

**Route:** `/` (home page)

The dashboard is the primary monitoring view, providing a live status board of the entire signal pipeline with **15-second auto-refresh**.

### Pipeline Flow Diagram

Six stage boxes visualize the data flow with live health indicators:

```
SCADA Sources → Signal Service → Loki → Grafana
                                   ↕
                              PostgreSQL
                                   ↕
                              Backend API
```

Each stage shows a colored status indicator:
- **Green** — service healthy and operational
- **Red** — service unavailable or misconfigured
- **Gray** — idle or not applicable

Stage-specific logic:
- **SCADA Sources:** Red if no connectors configured or none enabled
- **Signal Service:** Red if no connectors have export enabled
- **Loki, PostgreSQL, Grafana:** Real HTTP health checks against each service

### Infrastructure Stats

PostgreSQL journal queue metrics:
- **Queue depth** — number of unprocessed alarm events in staging tables
- **Table size** — disk space used by staging tables

### D3.js Charts

**Alarm Rate Chart** — area chart showing hourly alarm ingestion rate over the last 24 hours, sourced from Loki metric queries. Includes gradient fill and responsive axes.

**Severity Donut** — donut chart breaking alarm volume down by critical / high / medium / low with a center-total callout. Colors match ISA severity conventions.

### Stat Strip

Quick-glance totals displayed as cards:
- Alarms in the last hour
- Alarms in the last 24 hours
- Active connector count
- Overall system health (healthy / degraded)

### Data Sources

The dashboard queries two API endpoints:
- `GET /api/metrics/overview` — alarm rates, severity breakdown, connector stats
- `GET /api/health` — service health checks, journal table stats

## Connector Management

### Connector List

**Route:** `/admin/connectors`

Displays all configured connectors in a table with:
- Connector name and type (with vendor icon)
- Current status (connected / polling / error / disconnected)
- Polling interval
- Delete button

**Creating a new connector:**
1. Click **New Connector**
2. A modal presents the **platform picker** with available SCADA vendors:
   - **Ignition** — available now
   - **FactoryTalk, WinCC, Plant SCADA** — displayed as "coming soon"
3. Select a platform, enter a name
4. The connector is created and you're redirected to the setup wizard

### Connector Setup Wizard

**Route:** `/admin/connectors/:id`

A 4-step guided wizard for configuring a new connector:

#### Step 1 — Connector Details

Edit basic connector properties:
- Name
- Connector type (read-only after creation)
- Host address (for reference)
- Port
- Polling interval (seconds)
- Enabled toggle

#### Step 2 — Alarm Journal Database Setup

Specific to Ignition's alarm journal integration:
- Pre-filled **JDBC URL** to copy into Ignition's gateway configuration
- Database **credentials** (from SignalForge's PostgreSQL config)
- **Table names** (`alarm_events`, `alarm_event_data`)
- **"Check for Data"** button — polls every 5 seconds until journal events appear in the staging tables

#### Step 3 — Test & Preview

Fetches sample alarm events and shows them in two views:
- **Raw vendor data** — exact columns and values from the journal tables
- **Normalized canonical output** — how each alarm will look after transformation

This helps verify that the journal integration is working and the default normalization produces reasonable results.

#### Step 4 — Transform & Export

Links to the Alarm Transformation page with the current connector pre-selected. Shows current export status and provides a direct link to configure field mappings.

## Alarm Transformation

**Route:** `/alarms/transform`

The transformation page is where you configure how vendor-specific alarm fields map to SignalForge's canonical schema. This is the most feature-rich page in the frontend.

### Layout

The page is divided into three sections:

#### Raw Data Table (Top)

Displays actual alarm data from the selected connector's journal:
- Columns show every field from the vendor's raw data
- **Mapped columns** are highlighted in blue with their canonical target name shown below the header
- Filter dropdowns per column for narrowing displayed records

#### Mapping Editor (Middle)

Canonical fields organized by category:

| Category | Fields |
|----------|--------|
| **Core** | timestamp, message, severity |
| **Labels** | source, area, equipment, alarm_type, event_type |
| **Metadata** | value, threshold, ack_user |

Each field has a dropdown listing every available raw field from the vendor's schema. Select a raw field to map it to the canonical field.

#### Live Preview (Bottom)

Canonical alarm cards showing the normalized output. This preview:
- Runs entirely **client-side** via `useMemo`
- Updates **instantly** as you change mappings — no server round-trip
- Shows labels, metadata, and the constructed message

### Controls

- **Connector selector** — dropdown to switch between connectors
- **Export toggle** — enables/disables Loki push for this connector
- **Save** — persists the mapping to the connector's `label_mappings` config
- **Reset** — reverts to the last saved state
- **Dirty-state tracking** — visual indicator when unsaved changes exist; prevents accidental navigation

### Schema Reference

An expandable section at the bottom documents every canonical field with its description and expected values.

## User Management

**Route:** `/admin/users` (admin only)

- Table listing all users with username, full name, role, and status
- Create new users with username, password, full name, and role assignment
- Edit existing users (update name, role, password)
- Delete users
- Roles: `admin` (full access) or `operator` (read-only access to non-admin pages)

## Settings

**Route:** `/admin/settings` (admin only)

System health dashboard showing:
- Service status for each component (PostgreSQL, Loki, Grafana)
- Database connection info
- Loki endpoint configuration
- System version information

## Authentication

### Login Page

**Route:** `/login`

Standard username/password form. On successful login:
1. JWT token is stored in `localStorage`
2. User is redirected to the dashboard
3. Token is automatically included in all subsequent API requests via Axios interceptor

### Session Management

- Tokens expire after 8 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- On 401 response, the Axios interceptor automatically clears the token and redirects to login
- Protected routes check authentication status before rendering

## Technology Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | Component framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| D3.js | Data visualization (alarm rate chart, severity donut) |
| Axios | HTTP client with JWT interceptor |
| React Router v6 | Client-side routing |
