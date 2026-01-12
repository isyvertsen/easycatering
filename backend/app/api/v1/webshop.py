"""Webshop API endpoints for customer ordering."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_active_user
from app.domain.entities.user import User
from app.infrastructure.database.session import get_db
from app.services.webshop_service import WebshopService
from app.schemas.webshop import (
    WebshopProductListResponse,
    WebshopProduct,
    WebshopOrderCreate,
    WebshopOrderCreateResponse,
    WebshopOrderListResponse,
    WebshopOrderDetail,
    WebshopOrderStatusUpdate,
    WebshopBatchApproveRequest,
    WebshopBatchApproveResponse,
    WebshopAccessResponse,
)

router = APIRouter()


# =============================================================================
# Access check
# =============================================================================

@router.get("/tilgang", response_model=WebshopAccessResponse)
async def check_webshop_access(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Check if current user has webshop access.

    Access is granted if:
    - User is linked to a customer (kundeid)
    - Customer belongs to a customer group with webshop=true
    """
    service = WebshopService(db)
    return await service.check_webshop_access(current_user)


# =============================================================================
# Products
# =============================================================================

@router.get("/produkter", response_model=WebshopProductListResponse)
async def list_webshop_products(
    search: Optional[str] = Query(None, description="Search in product name"),
    kategori_id: Optional[int] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("produktnavn", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List products available in webshop.

    Only returns products where webshop=true and utgatt=false.
    """
    # Check webshop access
    service = WebshopService(db)
    access = await service.check_webshop_access(current_user)

    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    return await service.get_products(
        search=search,
        kategori_id=kategori_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get("/produkter/{product_id}", response_model=WebshopProduct)
async def get_webshop_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single webshop product."""
    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    product = await service.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt ikke funnet eller ikke tilgjengelig i webshop"
        )

    return product


# =============================================================================
# Orders
# =============================================================================

@router.post("/ordre", response_model=WebshopOrderCreateResponse)
async def create_webshop_order(
    order_data: WebshopOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new webshop order.

    Order is created with status 1 (Ny - venter på godkjenning).
    """
    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    if not order_data.ordrelinjer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ordre må ha minst én ordrelinje"
        )

    try:
        return await service.create_order(current_user, order_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/mine-ordre", response_model=WebshopOrderListResponse)
async def list_my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ordrestatusid: Optional[int] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get orders for the current user's customer."""
    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    return await service.get_my_orders(
        current_user,
        page=page,
        page_size=page_size,
        ordrestatusid=ordrestatusid
    )


@router.get("/ordre/{order_id}", response_model=WebshopOrderDetail)
async def get_webshop_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single order with details."""
    service = WebshopService(db)

    order = await service.get_order(order_id, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordre ikke funnet"
        )

    return order


# =============================================================================
# Admin - Order approval
# =============================================================================

@router.get("/ordre/godkjenning", response_model=WebshopOrderListResponse)
async def list_orders_for_approval(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List orders waiting for approval.

    Admin only - returns orders with status 1 (Ny).
    """
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun admin har tilgang til godkjenningslisten"
        )

    service = WebshopService(db)
    return await service.get_orders_for_approval(
        page=page,
        page_size=page_size,
        search=search
    )


@router.patch("/ordre/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_update: WebshopOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update order status.

    Admin only.
    """
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun admin kan oppdatere ordrestatus"
        )

    service = WebshopService(db)
    success = await service.update_order_status(order_id, status_update.ordrestatusid)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordre ikke funnet"
        )

    return {"message": "Ordrestatus oppdatert"}


@router.post("/ordre/godkjenning/batch", response_model=WebshopBatchApproveResponse)
async def batch_approve_orders(
    request: WebshopBatchApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Batch update order status.

    Admin only.
    """
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun admin kan batch-oppdatere ordrer"
        )

    service = WebshopService(db)
    count = await service.batch_update_status(request.ordre_ids, request.ordrestatusid)

    return WebshopBatchApproveResponse(
        message=f"{count} ordrer oppdatert",
        updated_count=count
    )
