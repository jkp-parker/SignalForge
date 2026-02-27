# Operator Effectiveness Metrics

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

ISA-18.2 Section 5.4 defines the alarm response timeline and the factors affecting operator response. This section extends the standard's framework into quantifiable operator effectiveness metrics. The operator is an integral part of the alarm system (ISA-18.2 Figure 5); measuring their interaction with alarms is essential to understanding system performance.

---

## Acknowledgement Response Time

The time between alarm annunciation (transition to UNACK state) and operator acknowledgement (transition to ACKED state) is a direct measure of operator awareness and workload. This maps to the "ack delay" and "operator response delay" phases of the alarm response timeline (ISA-18.2 Figure 4).

### Formula

```
Time to Acknowledge = Timestamp(ACKED) - Timestamp(UNACK) for same instance_id
```

### Metrics

- Mean, median, and P95 acknowledgement time per priority level per console
- Percentage of alarms acknowledged within the allowable response time (from rationalization data)
- Percentage of alarms that transition to RTNUN (return-to-normal unacknowledged), meaning the operator never acknowledged before the alarm cleared
- Acknowledgement time distribution as a histogram, segmented by priority

### Grading (Per Priority Level)

Higher priority alarms require faster response:

| Priority | GREEN | AMBER | RED |
|----------|-------|-------|-----|
| Highest | P95 < 1 minute | P95 1 – 5 minutes | P95 > 5 minutes |
| High | P95 < 3 minutes | P95 3 – 10 minutes | P95 > 10 minutes |
| Medium | P95 < 10 minutes | P95 10 – 30 minutes | P95 > 30 minutes |
| Low | P95 < 30 minutes | P95 30 – 60 minutes | P95 > 60 minutes |

### RTNUN Rate (Missed Alarms)

The RTNUN rate measures the percentage of alarms that return to normal before the operator acknowledges them. A high RTNUN rate indicates either fleeting/nuisance alarms or operator overload.

```
RTNUN Rate % = (Count of RTNUN events / Total alarm annunciations) x 100
```

| GREEN | AMBER | RED |
|-------|-------|-----|
| < 5% RTNUN rate | 5% – 15% RTNUN rate | > 15% RTNUN rate |

---

## Operator Action Effectiveness

Acknowledging an alarm is not the same as resolving it. This metric measures whether operator action after acknowledgement actually returned the process to normal.

### Formulas

```
ACK-to-RTN Time = Timestamp(RTNUN/NORM) - Timestamp(ACKED) for same instance_id
ACK-no-RTN Rate % = (Count of ACKED alarms with no RTN within 4 hours / Total ACKED alarms) x 100
```

### Reasoning

If an alarm is acknowledged but never returns to normal, either the operator action was ineffective, the alarm is stale, or the situation requires ongoing attention. If the ACK-to-RTN time is very short (near zero), the process likely self-corrected without operator intervention, indicating the alarm may not have required a response.

### Metrics

- Mean ACK-to-RTN time per priority level
- Percentage of alarms where RTN occurs before any operator action (auto-recovered) — high rates suggest alarms that add no operator value
- Percentage of acknowledged alarms that become stale (no RTN within 24 hours)

---

## Rubber-Stamping Detection

Rubber-stamping occurs when operators acknowledge alarms rapidly without reading or responding to them, typically to clear alarm summary clutter. This is a critical indicator of alarm fatigue.

### Detection Criteria

- **Rapid-fire acknowledgement:** An operator acknowledges more than 5 alarms within a 10-second window
- **Batch acknowledgement:** Use of group/page acknowledge functions (if logged by the system)
- **ACK-before-read:** Alarm acknowledged within less than 2 seconds of annunciation, suggesting the operator did not read the alarm detail

### Formula

```
Rubber-Stamp Rate % = (Count of ACK events in rapid-fire sequences / Total ACK events) x 100
```

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| < 2% rubber-stamp rate | 2% – 10% rubber-stamp rate | > 10% rubber-stamp rate |

---

## Operator Load Profiling

Alarm load varies by time of day, shift, day of week, and operational state. Profiling this load helps identify staffing gaps, training needs, and periods of highest risk.

### Metrics

- Alarm rate per console broken down by: hour of day, shift, day of week
- Acknowledgement response time overlaid with alarm rate to show correlation between load and degraded response
- Alarm rate by plant state (startup, normal operation, shutdown) if state data is available
- Per-shift comparison of all operator effectiveness metrics to identify training gaps between crews

### Dashboard Visualization

- **Heatmap:** alarm rate by hour-of-day vs day-of-week
- **Dual-axis time-series:** alarm rate and mean ACK time overlaid to show load-response correlation
- **Stacked bar chart:** alarm count by shift and priority
