# D:/SWP391/SWP391/ai_service/api/ingredient_lookup.py
from fastapi import APIRouter, Depends

from core.security import verify_internal_api_key
from schemas.ingredient_lookup import IngredientLookupRequest, IngredientLookupResponse
from services.ingredient_lookup import lookup_ingredient

router = APIRouter(
    prefix="/ingredient-lookups",
    tags=["Ingredient Lookup"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.post("", response_model=IngredientLookupResponse)
async def create_ingredient_lookup(
    body: IngredientLookupRequest,
) -> IngredientLookupResponse:
    """Return ingredient information for backend validation and persistence."""
    return IngredientLookupResponse(data=await lookup_ingredient(body))
