"""Label PDF generation API endpoints."""
import base64
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.label_template_service import label_template_service
from app.services.pdfme_generator import get_pdfme_generator
from app.schemas.label_template import (
    PreviewLabelRequest, GenerateLabelRequest, BatchGenerateRequest,
)

router = APIRouter()


@router.post("/preview")
async def preview_label(
    request: PreviewLabelRequest,
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """
    Generate a label preview.

    Returns the PDF as a base64-encoded string for display in the frontend.
    """
    try:
        generator = get_pdfme_generator()
        pdf_bytes = generator.generate_pdf(
            template_json=request.template_json,
            inputs=request.inputs,
            width_mm=request.width_mm,
            height_mm=request.height_mm
        )

        # Encode as base64 for frontend preview
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        return {"preview": pdf_base64, "content_type": "application/pdf"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kunne ikke generere forhåndsvisning: {str(e)}")


@router.post("/generate")
async def generate_label(
    request: GenerateLabelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Generate a label PDF for printing.

    Returns the PDF as binary data with correct content type.
    """
    # Get template
    template = await label_template_service.get_template(
        db=db,
        template_id=request.template_id,
        user_id=current_user.id
    )

    if not template:
        raise HTTPException(status_code=404, detail="Mal ikke funnet")

    try:
        generator = get_pdfme_generator()

        # Generate multiple copies if requested
        if request.copies > 1:
            inputs_list = [request.inputs] * request.copies
            pdf_bytes = generator.generate_pdf_batch(
                template_json=template.template_json,
                inputs_list=inputs_list,
                width_mm=float(template.width_mm),
                height_mm=float(template.height_mm)
            )
        else:
            pdf_bytes = generator.generate_pdf(
                template_json=template.template_json,
                inputs=request.inputs,
                width_mm=float(template.width_mm),
                height_mm=float(template.height_mm)
            )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{template.name}.pdf"'
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kunne ikke generere PDF: {str(e)}")


@router.post("/batch")
async def generate_batch_labels(
    request: BatchGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Generate multiple labels in a single PDF.

    Each input dictionary generates one label page.
    """
    # Get template
    template = await label_template_service.get_template(
        db=db,
        template_id=request.template_id,
        user_id=current_user.id
    )

    if not template:
        raise HTTPException(status_code=404, detail="Mal ikke funnet")

    if not request.inputs_list:
        raise HTTPException(status_code=400, detail="Ingen data å skrive ut")

    try:
        generator = get_pdfme_generator()
        pdf_bytes = generator.generate_pdf_batch(
            template_json=template.template_json,
            inputs_list=request.inputs_list,
            width_mm=float(template.width_mm),
            height_mm=float(template.height_mm)
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{template.name}_batch.pdf"'
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kunne ikke generere batch PDF: {str(e)}")


@router.post("/preview-template")
async def preview_template_with_test_data(
    template_id: int,
    test_inputs: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Preview a saved template with test data.

    Useful for testing templates in the designer.
    """
    template = await label_template_service.get_template(
        db=db,
        template_id=template_id,
        user_id=current_user.id
    )

    if not template:
        raise HTTPException(status_code=404, detail="Mal ikke funnet")

    try:
        generator = get_pdfme_generator()
        pdf_bytes = generator.generate_pdf(
            template_json=template.template_json,
            inputs=test_inputs,
            width_mm=float(template.width_mm),
            height_mm=float(template.height_mm)
        )

        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        return {"preview": pdf_base64, "content_type": "application/pdf"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kunne ikke generere forhåndsvisning: {str(e)}")
