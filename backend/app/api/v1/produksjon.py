"""Production system API endpoints."""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.produksjonstemplate import ProduksjonsTemplate as TemplateModel, ProduksjonsTemplateDetaljer as TemplateDetaljerModel
from app.models.produksjon import Produksjon as ProduksjonsModel, ProduksjonsDetaljer as ProduksjonsDetaljerModel
from app.models.kunder import Kunder
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.schemas.produksjon import (
    ProduksjonsTemplate,
    ProduksjonsTemplateCreate,
    ProduksjonsTemplateUpdate,
    Produksjon,
    ProduksjonsCreate,
    ProduksjonsUpdate,
    DistributeTemplateRequest,
    ApproveProductionRequest,
    TransferToOrderRequest,
    BulkTransferToOrderRequest,
)

router = APIRouter()


class TemplateListResponse(BaseModel):
    """Paginated response for template list."""
    items: List[ProduksjonsTemplate]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProduksjonsListResponse(BaseModel):
    """Paginated response for production list."""
    items: List[Produksjon]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Template Endpoints
# ============================================================================

@router.get("/templates", response_model=TemplateListResponse, tags=["produksjon-templates"])
async def get_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    aktiv: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, max_length=200),
) -> TemplateListResponse:
    """Get all production templates with pagination."""
    query = select(TemplateModel)
    count_query = select(func.count()).select_from(TemplateModel)

    # Filters
    if aktiv is not None:
        query = query.where(TemplateModel.aktiv == aktiv)
        count_query = count_query.where(TemplateModel.aktiv == aktiv)

    if search:
        search_term = f"%{search}%"
        search_filter = or_(
            TemplateModel.template_navn.ilike(search_term),
            TemplateModel.beskrivelse.ilike(search_term),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(TemplateModel.opprettet_dato.desc())
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return TemplateListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/templates", response_model=ProduksjonsTemplate, tags=["produksjon-templates"])
async def create_template(
    template: ProduksjonsTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProduksjonsTemplate:
    """Create a new production template."""
    # Create template
    db_template = TemplateModel(
        template_navn=template.template_navn,
        beskrivelse=template.beskrivelse,
        kundegruppe=template.kundegruppe,
        gyldig_fra=template.gyldig_fra,
        gyldig_til=template.gyldig_til,
        aktiv=template.aktiv,
        opprettet_dato=datetime.now(),
        opprettet_av=current_user.id,
    )
    db.add(db_template)
    await db.flush()

    # Create template details
    for idx, detalj in enumerate(template.detaljer or []):
        db_detalj = TemplateDetaljerModel(
            template_id=db_template.template_id,
            produktid=detalj.produktid,
            kalkyleid=detalj.kalkyleid,
            standard_antall=detalj.standard_antall,
            maks_antall=detalj.maks_antall,
            paakrevd=detalj.paakrevd,
            linje_nummer=detalj.linje_nummer or idx,
        )
        db.add(db_detalj)

    await db.commit()
    await db.refresh(db_template)

    return db_template


@router.get("/templates/{template_id}", response_model=ProduksjonsTemplate, tags=["produksjon-templates"])
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProduksjonsTemplate:
    """Get a specific production template."""
    result = await db.execute(
        select(TemplateModel).where(TemplateModel.template_id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template


@router.put("/templates/{template_id}", response_model=ProduksjonsTemplate, tags=["produksjon-templates"])
async def update_template(
    template_id: int,
    template_update: ProduksjonsTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProduksjonsTemplate:
    """Update a production template."""
    result = await db.execute(
        select(TemplateModel).where(TemplateModel.template_id == template_id)
    )
    db_template = result.scalar_one_or_none()

    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update template fields
    update_data = template_update.model_dump(exclude_unset=True, exclude={'detaljer'})
    for field, value in update_data.items():
        setattr(db_template, field, value)

    # Update detaljer if provided
    if template_update.detaljer is not None:
        # Delete old detaljer
        await db.execute(
            select(TemplateDetaljerModel).where(
                TemplateDetaljerModel.template_id == template_id
            ).delete()
        )

        # Create new detaljer
        for idx, detalj in enumerate(template_update.detaljer):
            db_detalj = TemplateDetaljerModel(
                template_id=template_id,
                produktid=detalj.produktid,
                kalkyleid=detalj.kalkyleid,
                standard_antall=detalj.standard_antall,
                maks_antall=detalj.maks_antall,
                paakrevd=detalj.paakrevd,
                linje_nummer=detalj.linje_nummer or idx,
            )
            db.add(db_detalj)

    await db.commit()
    await db.refresh(db_template)

    return db_template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["produksjon-templates"])
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a production template."""
    result = await db.execute(
        select(TemplateModel).where(TemplateModel.template_id == template_id)
    )
    db_template = result.scalar_one_or_none()

    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(db_template)
    await db.commit()


# ============================================================================
# Template Distribution (Phase 3)
# ============================================================================

@router.post("/templates/{template_id}/distribute", tags=["produksjon-templates"])
async def distribute_template(
    template_id: int,
    request: DistributeTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Distribute template to customers in kundegruppe 12."""
    # Get template
    result = await db.execute(
        select(TemplateModel).where(TemplateModel.template_id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get customers
    if request.kunde_ids:
        # Specific customers
        customer_query = select(Kunder).where(Kunder.kundeid.in_(request.kunde_ids))
    else:
        # All customers in kundegruppe
        customer_query = select(Kunder).where(Kunder.kundegruppe == template.kundegruppe)

    result = await db.execute(customer_query)
    customers = result.scalars().all()

    if not customers:
        raise HTTPException(status_code=404, detail="No customers found")

    # Get template details
    detaljer_result = await db.execute(
        select(TemplateDetaljerModel).where(
            TemplateDetaljerModel.template_id == template_id
        ).order_by(TemplateDetaljerModel.linje_nummer)
    )
    template_detaljer = detaljer_result.scalars().all()

    # Create production orders
    created_count = 0
    for customer in customers:
        # Create produksjon
        db_produksjon = ProduksjonsModel(
            template_id=template_id,
            kundeid=customer.kundeid,
            ansattid=current_user.ansattid if hasattr(current_user, 'ansattid') else 1,  # Default
            status='draft',
            opprettet_av=current_user.id,
            created=datetime.now(),
            oppdatert_dato=datetime.now(),
        )
        db.add(db_produksjon)
        await db.flush()

        # Copy template detaljer to produksjonsdetaljer
        for detalj in template_detaljer:
            db_proddetalj = ProduksjonsDetaljerModel(
                produksjonskode=db_produksjon.produksjonkode,
                produktid=detalj.produktid or 0,  # Required field
                kalkyleid=detalj.kalkyleid,
                antallporsjoner=detalj.standard_antall,
                linje_nummer=detalj.linje_nummer,
            )
            db.add(db_proddetalj)

        created_count += 1

    await db.commit()

    return {
        "message": f"Template distributed to {created_count} customers",
        "created_count": created_count,
        "template_id": template_id
    }


# ============================================================================
# Production Order Endpoints
# ============================================================================

@router.get("/orders", response_model=ProduksjonsListResponse, tags=["produksjon-orders"])
async def get_production_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    kundeid: Optional[int] = Query(None, description="Filter by customer"),
    template_id: Optional[int] = Query(None, description="Filter by template"),
) -> ProduksjonsListResponse:
    """Get all production orders with pagination."""
    query = select(ProduksjonsModel)
    count_query = select(func.count()).select_from(ProduksjonsModel)

    # Filters
    if status:
        query = query.where(ProduksjonsModel.status == status)
        count_query = count_query.where(ProduksjonsModel.status == status)

    if kundeid:
        query = query.where(ProduksjonsModel.kundeid == kundeid)
        count_query = count_query.where(ProduksjonsModel.kundeid == kundeid)

    if template_id:
        query = query.where(ProduksjonsModel.template_id == template_id)
        count_query = count_query.where(ProduksjonsModel.template_id == template_id)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(ProduksjonsModel.created.desc())
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return ProduksjonsListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/orders/{produksjonskode}", response_model=Produksjon, tags=["produksjon-orders"])
async def get_production_order(
    produksjonskode: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Produksjon:
    """Get a specific production order."""
    result = await db.execute(
        select(ProduksjonsModel).where(ProduksjonsModel.produksjonkode == produksjonskode)
    )
    produksjon = result.scalar_one_or_none()

    if not produksjon:
        raise HTTPException(status_code=404, detail="Production order not found")

    return produksjon


# ============================================================================
# Workflow Actions (Phase 5 & 6)
# ============================================================================

@router.post("/orders/{produksjonskode}/submit", tags=["produksjon-workflow"])
async def submit_production_order(
    produksjonskode: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit production order for approval."""
    result = await db.execute(
        select(ProduksjonsModel).where(ProduksjonsModel.produksjonkode == produksjonskode)
    )
    produksjon = result.scalar_one_or_none()

    if not produksjon:
        raise HTTPException(status_code=404, detail="Production order not found")

    if produksjon.status != 'draft':
        raise HTTPException(status_code=400, detail="Only draft orders can be submitted")

    produksjon.status = 'submitted'
    produksjon.innsendt_dato = datetime.now()
    produksjon.oppdatert_dato = datetime.now()

    await db.commit()

    return {"message": "Production order submitted", "produksjonskode": produksjonskode}


@router.post("/orders/approve", tags=["produksjon-workflow"])
async def approve_production_orders(
    request: ApproveProductionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve multiple production orders."""
    # Get all orders
    result = await db.execute(
        select(ProduksjonsModel).where(
            ProduksjonsModel.produksjonkode.in_(request.produksjonskode_list)
        )
    )
    orders = result.scalars().all()

    approved_count = 0
    for order in orders:
        if order.status == 'submitted':
            order.status = 'approved'
            order.godkjent_dato = datetime.now()
            order.godkjent_av = request.godkjent_av
            order.oppdatert_dato = datetime.now()
            approved_count += 1

    await db.commit()

    return {
        "message": f"Approved {approved_count} production orders",
        "approved_count": approved_count
    }


@router.post("/orders/{produksjonskode}/transfer-to-order", tags=["produksjon-workflow"])
async def transfer_production_to_order(
    produksjonskode: int,
    request: TransferToOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transfer approved production order to tblordrer (Phase 6)."""
    # Get produksjon
    result = await db.execute(
        select(ProduksjonsModel).where(ProduksjonsModel.produksjonkode == produksjonskode)
    )
    produksjon = result.scalar_one_or_none()

    if not produksjon:
        raise HTTPException(status_code=404, detail="Production order not found")

    if produksjon.status != 'approved':
        raise HTTPException(status_code=400, detail="Only approved orders can be transferred")

    if produksjon.ordre_id:
        raise HTTPException(status_code=400, detail="Already transferred to order")

    # Create ordre
    db_ordre = Ordrer(
        kundeid=produksjon.kundeid,
        ordredato=datetime.now(),
        leveringsdato=request.leveringsdato or produksjon.leveringsdato,
        informasjon=f"Overført fra produksjonsordre #{produksjonskode}",
    )
    db.add(db_ordre)
    await db.flush()

    # Copy produksjonsdetaljer to ordredetaljer
    detaljer_result = await db.execute(
        select(ProduksjonsDetaljerModel).where(
            ProduksjonsDetaljerModel.produksjonskode == produksjonskode
        )
    )
    detaljer = detaljer_result.scalars().all()

    for detalj in detaljer:
        db_ordredetalj = Ordredetaljer(
            ordreid=db_ordre.ordreid,
            produktid=detalj.produktid,
            antall=detalj.antallporsjoner,
            pris=detalj.pris,
            enhet=detalj.enh,
        )
        db.add(db_ordredetalj)

    # Update produksjon
    produksjon.ordre_id = db_ordre.ordreid
    produksjon.status = 'transferred'
    produksjon.overfort_dato = datetime.now()
    produksjon.overfort_av = current_user.id
    produksjon.oppdatert_dato = datetime.now()

    await db.commit()

    return {
        "message": "Production order transferred to order",
        "produksjonskode": produksjonskode,
        "ordreid": db_ordre.ordreid
    }
