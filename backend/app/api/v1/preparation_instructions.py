"""API endpoints for managing preparation instructions."""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException
import openai

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.preparation_instruction import PreparationInstruction
from app.schemas.preparation_instruction import (
    PreparationInstructionCreate,
    PreparationInstructionUpdate,
    PreparationInstructionResponse,
    PreparationInstructionListResponse,
    EnhanceInstructionRequest,
    EnhanceInstructionResponse,
)
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model=PreparationInstructionListResponse)
async def list_instructions(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent liste over tilberedningsinstruksjoner.

    Støtter filtrering på aktive instruksjoner og paginering.
    """
    query = select(PreparationInstruction)

    if active_only:
        query = query.where(PreparationInstruction.is_active == True)

    # Count total
    count_query = select(func.count()).select_from(PreparationInstruction)
    if active_only:
        count_query = count_query.where(PreparationInstruction.is_active == True)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get data with pagination
    query = query.order_by(PreparationInstruction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    instructions = result.scalars().all()

    return PreparationInstructionListResponse(
        items=[PreparationInstructionResponse.from_orm(i) for i in instructions],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{instruction_id}", response_model=PreparationInstructionResponse)
async def get_instruction(
    instruction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hent en spesifikk tilberedningsinstruksjon."""
    result = await db.execute(
        select(PreparationInstruction).where(PreparationInstruction.id == instruction_id)
    )
    instruction = result.scalar_one_or_none()

    if not instruction:
        raise HTTPException(status_code=404, detail="Instruksjon ikke funnet")

    return PreparationInstructionResponse.from_orm(instruction)


@router.post("/", response_model=PreparationInstructionResponse)
async def create_instruction(
    instruction_data: PreparationInstructionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Opprett en ny tilberedningsinstruksjon."""
    new_instruction = PreparationInstruction(
        text=instruction_data.text,
        is_active=instruction_data.is_active,
        ai_enhanced=instruction_data.ai_enhanced,
    )

    db.add(new_instruction)
    await db.commit()
    await db.refresh(new_instruction)

    return PreparationInstructionResponse.from_orm(new_instruction)


@router.put("/{instruction_id}", response_model=PreparationInstructionResponse)
async def update_instruction(
    instruction_id: int,
    instruction_data: PreparationInstructionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Oppdater en tilberedningsinstruksjon."""
    result = await db.execute(
        select(PreparationInstruction).where(PreparationInstruction.id == instruction_id)
    )
    instruction = result.scalar_one_or_none()

    if not instruction:
        raise HTTPException(status_code=404, detail="Instruksjon ikke funnet")

    if instruction_data.text is not None:
        instruction.text = instruction_data.text
    if instruction_data.is_active is not None:
        instruction.is_active = instruction_data.is_active
    if instruction_data.ai_enhanced is not None:
        instruction.ai_enhanced = instruction_data.ai_enhanced

    await db.commit()
    await db.refresh(instruction)

    return PreparationInstructionResponse.from_orm(instruction)


@router.delete("/{instruction_id}")
async def delete_instruction(
    instruction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Slett en tilberedningsinstruksjon.

    Faktisk deaktiverer instruksjonen ved å sette is_active = False.
    """
    result = await db.execute(
        select(PreparationInstruction).where(PreparationInstruction.id == instruction_id)
    )
    instruction = result.scalar_one_or_none()

    if not instruction:
        raise HTTPException(status_code=404, detail="Instruksjon ikke funnet")

    instruction.is_active = False
    await db.commit()

    return {"message": "Instruksjon deaktivert"}


@router.post("/enhance", response_model=EnhanceInstructionResponse)
async def enhance_instruction(
    request: EnhanceInstructionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bruk AI til å evaluere og forbedre en tilberedningsinstruksjon.

    AI vil vurdere instruksjonen og gjøre den klarere, mer presis og lettere å forstå.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key ikke konfigurert. Kan ikke bruke AI-funksjonen."
        )

    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        system_prompt = """Du er en ekspert på matvaresikkerhet og tilberedning av mat i storkjøkken.

KONTEKST: Dette er tilberedningsinstruksjoner som skal skrives på matvareetiketter i et cateringsystem.
Instruksjonene vil bli brukt av kjøkkenpersonale og serveres til kunder i kantiner, skoler og institusjoner.

Din oppgave er å forbedre tilberedningsinstruksjoner slik at de blir:
1. Klare og presise - enkelt å følge i et travelt storkjøkken
2. Inkluderer spesifikke temperaturer når relevant (viktig for matvaresikkerhet)
3. Inkluderer tidsangivelser når relevant
4. Kortfattet men informativt (maks 1-2 setninger)
5. Profesjonelt språk på norsk bokmål
6. Følger norske retningslinjer for matvaresikkerhet

VIKTIG: Instruksjonen skal passe på en etikett, så hold den kort og konsis.

Gi også en kort begrunnelse for endringene dine."""

        user_prompt = f"""Vurder og forbedre denne tilberedningsinstruksjonen for en matetikett:

ORIGINAL INSTRUKSJON: "{request.text}"

Vurder om instruksjonen:
- Er tydelig nok for kjøkkenpersonale
- Mangler viktig sikkerhetsinformasjon (temperatur, tid)
- Kan forkortes eller forenkles
- Har riktig profesjonelt språk

Gi svaret på følgende format:
FORBEDRET TEKST: [den forbedrede instruksjonen - maks 1-2 setninger]
BEGRUNNELSE: [kort forklaring på hva som ble endret og hvorfor]"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
        )

        ai_response = response.choices[0].message.content

        # Parse the response
        enhanced_text = request.text
        reasoning = "AI kunne ikke generere en forbedret versjon"

        if "FORBEDRET TEKST:" in ai_response and "BEGRUNNELSE:" in ai_response:
            parts = ai_response.split("BEGRUNNELSE:")
            enhanced_part = parts[0].replace("FORBEDRET TEKST:", "").strip()
            reasoning_part = parts[1].strip()

            enhanced_text = enhanced_part
            reasoning = reasoning_part

        return EnhanceInstructionResponse(
            original_text=request.text,
            enhanced_text=enhanced_text,
            reasoning=reasoning,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunne ikke bruke AI: {str(e)}"
        )
