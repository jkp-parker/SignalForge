# ISA-18.2 Compliance Metrics

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

These are the baseline metrics prescribed by ANSI/ISA-18.2-2016 Section 16.4. All metrics shall be calculated from a minimum of 30 days of data unless otherwise stated. For batch operations, data from several similar batches is more applicable.

---

## Average Alarm Rate

Analysis of the annunciated alarm rate is the primary indicator of overall alarm system health (ISA-18.2 Section 16.4.2). The rate is measured per operator console, representing the span of control and alarm responsibility of a single operator.

### Formula

```
Avg Alarm Rate (per hour) = Total annunciated alarms in period / Total hours in period
Avg Alarm Rate (per 10 min) = Total annunciated alarms in period / Total 10-min intervals in period
```

### Targets (ISA-18.2 Table 5)

| Metric | Very Likely Acceptable | Maximum Manageable |
|--------|----------------------|-------------------|
| Alarms per hour (avg) | ~6 | ~12 |
| Alarms per 10 min (avg) | ~1 | ~2 |

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| ≤ 6 alarms/hr average | 6 – 12 alarms/hr average | > 12 alarms/hr average |

### Reasoning

These rates are based on the human capacity to detect an alarm, diagnose the situation, respond with corrective action, and monitor the condition to verify the abnormal condition has been corrected. Sustained operation above maximum manageable indicates the alarm system is annunciating more alarms than an operator can handle, increasing the likelihood of missed alarms.

### Dashboard Visualization

- Time-series line chart showing rolling 1-hour alarm rate per console
- Single-stat gauge showing current average with RAG colour thresholds
- Heatmap showing alarm count per 10-minute bucket across a 24-hour period to identify time-of-day patterns

---

## Peak Alarm Rate

Average alarm rates can mask dangerous peaks. Peak analysis counts annunciated alarms in fixed 10-minute intervals to identify periods where the operator is overwhelmed (ISA-18.2 Section 16.4.3).

### Formula

```
Peak Alarm % = (Count of 10-min intervals with > 10 alarms / Total 10-min intervals) x 100
```

### Targets

- Less than ~1% of 10-minute intervals should contain more than 10 alarms
- The maximum number of alarms in any single 10-minute period should be ≤ 10

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| < 1% intervals > 10 alarms | 1% – 5% intervals > 10 alarms | > 5% intervals > 10 alarms |

### Dashboard Visualization

- Bar chart showing alarm count per 10-minute interval with a horizontal threshold line at 10
- Single-stat percentage showing proportion of intervals exceeding 10 alarms
- Table listing the top peak intervals with timestamp, alarm count, and console

---

## Alarm Floods

An alarm flood is a variable-duration period where the alarm rate exceeds operator response capability. Floods are the most dangerous operational condition for an alarm system (ISA-18.2 Section 16.4.4).

### Detection Logic

- **Flood start:** Alarm rate exceeds 10 alarms in any 10-minute interval
- **Flood end:** Alarm rate drops below 5 alarms in a 10-minute interval
- **Flood duration:** Time from flood start to flood end, spanning all adjacent high-rate intervals

### Metrics

- **Flood Time %:** (Total minutes in flood / Total minutes in period) x 100
- Number of flood events per day/week/month
- Duration of each flood event
- Total alarm count within each flood event
- Peak alarm rate within each flood event

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| < 1% of time in flood | 1% – 5% of time in flood | > 5% of time in flood |

### Dashboard Visualization

- Annotated time-series chart with flood periods highlighted as shaded regions
- Single-stat gauge showing percentage of time in flood
- Table listing individual flood events with start time, duration, alarm count, and peak rate

---

## Frequently Occurring Alarms

A small number of individual alarms often produce a disproportionate share of the total alarm load. Addressing these top offenders yields the greatest improvement in system performance (ISA-18.2 Section 16.4.5).

### Formula

```
Top 10 Contribution % = (Sum of annunciations for top 10 tags / Total annunciations) x 100
```

### Targets

- The top 10 most frequent alarms should comprise ~1% to 5% of the overall system load
- Action plans should be in place for any alarm in the top 10

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| Top 10 contribute < 5% | Top 10 contribute 5% – 15% | Top 10 contribute > 15% |

### Dashboard Visualization

- Horizontal bar chart ranking alarms by annunciation count (Pareto chart)
- Table with tag name, description, count, percentage of total, and current action plan status

---

## Chattering & Fleeting Alarms

Chattering alarms repeatedly transition between active and not-active states in a short period. Fleeting alarms are short-duration alarms that do not immediately repeat. Both represent noise that degrades operator effectiveness (ISA-18.2 Section 16.4.6).

### Detection Criteria

- **Chattering:** An alarm that transitions between active and not-active more than 5 times within a 5-minute rolling window, where the transitions are not due to operator action
- **Fleeting:** An alarm with a duration (UNACK to RTNUN) of less than 10 seconds that does not immediately repeat within 60 seconds

### Targets

There is no long-term acceptable quantity of chattering or fleeting alarms. The target is **zero**, with action plans to correct any that occur.

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| 0 chattering/fleeting alarms | 1 – 3 active | > 3 active |

---

## Stale Alarms

Alarms that remain annunciated continuously for an extended duration (e.g., longer than 24 hours) provide little valuable information to operators and contribute to alarm fatigue (ISA-18.2 Section 16.4.7).

### Detection Criteria

Active alarm with no RTNUN/NORM event for > 24 hours.

### Targets

- Less than 5 stale alarms present on any day, with action plans to address
- No alarm should be intentionally designed to become stale

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| 0 stale alarms | 1 – 5 stale alarms | > 5 stale alarms |

---

## Priority Distribution

Effective use of alarm priority enhances the operator's ability to manage alarms. Higher priorities should be used less frequently. A skewed distribution indicates ineffective rationalization (ISA-18.2 Section 16.4.8, Table 6).

### Target Distribution

| Priority | Target % of Annunciated Alarms |
|----------|-------------------------------|
| Low | ~80% |
| Medium | ~15% |
| High | ~5% |
| Highest (if used) | < 1% |

### Grading

Grading is based on the deviation of the actual annunciated priority distribution from the target distribution.

| GREEN | AMBER | RED |
|-------|-------|-----|
| Within 5% of target for all priorities | 5% – 15% deviation | > 15% deviation |

---

## Suppression & Out-of-Service Monitoring

Alarms can be suppressed through controlled methods (shelving, designed suppression, out-of-service). Uncontrolled suppression represents a serious safety risk (ISA-18.2 Sections 16.5, 16.6).

### Metrics

- Count of currently shelved alarms and average shelve duration
- Count of shelved alarms exceeding their configured time limit
- Count of out-of-service alarms and duration
- Count of suppressed-by-design alarms
- Count of alarms suppressed outside of authorized methods (**target: zero**)
- Count of unauthorized alarm attribute changes (setpoint, priority, deadband) (**target: zero**)

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| 0 unauthorized suppressions or attribute changes | 1 – 2 detected | > 2 detected |
