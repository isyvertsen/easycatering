"""
Anonymization API endpoints for sensitive data handling.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
import logging

from app.infrastructure.database.session import get_db
from scripts.anonymize_customers import CustomerAnonymizer

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/customers/{customer_id}/anonymize")
async def anonymize_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Anonymize a specific customer's personal data.
    
    Args:
        customer_id: The ID of the customer to anonymize
        db: Database session
        
    Returns:
        Dict containing success status and message
    """
    try:
        anonymizer = CustomerAnonymizer(db)
        success = await anonymizer.anonymize_single_customer(customer_id)
        
        if success:
            return {
                "success": True,
                "message": f"Customer {customer_id} has been successfully anonymized",
                "customer_id": customer_id
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Customer with ID {customer_id} not found"
            )
    
    except Exception as e:
        logger.error(f"Error anonymizing customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to anonymize customer: {str(e)}"
        )


@router.post("/customers/anonymize-all")
async def anonymize_all_customers(
    background_tasks: BackgroundTasks,
    batch_size: int = 100,
    kundegruppe: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Anonymize customers in the database, optionally filtered by kundegruppe.
    This operation runs in the background due to potentially long execution time.
    
    Args:
        background_tasks: FastAPI background tasks
        batch_size: Number of customers to process in each batch
        kundegruppe: Optional customer group ID to filter by (if None, anonymizes all customers)
        db: Database session
        
    Returns:
        Dict containing task information
    """
    try:
        # Add the anonymization task to background tasks
        background_tasks.add_task(
            _anonymize_all_customers_task,
            batch_size,
            kundegruppe
        )
        
        filter_message = f" in kundegruppe {kundegruppe}" if kundegruppe else ""
        
        return {
            "success": True,
            "message": f"Customer anonymization{filter_message} has been started in the background",
            "batch_size": batch_size,
            "kundegruppe": kundegruppe,
            "note": "This operation may take several minutes to complete. Check server logs for progress."
        }
    
    except Exception as e:
        logger.error(f"Error starting bulk anonymization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start bulk anonymization: {str(e)}"
        )


async def _anonymize_all_customers_task(batch_size: int, kundegruppe: Optional[int] = None):
    """
    Background task for anonymizing customers.
    
    Args:
        batch_size: Number of customers to process in each batch
        kundegruppe: Optional customer group ID to filter by
    """
    from app.infrastructure.database.session import AsyncSessionLocal
    
    try:
        filter_msg = f" in kundegruppe {kundegruppe}" if kundegruppe else ""
        logger.info(f"Starting background anonymization of customers{filter_msg}")
        
        async with AsyncSessionLocal() as session:
            anonymizer = CustomerAnonymizer(session)
            stats = await anonymizer.anonymize_customers_by_group(batch_size, kundegruppe)
            
            logger.info(f"Background anonymization completed with stats: {stats}")
            
    except Exception as e:
        logger.error(f"Error in background anonymization task: {str(e)}")


@router.get("/customers/anonymization-status")
async def get_anonymization_status() -> Dict[str, Any]:
    """
    Get the current status of anonymization operations.
    
    Returns:
        Dict containing status information
    """
    # This is a simple implementation - in production you might want to use Redis or a task queue
    return {
        "message": "Check server logs for anonymization progress",
        "note": "This endpoint provides basic status. For detailed progress, monitor server logs."
    }