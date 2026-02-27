# Alarm Correlation & Redundancy Analysis

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

This section addresses the identification of redundant, correlated, and cascading alarms. These analyses go beyond ISA-18.2 baseline metrics to identify structural improvements to the alarm system that can eliminate alarm load at its source rather than managing its symptoms.

---

## Co-Occurrence Analysis

Co-occurrence analysis identifies pairs of alarms that consistently fire within a short time window of each other. High co-occurrence rates suggest that one or both alarms may be redundant, or that they should be consolidated into a single calculated alarm or addressed through logic-based suppression (ISA-18.2 Section 12.4).

### Method

1. For each alarm annunciation event, identify all other alarms that were active or annunciated within a configurable co-occurrence window (default: 60 seconds, configurable up to 5 minutes)
2. Build a pairwise co-occurrence matrix. For each pair (Alarm A, Alarm B), calculate the co-occurrence rate
3. Flag pairs with co-occurrence rates above a threshold (default: 80%) for rationalization review

### Formula

```
Co-occurrence Rate (A,B) = (Count of times A and B both annunciate within window / Count of times A annunciates) x 100
```

> **Note:** This is directional. The rate of A given B may differ from B given A. Both directions should be reported.

### Actionable Outcomes

| Co-occurrence Rate | Interpretation | Recommended Action |
|-------------------|----------------|-------------------|
| **> 80%** | Strong redundancy candidate | Review whether one alarm can be removed, or both consolidated into a single calculated alarm |
| **50% – 80%** | Suppression candidate | The downstream alarm can be suppressed when the upstream alarm is already active |
| **< 50%** | Likely independent | No action required |

### Dashboard Visualization

- Heatmap matrix showing pairwise co-occurrence rates for the top 50 most frequent alarms
- Table listing all pairs above 50% co-occurrence with tag names, descriptions, rates, and recommended action

---

## Alarm Cascade Fingerprinting

An alarm cascade is a recurring sequence of alarms triggered by a single upstream root cause event. A single event (e.g., cooling water failure) can generate 10 to 50 downstream alarms within minutes. All alarms after the first are noise that overwhelms the operator during the period when focused response is most critical.

### Detection Method

1. Identify clusters of alarms from the same process area that fire within a short time window (e.g., 2 minutes)
2. Compare the alarm sequence (ordered list of tag names) against previously identified cascade fingerprints
3. If the sequence matches a known fingerprint above a similarity threshold (e.g., 70% of alarms in common), assign the same `cascade_id`
4. New unique sequences create new fingerprint records for future matching

### Metrics

| Metric | Formula |
|--------|---------|
| **Cascade Contribution %** | Total alarm annunciations within identified cascades / Total alarm annunciations x 100 |
| **Unique fingerprints** | Count of distinct cascade patterns identified |
| **Avg alarms per cascade** | Mean number of alarms in each cascade event |
| **Top cascades** | Fingerprints ranked by frequency and total alarm count |

### Key Insight

Cascade contribution percentage tells you what fraction of your total alarm load is **structurally addressable** through logic-based suppression or state-based alarming. Brownfield sites with flooding issues commonly see cascade contributions of **30% to 60%** of total alarm volume.

---

## Wasted Alarm Analysis

A wasted alarm is an annunciation that provided no operational value to the operator. Identifying and quantifying wasted alarms provides the most compelling metric for justifying alarm system improvement investment.

### Categories of Wasted Alarms

| Category | Description |
|----------|-------------|
| **Chattering/fleeting** | Noise from signal issues, not real process deviations |
| **Stale** | Permanently active alarms that operators have learned to ignore |
| **Redundant co-occurring** | Alarms that always fire alongside a higher-priority alarm addressing the same issue |
| **Auto-recovered** | Alarms where the process returns to normal before or shortly after acknowledgement with no operator intervention |
| **Cascade-subordinate** | Non-root-cause alarms within an identified cascade sequence |

### Signal-to-Noise Ratio

```
Signal-to-Noise Ratio = (Total alarms - Chattering - Fleeting - Stale - Redundant - Auto-recovered - Cascade-subordinate) / Total alarms x 100
```

This single percentage represents the fraction of the alarm load that is **genuinely meaningful** to the operator. It is the most powerful summary metric for alarm system quality.

### Grading

| GREEN | AMBER | RED |
|-------|-------|-----|
| > 80% signal | 50% – 80% signal | < 50% signal |

> Brownfield sites with flooding issues commonly score below 20% signal, meaning **over 80% of what operators see is noise**.
