import logging
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler

from config import settings
from scheduler.ingestion import run_ingestion_cycle
from scheduler.isa182_analysis import run_isa182_analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signal-service")


def main():
    logger.info("Starting SignalForge signal-service")
    logger.info(f"Ingestion interval: {settings.INGESTION_INTERVAL_SECONDS}s")
    logger.info(f"ISA-18.2 analysis interval: {settings.ISA182_ANALYSIS_INTERVAL_MINUTES}m")

    scheduler = BlockingScheduler()

    scheduler.add_job(
        run_ingestion_cycle,
        "interval",
        seconds=settings.INGESTION_INTERVAL_SECONDS,
        id="ingestion_cycle",
        name="Alarm Ingestion Cycle",
        misfire_grace_time=30,
    )

    scheduler.add_job(
        run_isa182_analysis,
        "interval",
        minutes=settings.ISA182_ANALYSIS_INTERVAL_MINUTES,
        id="isa182_analysis",
        name="ISA-18.2 Analysis Job",
        misfire_grace_time=60,
    )

    def shutdown(signum, frame):
        logger.info("Shutting down signal-service...")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    logger.info("Signal-service scheduler started")
    scheduler.start()


if __name__ == "__main__":
    main()
