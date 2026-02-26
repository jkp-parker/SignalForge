import logging

logger = logging.getLogger("signal-service.ingestion")


def run_ingestion_cycle():
    """Main ingestion cycle — polls all enabled connectors for new alarms."""
    logger.info("Running ingestion cycle...")
    # Phase 2: Will iterate over enabled connectors from DB,
    # fetch alarms, normalize, and push to Loki
    logger.info("Ingestion cycle complete (no connectors configured yet)")
