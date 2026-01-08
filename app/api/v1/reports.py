"""API endpoints for report generation."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from app.api.deps import get_db
from app.models import Periode, PeriodeMeny, Meny, MenyProdukt, Kunder, Produkter

router = APIRouter()


def create_period_menu_pdf(period_data: dict, report_data: list) -> bytes:
    """Create a PDF report for period menu customers."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12
    )
    
    # Title
    elements.append(Paragraph("Kunde Meny Rapport", title_style))
    
    # Period information
    period_text = f"Uke {period_data['ukenr']} - {period_data['fradato']} til {period_data['tildato']}"
    elements.append(Paragraph(period_text, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Process each menu group
    for report in report_data:
        # Menu group header
        if report['menu_group']['gruppe']:
            elements.append(Paragraph(f"Menygruppe: {report['menu_group']['gruppe']}", heading_style))
        
        elements.append(Paragraph(f"Meny: {report['menu']['beskrivelse']}", styles['Heading3']))
        elements.append(Spacer(1, 12))
        
        # Customer table
        if report['customers']:
            elements.append(Paragraph("Kunder", styles['Heading3']))
            
            # Create customer table data
            customer_data = [['Navn', 'Adresse', 'Telefon', 'E-post']]
            for customer in report['customers']:
                address = customer['adresse'] or ''
                if customer['postnr'] and customer['sted']:
                    address += f"\n{customer['postnr']} {customer['sted']}"
                
                customer_data.append([
                    customer['kundenavn'],
                    address,
                    customer['telefonnummer'] or '',
                    customer['e_post'] or ''
                ])
            
            # Create customer table
            customer_table = Table(customer_data, colWidths=[5*cm, 6*cm, 3*cm, 5*cm])
            customer_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            elements.append(customer_table)
            elements.append(Spacer(1, 20))
        
        # Product table
        if report['products']:
            elements.append(Paragraph("Produkter", styles['Heading3']))
            
            # Create product table data
            product_data = [['Produkt', 'Enhet', 'Pris']]
            for product in report['products']:
                product_data.append([
                    product['produktnavn'],
                    product['enhet'] or '-',
                    f"kr {product['pris']:.2f}" if product['pris'] else '-'
                ])
            
            # Create product table
            product_table = Table(product_data, colWidths=[10*cm, 4*cm, 3*cm])
            product_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            
            elements.append(product_table)
        
        # Page break between menu groups
        elements.append(PageBreak())
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


@router.get("/period-menu-pdf")
async def generate_period_menu_pdf(
    periode_id: int,
    menu_group_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate PDF report for customers in a specific period."""
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
    
    if not periode_menyer:
        raise HTTPException(status_code=404, detail="No menus found for this period")
    
    # Build report data
    report_data = []
    
    for pm in periode_menyer:
        menu = pm.meny
        
        # Get customers for this menu group
        customer_query = select(Kunder).where(Kunder.menygruppeid == menu.menygruppe)
        customer_result = await db.execute(customer_query)
        customers = customer_result.scalars().all()
        
        # Get products for this menu
        products = []
        for mp in menu.meny_produkter:
            product = mp.produkt
            products.append({
                "produktid": product.produktid,
                "produktnavn": product.produktnavn,
                "enhet": product.pakningstype,
                "pris": float(product.pris) if product.pris else None
            })
        
        report_data.append({
            "menu_group": {
                "gruppeid": menu.gruppe.menygruppeid if menu.gruppe else None,
                "gruppe": menu.gruppe.beskrivelse if menu.gruppe else None
            },
            "customers": [{
                "kundeid": k.kundeid,
                "kundenavn": k.kundenavn,
                "adresse": k.adresse,
                "postnr": k.postnr,
                "sted": k.sted,
                "telefonnummer": k.telefonnummer,
                "e_post": k.e_post
            } for k in customers],
            "menu": {
                "menyid": menu.menyid,
                "beskrivelse": menu.beskrivelse
            },
            "products": products
        })
    
    # Create PDF
    period_data = {
        "ukenr": periode.ukenr,
        "fradato": periode.fradato.strftime("%d.%m.%Y") if periode.fradato else "",
        "tildato": periode.tildato.strftime("%d.%m.%Y") if periode.tildato else ""
    }
    
    pdf_content = create_period_menu_pdf(period_data, report_data)
    
    # Return PDF response
    filename = f"periode_{periode.ukenr}_meny_rapport.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )