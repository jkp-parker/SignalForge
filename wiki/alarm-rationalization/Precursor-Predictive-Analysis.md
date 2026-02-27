# Precursor & Predictive Analysis

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

This section defines the most operationally valuable analysis capability: identifying situations where a lower-priority alarm precedes a higher-priority alarm, and where catching the earlier alarm could have prevented the escalation. This maps directly to the alarm response timeline (ISA-18.2 Figure 4) and the concept of allowable response time (ISA-18.2 Section 5.4.6).

---

## Precursor Alarm Detection

A precursor alarm is a lower-priority alarm that consistently appears before a higher-priority alarm on the same or related process equipment, providing an early warning opportunity.

### Detection Method

1. For each high or highest priority alarm annunciation, search backward in the log stream within a configurable lookback window (default: 30 minutes) for alarms from the same process area or related equipment
2. Record each preceding alarm as a candidate precursor with the lead time (time between precursor annunciation and high-priority alarm annunciation)
3. Across 30 days of data, build a frequency table of precursor relationships for each high-priority alarm
4. A precursor relationship is statistically significant when the precursor appears before the high-priority alarm in **more than 60% of occurrences**

### Metrics Per High-Priority Alarm

| Metric | Description |
|--------|-------------|
| **Precursor list** | Statistically significant precursor alarms |
| **Average lead time** | Minutes between precursor and high-priority alarm |
| **Appearance rate** | % of times the high-priority alarm was preceded by this precursor |
| **Acknowledgement rate** | % of times the precursor was acknowledged before the high-priority alarm fired |
| **Action rate** | % of times operator action was taken on the precursor before escalation |

---

## Missed Opportunity Rate

The missed opportunity rate is the **most actionable metric** in this framework. It quantifies how often operators had an early warning of an impending high-priority alarm but failed to act on it.

### Formula

```
Missed Opportunity Rate % = (High-priority alarms with unacted precursor / High-priority alarms with identified precursor) x 100
```

An "unacted precursor" is a precursor alarm that was either:
- **(a)** Never acknowledged (RTNUN), or
- **(b)** Acknowledged but with no evidence of corrective action (the process continued to deteriorate to the high-priority threshold)

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| < 10% missed opportunity | 10% – 30% missed opportunity | > 30% missed opportunity |

### Reasoning

A high missed opportunity rate provides a direct, data-backed case for specific interventions:

- **Operator training** on specific precursor alarms
- **Priority re-evaluation** to elevate precursors
- **HMI redesign** to make precursors more visible
- **Logic-based alarming** to link the precursor and consequence alarms

This metric bridges alarm system performance analysis with tangible safety improvement.

---

## Precursor Effectiveness Dashboard

A dedicated dashboard panel displays precursor relationships in a table format:

| High-Priority Alarm | Precursor | Avg Lead Time | Appears Before (%) | Precursor Unacked (%) |
|---------------------|-----------|---------------|--------------------|-----------------------|
| TK-101 Level HH | TK-101 Level H | 14 min | 92% | 34% |
| P-201 Trip | P-201 Vibration H | 8 min | 78% | 61% |
| RX-301 Temp HH | RX-301 Temp H | 6 min | 95% | 12% |

The **"Precursor Unacked (%)"** column is the key decision metric. A high percentage for a specific alarm pair indicates a clear opportunity for improvement through training, HMI changes, or priority adjustment.

### Reading the Table

- **TK-101 Level HH / TK-101 Level H:** 92% of the time, a Level H alarm appears 14 minutes before the Level HH alarm. In 34% of those cases, the operator never acknowledged the Level H alarm. This is a training opportunity — operators should be taught that Level H on TK-101 is a reliable early warning.

- **P-201 Trip / P-201 Vibration H:** The vibration alarm precedes the trip 78% of the time with 8 minutes of lead time, but 61% of the time the precursor goes unacknowledged. This is a high-value intervention target — the vibration alarm is being ignored, leading to pump trips that could be prevented.

- **RX-301 Temp HH / RX-301 Temp H:** Near-perfect precursor relationship (95%) with only 12% unacknowledged — operators are already responding to this precursor effectively. Low priority for intervention.
