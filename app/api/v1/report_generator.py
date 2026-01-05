"""Report generator API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.report_service import ReportService
from app.graphql.resolvers import get_ordre, get_kunder

router = APIRouter()


@router.get("/ordre-bekreftelse/{ordre_id}")
async def generate_order_confirmation_pdf(
    ordre_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate order confirmation PDF.

    Args:
        ordre_id: Order ID
        db: Database session
        current_user: Authenticated user

    Returns:
        PDF file download
    """
    # Fetch order data via GraphQL resolver
    ordre = await get_ordre(ordre_id, db)

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    # Prepare data for HTML template
    data = {
        "ordrenummer": ordre.ordreid,
        "ordredato": ordre.ordredato.strftime("%d.%m.%Y") if ordre.ordredato else "",
        "leveringsdato": ordre.leveringsdato.strftime("%d.%m.%Y") if ordre.leveringsdato else "",
        "kunde": {
            "navn": ordre.kunde.kundenavn,
            "adresse": ordre.kunde.adresse or "",
            "postnr": ordre.kunde.postnr or "",
            "sted": ordre.kunde.sted or "",
        },
        "produkter": [
            {
                "navn": p.produktnavn,
                "antall": p.antall,
                "enhet": p.enhet or "stk",
                "pris": f"{p.pris:.2f}",
                "sum": f"{(p.antall * p.pris):.2f}"
            }
            for p in ordre.produkter
        ],
        "totalsum": f"{ordre.totalsum:.2f}",
        "informasjon": ordre.informasjon or "",
        "generert_dato": datetime.now().strftime("%d.%m.%Y %H:%M")
    }

    # Generate PDF using ReportLab
    report_service = ReportService()
    pdf_bytes = await report_service.generate_order_confirmation_pdf(data)

    # Return PDF
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=ordre_{ordre_id}.pdf"
        }
    )


@router.get("/leveringsseddel/{ordre_id}")
async def generate_delivery_note_pdf(
    ordre_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate delivery note PDF.

    Args:
        ordre_id: Order ID
        db: Database session
        current_user: Authenticated user

    Returns:
        PDF file download
    """
    # Fetch order data
    ordre = await get_ordre(ordre_id, db)

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    # Prepare data
    data = {
        "ordrenummer": ordre.ordreid,
        "leveringsdato": ordre.leveringsdato.strftime("%d.%m.%Y") if ordre.leveringsdato else "",
        "kunde": {
            "navn": ordre.kunde.kundenavn,
            "adresse": ordre.kunde.adresse or "",
            "postnr": ordre.kunde.postnr or "",
            "sted": ordre.kunde.sted or "",
        },
        "produkter": [
            {
                "navn": p.produktnavn,
                "antall": p.antall,
                "enhet": p.enhet or "stk"
            }
            for p in ordre.produkter
        ],
        "generert_dato": datetime.now().strftime("%d.%m.%Y %H:%M")
    }

    # Generate PDF using ReportLab
    report_service = ReportService()
    pdf_bytes = await report_service.generate_delivery_note_pdf(data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=leveringsseddel_{ordre_id}.pdf"
        }
    )


@router.get("/kundeliste-excel")
async def generate_customer_list_excel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 1000
):
    """
    Generate customer list as Excel file.

    Args:
        db: Database session
        current_user: Authenticated user
        limit: Maximum number of customers to export

    Returns:
        Excel file download
    """
    # Fetch customers via GraphQL resolver
    kunder = await get_kunder(db, limit=limit)

    # Prepare headers and rows for Excel
    headers = ["Kundenavn", "Adresse", "Postnr", "Sted", "Telefon", "E-post"]

    rows = [
        [
            k.kundenavn,
            k.adresse or "",
            k.postnr or "",
            k.sted or "",
            k.telefonnummer or "",
            k.e_post or ""
        ]
        for k in kunder
    ]

    # Generate Excel
    report_service = ReportService()
    excel_bytes = await report_service.generate_simple_excel(
        headers=headers,
        rows=rows,
        sheet_name="Kundeliste"
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=kundeliste.xlsx"
        }
    )
