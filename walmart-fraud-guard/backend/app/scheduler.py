import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging

from app.db.mongo import get_mongo_db
from app.db.postgres import get_pg_session
from app.routes.ws import manager
from app.services.drift_detector import DriftDetectorService
from app.services.retraining import RetrainingService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
drift_detector = None
retraining_service = None

async def init_scheduler():
    """Initialize the background scheduler with jobs."""
    global drift_detector, retraining_service
    
    drift_detector = DriftDetectorService()
    retraining_service = RetrainingService()
    
    # Drift detection every 5 minutes
    scheduler.add_job(
        scheduled_drift_check,
        IntervalTrigger(minutes=5),
        id="drift_check",
        name="Check for feature drift every 5 minutes",
        replace_existing=True
    )
    
    # Retrain decision check every 1 hour
    scheduler.add_job(
        scheduled_retrain_check,
        IntervalTrigger(hours=1),
        id="retrain_check",
        name="Check if model should retrain every hour",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Background scheduler started with drift check (5min) and retrain check (1hr)")

async def shutdown_scheduler():
    """Shutdown the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler shut down")

async def scheduled_drift_check():
    """
    Background task: Run every 5 minutes to detect feature drift.
    Broadcasts to WebSocket if drift detected.
    """
    try:
        logger.info("Starting scheduled drift check...")
        result = await drift_detector.check()
        
        if result.has_drift:
            logger.warning(f"Drift detected: {result.drifted_feature_count} features, severity={result.severity}")
            
            # Broadcast to all connected WebSocket clients
            await manager.broadcast_drift_alert({
                "type": "drift_alert",
                "severity": result.severity,
                "drifted_features": result.drifted_features,
                "message": f"Model drift detected in {result.drifted_feature_count} features",
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            logger.info("Drift check completed: no significant drift detected")
    
    except Exception as e:
        logger.error(f"Error in scheduled drift check: {e}", exc_info=True)

async def scheduled_retrain_check():
    """
    Background task: Run every hour to check if model should retrain.
    Conditions: drift detected, high false positive rate, or new labeled data accumulated.
    """
    try:
        logger.info("Starting scheduled retrain check...")
        
        # Get database sessions
        mongo_db = await get_mongo_db()
        pg_session = await get_pg_session()
        
        should_retrain, reason = await retraining_service.should_retrain(mongo_db, pg_session)
        
        if should_retrain:
            logger.warning(f"Retrain triggered: {reason}")
            
            # Broadcast retrain trigger to dashboard
            await manager.broadcast_drift_alert({
                "type": "retrain_alert",
                "severity": "high",
                "message": f"Model retraining triggered: {reason}",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Actually run the retraining
            logger.info(f"Starting automated retraining due to: {reason}")
            result = await retraining_service.run(reason)
            
            if result.get("success"):
                logger.info(f"Retraining completed successfully. New ROC-AUC: {result.get('new_roc_auc')}")
            else:
                logger.error(f"Retraining failed: {result.get('error')}")
        else:
            logger.info(f"Retrain check completed: no trigger (reason: {reason})")
        
        await pg_session.close()
    
    except Exception as e:
        logger.error(f"Error in scheduled retrain check: {e}", exc_info=True)
