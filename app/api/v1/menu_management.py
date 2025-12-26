"""API endpoints for comprehensive menu management."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models import (
    Periode, PeriodeMeny, Meny, MenyProdukt, 
    Produkter, Kunder, Menygruppe
)
from pydantic import BaseModel

router = APIRouter()


class MenuPeriodSummary(BaseModel):
    """Summary of menus for a period."""
    periode: dict
    menus: List[dict]
    total_products: int
    customer_groups: List[dict]
    
    class Config:
        from_attributes = True


class CustomerMenuReport(BaseModel):
    """Report data for customers in a period."""
    period_start: datetime
    period_end: datetime
    menu_group: dict
    customers: List[dict]
    menu: dict
    products: List[dict]
    
    class Config:
        from_attributes = True


@router.get("/period-overview", response_model=List[MenuPeriodSummary])
async def get_period_overview(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    weeks_ahead: int = 4,
    db: AsyncSession = Depends(get_db)
):
    """Get overview of menu periods with associated data."""
    if not from_date:
        from_date = datetime.now()
    if not to_date:
        to_date = from_date + timedelta(weeks=weeks_ahead)
    
    # Get periods in date range
    periode_query = select(Periode).options(
        selectinload(Periode.periode_menyer).selectinload(PeriodeMeny.meny).options(
            selectinload(Meny.meny_produkter).selectinload(MenyProdukt.produkt),
            selectinload(Meny.gruppe)
        )
    ).where(
        and_(
            Periode.fradato <= to_date,
            Periode.tildato >= from_date
        )
    ).order_by(Periode.fradato)
    
    result = await db.execute(periode_query)
    perioder = result.scalars().all()

    # Collect all menu group IDs across all periods for batch query
    all_menu_group_ids = set()
    for periode in perioder:
        for pm in periode.periode_menyer:
            if pm.meny and pm.meny.gruppe:
                all_menu_group_ids.add(pm.meny.gruppe.gruppeid)

    # Batch query: Get customer counts for all menu groups in one query
    customer_counts = {}
    if all_menu_group_ids:
        customer_count_query = select(
            Kunder.menygruppeid,
            func.count(Kunder.kundeid)
        ).where(
            Kunder.menygruppeid.in_(all_menu_group_ids)
        ).group_by(Kunder.menygruppeid)
        customer_count_result = await db.execute(customer_count_query)
        for gruppe_id, count in customer_count_result.all():
            customer_counts[gruppe_id] = count

    summaries = []
    for periode in perioder:
        # Collect all menus and products for this period
        all_menus = []
        all_products = set()
        menu_groups = set()

        for pm in periode.periode_menyer:
            menu = pm.meny
            menu_dict = {
                "menyid": menu.menyid,
                "beskrivelse": menu.beskrivelse,
                "menygruppe": menu.menygruppe,
                "product_count": len(menu.meny_produkter)
            }
            all_menus.append(menu_dict)

            if menu.gruppe:
                menu_groups.add((menu.gruppe.gruppeid, menu.gruppe.gruppe))

            for mp in menu.meny_produkter:
                all_products.add(mp.produktid)

        # Build customer group data from cached counts
        customer_group_data = []
        for gruppe_id, gruppe_navn in menu_groups:
            customer_group_data.append({
                "gruppeid": gruppe_id,
                "gruppe": gruppe_navn,
                "customer_count": customer_counts.get(gruppe_id, 0)
            })

        summary = MenuPeriodSummary(
            periode={
                "menyperiodeid": periode.menyperiodeid,
                "ukenr": periode.ukenr,
                "fradato": periode.fradato,
                "tildato": periode.tildato
            },
            menus=all_menus,
            total_products=len(all_products),
            customer_groups=customer_group_data
        )
        summaries.append(summary)

    return summaries


@router.get("/customer-period-report", response_model=List[CustomerMenuReport])
async def get_customer_period_report(
    periode_id: int,
    menu_group_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate customer report for a specific period."""
    # Get the period
    periode_query = select(Periode).where(Periode.menyperiodeid == periode_id)
    periode_result = await db.execute(periode_query)
    periode = periode_result.scalar_one_or_none()
    
    if not periode:
        raise HTTPException(status_code=404, detail="Period not found")
    
    # Get all menus for this period
    periode_meny_query = select(PeriodeMeny).options(
        selectinload(PeriodeMeny.meny).options(
            selectinload(Meny.meny_produkter).selectinload(MenyProdukt.produkt),
            selectinload(Meny.gruppe)
        )
    ).where(PeriodeMeny.periodeid == periode_id)
    
    if menu_group_id:
        periode_meny_query = periode_meny_query.join(Meny).where(Meny.menygruppe == menu_group_id)
    
    periode_meny_result = await db.execute(periode_meny_query)
    periode_menyer = periode_meny_result.scalars().all()

    # Collect all menu group IDs for batch customer query
    menu_group_ids = set()
    for pm in periode_menyer:
        if pm.meny and pm.meny.menygruppe:
            menu_group_ids.add(pm.meny.menygruppe)

    # Batch query: Get all customers for all menu groups in one query
    customers_by_group = {}
    if menu_group_ids:
        customers_query = select(Kunder).where(Kunder.menygruppeid.in_(menu_group_ids))
        customers_result = await db.execute(customers_query)
        all_customers = customers_result.scalars().all()
        for customer in all_customers:
            if customer.menygruppeid not in customers_by_group:
                customers_by_group[customer.menygruppeid] = []
            customers_by_group[customer.menygruppeid].append(customer)

    reports = []

    for pm in periode_menyer:
        menu = pm.meny

        # Get customers from cached data
        customers = customers_by_group.get(menu.menygruppe, [])

        # Get products for this menu
        products = []
        for mp in menu.meny_produkter:
            product = mp.produkt
            products.append({
                "produktid": product.produktid,
                "produktnavn": product.produktnavn,
                "enhet": product.pakningstype,
                "pris": product.pris
            })

        report = CustomerMenuReport(
            period_start=periode.fradato,
            period_end=periode.tildato,
            menu_group={
                "gruppeid": menu.gruppe.gruppeid if menu.gruppe else None,
                "gruppe": menu.gruppe.gruppe if menu.gruppe else None
            },
            customers=[{
                "kundeid": k.kundeid,
                "kundenavn": k.kundenavn,
                "adresse": k.adresse,
                "postnr": k.postnr,
                "sted": k.sted,
                "telefonnummer": k.telefonnummer,
                "e_post": k.e_post
            } for k in customers],
            menu={
                "menyid": menu.menyid,
                "beskrivelse": menu.beskrivelse
            },
            products=products
        )
        reports.append(report)

    return reports


@router.post("/assign-menu-to-period")
async def assign_menu_to_period(
    periode_id: int,
    meny_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Assign a menu to a period."""
    # Check if periode exists
    periode_query = select(Periode).where(Periode.menyperiodeid == periode_id)
    periode_result = await db.execute(periode_query)
    if not periode_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Period not found")
    
    # Check if meny exists
    meny_query = select(Meny).where(Meny.menyid == meny_id)
    meny_result = await db.execute(meny_query)
    if not meny_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Menu not found")
    
    # Check if assignment already exists
    existing_query = select(PeriodeMeny).where(
        and_(
            PeriodeMeny.periodeid == periode_id,
            PeriodeMeny.menyid == meny_id
        )
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Menu already assigned to this period")
    
    # Create assignment
    periode_meny = PeriodeMeny(periodeid=periode_id, menyid=meny_id)
    db.add(periode_meny)
    await db.commit()
    
    return {"message": "Menu assigned to period successfully"}


@router.post("/clone-period-menus")
async def clone_period_menus(
    source_periode_id: int,
    target_periode_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Clone all menu assignments from one period to another."""
    # Get source period menus
    source_query = select(PeriodeMeny).where(PeriodeMeny.periodeid == source_periode_id)
    source_result = await db.execute(source_query)
    source_menus = source_result.scalars().all()
    
    if not source_menus:
        raise HTTPException(status_code=404, detail="No menus found in source period")
    
    # Check target period exists
    target_query = select(Periode).where(Periode.menyperiodeid == target_periode_id)
    target_result = await db.execute(target_query)
    if not target_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target period not found")
    
    # Batch query: Get all existing menu IDs in target period in one query
    source_meny_ids = [sm.menyid for sm in source_menus]
    existing_query = select(PeriodeMeny.menyid).where(
        and_(
            PeriodeMeny.periodeid == target_periode_id,
            PeriodeMeny.menyid.in_(source_meny_ids)
        )
    )
    existing_result = await db.execute(existing_query)
    existing_meny_ids = set(row[0] for row in existing_result.all())

    # Clone menu assignments that don't already exist
    cloned = 0
    for sm in source_menus:
        if sm.menyid not in existing_meny_ids:
            new_pm = PeriodeMeny(periodeid=target_periode_id, menyid=sm.menyid)
            db.add(new_pm)
            cloned += 1

    await db.commit()
    
    return {
        "message": f"Cloned {cloned} menu assignments",
        "source_periode_id": source_periode_id,
        "target_periode_id": target_periode_id
    }