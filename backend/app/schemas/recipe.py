from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class RecipeIngredientBase(BaseModel):
    product_id: int
    amount: float = Field(gt=0, description="Mengde i angitt enhet")
    unit: str = Field(min_length=1, max_length=50, description="Enhet (g, kg, dl, l, stk, etc.)")
    notes: Optional[str] = None

class RecipeIngredientCreate(RecipeIngredientBase):
    pass

class RecipeIngredientUpdate(RecipeIngredientBase):
    product_id: Optional[int] = None
    amount: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)

class RecipeIngredientResponse(RecipeIngredientBase):
    id: int
    product_name: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    fiber: Optional[float] = None
    salt: Optional[float] = None
    cost: Optional[float] = None

    class Config:
        from_attributes = True

class AllergenResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True

class RecipeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    portions: int = Field(gt=0, default=1)
    preparation_time: Optional[int] = Field(None, ge=0, description="Forberedelsestid i minutter")
    cooking_time: Optional[int] = Field(None, ge=0, description="Koketid i minutter")
    instructions: Optional[str] = None

class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate]

class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    portions: Optional[int] = Field(None, gt=0)
    preparation_time: Optional[int] = Field(None, ge=0)
    cooking_time: Optional[int] = Field(None, ge=0)
    instructions: Optional[str] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None

class RecipeResponse(RecipeBase):
    id: int
    version: int
    is_active: bool
    total_calories: Optional[float] = None
    total_protein: Optional[float] = None
    total_fat: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fiber: Optional[float] = None
    total_salt: Optional[float] = None
    total_cost: Optional[float] = None
    cost_per_portion: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    ingredients: List[RecipeIngredientResponse] = []
    allergens: List[AllergenResponse] = []
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class RecipeListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    portions: int
    preparation_time: Optional[int] = None
    cooking_time: Optional[int] = None
    total_calories: Optional[float] = None
    total_cost: Optional[float] = None
    allergens: List[AllergenResponse] = []
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class RecipeDuplicateRequest(BaseModel):
    new_name: str = Field(min_length=1, max_length=255)

class RecipeScaleRequest(BaseModel):
    new_portions: int = Field(gt=0)

class RecipeScaleResponse(BaseModel):
    recipe_id: int
    recipe_name: str
    original_portions: int
    new_portions: int
    scale_factor: float
    ingredients: List[dict]
    total_cost: Optional[float] = None
    cost_per_portion: Optional[float] = None

class NutritionResponse(BaseModel):
    calories: float
    protein: float
    fat: float
    carbs: float
    fiber: float
    salt: float
    calories_per_portion: float
    protein_per_portion: float
    fat_per_portion: float
    carbs_per_portion: float
    fiber_per_portion: float
    salt_per_portion: float

class CostResponse(BaseModel):
    total_cost: float
    cost_per_portion: float
    portions: int
    ingredient_costs: List[dict]

class RecipeSearchRequest(BaseModel):
    product_ids: List[int] = Field(min_items=1)

class RecipeVersionResponse(BaseModel):
    version_number: int
    created_at: Optional[str] = None
    created_by: Optional[int] = None
    changes_description: Optional[str] = None
    snapshot: Optional[dict] = None