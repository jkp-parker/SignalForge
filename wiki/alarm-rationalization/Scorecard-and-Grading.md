# Composite Scorecard & Grading

> Part of the [Alarm Rationalization Philosophy](../Alarm-Rationalization-Philosophy.md)

## Composite Alarm System Scorecard

The top-level dashboard panel presents a composite scorecard providing an at-a-glance assessment of alarm system health. Each metric is graded Red/Amber/Green (RAG) and the **overall system grade is determined by the worst individual score**, ensuring that no critical deficiency is masked by strong performance in other areas.

### Scorecard Metrics

| Metric | Source | GREEN | AMBER | RED |
|--------|--------|-------|-------|-----|
| Avg alarm rate/hr | [§3.1](ISA-18.2-Compliance-Metrics.md#average-alarm-rate) | ≤ 6 | 6–12 | > 12 |
| % time in flood | [§3.3](ISA-18.2-Compliance-Metrics.md#alarm-floods) | < 1% | 1–5% | > 5% |
| Top 10 alarm contribution | [§3.4](ISA-18.2-Compliance-Metrics.md#frequently-occurring-alarms) | < 5% | 5–15% | > 15% |
| Chattering/fleeting alarms | [§3.5](ISA-18.2-Compliance-Metrics.md#chattering--fleeting-alarms) | 0 | 1–3 | > 3 |
| Stale alarms | [§3.6](ISA-18.2-Compliance-Metrics.md#stale-alarms) | 0 | 1–5 | > 5 |
| Priority distribution deviation | [§3.7](ISA-18.2-Compliance-Metrics.md#priority-distribution) | < 5% | 5–15% | > 15% |
| Unauthorized suppressions | [§3.8](ISA-18.2-Compliance-Metrics.md#suppression--out-of-service-monitoring) | 0 | 1–2 | > 2 |
| ACK response (high priority P95) | [§4.1](Operator-Effectiveness-Metrics.md#acknowledgement-response-time) | < 3 min | 3–10 min | > 10 min |
| Rubber-stamp rate | [§4.3](Operator-Effectiveness-Metrics.md#rubber-stamping-detection) | < 2% | 2–10% | > 10% |
| Signal-to-noise ratio | [§5.3](Alarm-Correlation-Analysis.md#wasted-alarm-analysis) | > 80% | 50–80% | < 50% |
| Missed opportunity rate | [§6.2](Precursor-Predictive-Analysis.md#missed-opportunity-rate) | < 10% | 10–30% | > 30% |

### Overall System Grade

- **GREEN:** All individual metrics are GREEN
- **AMBER:** One or more metrics are AMBER, but none are RED
- **RED:** One or more metrics are RED

---

## Formula Reference

Complete list of all formulas defined in the alarm rationalization specification:

| Metric | Formula | Detail Page |
|--------|---------|-------------|
| Avg Alarm Rate (hourly) | Total alarms / Total hours | [ISA-18.2 Compliance](ISA-18.2-Compliance-Metrics.md#average-alarm-rate) |
| Peak Alarm % | (Intervals > 10 alarms / Total intervals) x 100 | [ISA-18.2 Compliance](ISA-18.2-Compliance-Metrics.md#peak-alarm-rate) |
| Flood Time % | (Minutes in flood / Total minutes) x 100 | [ISA-18.2 Compliance](ISA-18.2-Compliance-Metrics.md#alarm-floods) |
| Top 10 Contribution % | (Top 10 annunciations / Total) x 100 | [ISA-18.2 Compliance](ISA-18.2-Compliance-Metrics.md#frequently-occurring-alarms) |
| Time to Acknowledge | Timestamp(ACKED) - Timestamp(UNACK) | [Operator Effectiveness](Operator-Effectiveness-Metrics.md#acknowledgement-response-time) |
| RTNUN Rate % | (RTNUN events / Total annunciations) x 100 | [Operator Effectiveness](Operator-Effectiveness-Metrics.md#rtnun-rate-missed-alarms) |
| ACK-to-RTN Time | Timestamp(RTN) - Timestamp(ACKED) | [Operator Effectiveness](Operator-Effectiveness-Metrics.md#operator-action-effectiveness) |
| Rubber-Stamp Rate % | (Rapid-fire ACKs / Total ACKs) x 100 | [Operator Effectiveness](Operator-Effectiveness-Metrics.md#rubber-stamping-detection) |
| Co-occurrence Rate | (A and B within window / A total) x 100 | [Correlation Analysis](Alarm-Correlation-Analysis.md#co-occurrence-analysis) |
| Cascade Contribution % | (Cascade alarms / Total alarms) x 100 | [Correlation Analysis](Alarm-Correlation-Analysis.md#alarm-cascade-fingerprinting) |
| Signal-to-Noise Ratio | (Total - Wasted) / Total x 100 | [Correlation Analysis](Alarm-Correlation-Analysis.md#wasted-alarm-analysis) |
| Missed Opportunity Rate % | (Unacted precursors / Precursors) x 100 | [Precursor Analysis](Precursor-Predictive-Analysis.md#missed-opportunity-rate) |
