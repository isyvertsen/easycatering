"""Webshop API endpoints for customer ordering."""
from typing import List, Optional

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
    WebshopOrderLine,
    WebshopOrderStatusUpdate,
    WebshopBatchApproveRequest,
    WebshopBatchApproveResponse,
    WebshopAccessResponse,
    WebshopOrderByTokenResponse,
    WebshopCancelRequest,
    WebshopCancelResponse,
    WebshopDraftOrder,
    WebshopDraftOrderUpdate,
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


@router.get("/ordre/{order_id}/linjer", response_model=List[WebshopOrderLine])
async def get_webshop_order_lines(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get order lines for a specific order."""
    service = WebshopService(db)

    order = await service.get_order(order_id, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordre ikke funnet"
        )

    return order.ordrelinjer


# =============================================================================
# Admin - Order management
# =============================================================================

@router.get("/ordre/status", response_model=WebshopOrderListResponse)
async def list_orders_by_status(
    order_status: int = Query(..., alias="status", description="Order status to filter by"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List orders by status.

    Admin only - returns orders with the specified status.
    """
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun admin har tilgang"
        )

    service = WebshopService(db)
    return await service.get_orders_by_status(
        status_id=order_status,
        page=page,
        page_size=page_size,
        search=search
    )


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


# =============================================================================
# Token-based order access (no authentication required)
# =============================================================================

@router.get("/ordre/token/{token}", response_model=WebshopOrderByTokenResponse)
async def get_order_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get order by email token.

    No authentication required - this allows customers to view their order
    via a link sent in email confirmation.

    Token is valid for 14 days after order creation.
    """
    service = WebshopService(db)
    result = await service.get_order_by_token(token)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ugyldig eller utløpt token"
        )

    return result


@router.post("/ordre/token/{token}/bekreft")
async def confirm_receipt_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm receipt of order by email token.

    No authentication required - this allows customers to confirm receipt
    via a link sent in email.

    Only works for orders with status 35 (Pakkliste skrevet).
    Updates status to 80 (Godkjent av mottaker).
    """
    service = WebshopService(db)
    success = await service.confirm_receipt_by_token(token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kunne ikke bekrefte mottak. Sjekk at ordren er klar for levering."
        )

    return {"message": "Mottak bekreftet"}


# =============================================================================
# Order cancellation
# =============================================================================

@router.post("/ordre/{order_id}/kanseller", response_model=WebshopCancelResponse)
async def cancel_order(
    order_id: int,
    cancel_data: WebshopCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cancel an order.

    Admin only - sets order status to 98 (for sen kansellering) or 99 (kansellert).
    """
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun admin kan kansellere ordrer"
        )

    service = WebshopService(db)
    success, new_status = await service.cancel_order(
        order_id=order_id,
        arsak=cancel_data.arsak,
        for_sen=cancel_data.for_sen
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordre ikke funnet"
        )

    status_text = "For sen kansellering" if new_status == 98 else "Kansellert"
    return WebshopCancelResponse(
        message=f"Ordre {status_text}",
        ordrestatusid=new_status
    )


# =============================================================================
# Draft orders (auto-save)
# =============================================================================

@router.get("/draft-ordre", response_model=Optional[WebshopDraftOrder])
async def get_draft_order(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the current draft order for the user.

    Returns the draft order (status 10) with all order lines,
    or null if no draft exists.
    """
    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    return await service.get_draft_order(current_user)


@router.put("/draft-ordre", response_model=WebshopDraftOrder)
async def update_draft_order(
    draft_data: WebshopDraftOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create or update a draft order.

    If no draft order exists, creates one with status 10 (Startet).
    Replaces all existing order lines with the provided lines.
    """
    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    try:
        return await service.create_or_update_draft_order(
            current_user,
            draft_data.ordrelinjer
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/draft-ordre/{order_id}")
async def delete_draft_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a draft order.

    Only works for orders with status 10 belonging to the user.
    """
    service = WebshopService(db)

    success = await service.delete_draft_order(current_user, order_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft-ordre ikke funnet"
        )

    return {"message": "Draft-ordre slettet"}


@router.post("/ordre/{order_id}/reopen")
async def reopen_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reopen an order for editing.

    Sets order status back to 10 (Startet) so the user can add/remove items.
    Only works for orders belonging to the user that are not cancelled.
    """
    service = WebshopService(db)

    # Get the order (this checks ownership)
    order = await service.get_order(order_id, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordre ikke funnet"
        )

    # Check if order is cancelled
    if order.ordrestatusid in [98, 99]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kansellerte ordrer kan ikke gjenåpnes"
        )

    # Check if order is delivered
    if order.ordrelevert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leverte ordrer kan ikke gjenåpnes"
        )

    # Update status to 10 (Startet)
    success = await service.update_order_status(order_id, 10)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kunne ikke gjenåpne ordre"
        )

    return {"message": "Ordre gjenåpnet for redigering", "ordrestatusid": 10}


@router.post("/draft-ordre/{order_id}/submit", response_model=WebshopOrderCreateResponse)
async def submit_draft_order(
    order_id: int,
    leveringsdato: Optional[str] = Query(None, description="Delivery date (YYYY-MM-DD)"),
    informasjon: Optional[str] = Query(None, description="Additional information"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Submit a draft order (change status from 10 to 15).

    This finalizes the draft and sends it for approval.
    """
    from datetime import datetime as dt

    service = WebshopService(db)

    # Check webshop access
    access = await service.check_webshop_access(current_user)
    if not access.has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access.message or "Ingen webshop-tilgang"
        )

    # Parse delivery date if provided
    lev_dato = None
    if leveringsdato:
        try:
            lev_dato = dt.strptime(leveringsdato, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ugyldig datoformat. Bruk YYYY-MM-DD"
            )

    order = await service.submit_draft_order(
        current_user,
        order_id,
        leveringsdato=lev_dato,
        informasjon=informasjon
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft-ordre ikke funnet"
        )

    return WebshopOrderCreateResponse(
        ordre=order,
        message="Ordre sendt til godkjenning"
    )
