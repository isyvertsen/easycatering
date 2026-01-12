"""Employee API endpoints."""
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.ansatte import Ansatte as AnsatteModel
from app.schemas.ansatte import Ansatte, AnsatteCreate, AnsatteUpdate

router = APIRouter()


@router.get("/", response_model=List[Ansatte])
async def get_ansatte(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    aktiv: Optional[bool] = Query(True, description="Filter by active status"),
    avdeling: Optional[str] = Query(None, description="Filter by department"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
) -> List[Ansatte]:
    """Get all employees."""
    query = select(AnsatteModel)

    # Filter by active status
    if aktiv is not None:
        if aktiv:
            query = query.where(
                or_(AnsatteModel.sluttet == False, AnsatteModel.sluttet == None)
            )
        else:
            query = query.where(AnsatteModel.sluttet == True)

    # Filter by department
    if avdeling:
        query = query.where(AnsatteModel.avdeling == avdeling)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                AnsatteModel.fornavn.ilike(search_term),
                AnsatteModel.etternavn.ilike(search_term),
                AnsatteModel.e_postjobb.ilike(search_term),
                AnsatteModel.tlfprivat.ilike(search_term),
                AnsatteModel.tittel.ilike(search_term),
                AnsatteModel.avdeling.ilike(search_term),
            )
        )

    query = query.order_by(AnsatteModel.etternavn, AnsatteModel.fornavn).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{ansatt_id}", response_model=Ansatte)
async def get_ansatt(
    ansatt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ansatte:
    """Get an employee by ID."""
    result = await db.execute(
        select(AnsatteModel).where(AnsatteModel.ansattid == ansatt_id)
    )
    ansatt = result.scalar_one_or_none()
    
    if not ansatt:
        raise HTTPException(status_code=404, detail="Ansatt ikke funnet")
    
    return ansatt


@router.post("/", response_model=Ansatte)
async def create_ansatt(
    ansatt_data: AnsatteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ansatte:
    """Create a new employee."""
    ansatt = AnsatteModel(**ansatt_data.model_dump())
    db.add(ansatt)
    await db.commit()
    await db.refresh(ansatt)
    return ansatt


@router.put("/{ansatt_id}", response_model=Ansatte)
async def update_ansatt(
    ansatt_id: int,
    ansatt_data: AnsatteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ansatte:
    """Update an employee."""
    result = await db.execute(
        select(AnsatteModel).where(AnsatteModel.ansattid == ansatt_id)
    )
    ansatt = result.scalar_one_or_none()
    
    if not ansatt:
        raise HTTPException(status_code=404, detail="Ansatt ikke funnet")
    
    update_data = ansatt_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ansatt, field, value)
    
    await db.commit()
    await db.refresh(ansatt)
    return ansatt


@router.delete("/{ansatt_id}")
async def delete_ansatt(
    ansatt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an employee (soft delete by setting sluttet=True)."""
    result = await db.execute(
        select(AnsatteModel).where(AnsatteModel.ansattid == ansatt_id)
    )
    ansatt = result.scalar_one_or_none()
    
    if not ansatt:
        raise HTTPException(status_code=404, detail="Ansatt ikke funnet")
    
    ansatt.sluttet = True
    await db.commit()
    
    return {"message": "Ansatt deaktivert"}