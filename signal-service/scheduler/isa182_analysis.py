import logging

logger = logging.getLogger("signal-service.isa182")


def run_isa182_analysis():
    """Periodic ISA-18.2 KPI calculation job."""
    logger.info("Running ISA-18.2 analysis job...")
    # Phase 4: Will query Loki for alarm history and calculate
    # chattering, stale, flooding, distribution KPIs
    logger.info("ISA-18.2 analysis complete (not yet implemented)")
