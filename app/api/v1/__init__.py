"""API v1 endpoints."""
from fastapi import APIRouter

from app.api.v1 import (
    produkter, kunder, ordrer, ansatte, leverandorer, kategorier,
    asko_ny, meny, oppskrifter, kunde_gruppe, periode, periode_meny, meny_produkt,
    menu_management, reports, matinfo, product_search, stats, combined_dishes,
    preparation_instructions, ean_management, label_templates, labels, feedback
)
from app.api.v1.endpoints import matinfo_sync, matinfo_tracker, ngdata_sync, vetduat_sync, hybrid_sync

api_router = APIRouter()

# Include all routers (sorted alphabetically by prefix)
api_router.include_router(ansatte.router, prefix="/ansatte", tags=["ansatte"])
api_router.include_router(asko_ny.router, prefix="/asko-ny-produkter", tags=["asko-ny-produkter"])
api_router.include_router(combined_dishes.router, prefix="/combined-dishes", tags=["combined-dishes"])
api_router.include_router(ean_management.router, prefix="/ean-management", tags=["ean-management"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
api_router.include_router(hybrid_sync.router, prefix="/hybrid-sync", tags=["hybrid-sync"])
api_router.include_router(kategorier.router, prefix="/kategorier", tags=["kategorier"])
api_router.include_router(label_templates.router, prefix="/label-templates", tags=["label-templates"])
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])
api_router.include_router(kunder.router, prefix="/kunder", tags=["kunder"])
api_router.include_router(kunde_gruppe.router, prefix="/kunde-gruppe", tags=["kunde-gruppe"])
api_router.include_router(leverandorer.router, prefix="/leverandorer", tags=["leverandorer"])
api_router.include_router(matinfo_sync.router, prefix="/matinfo", tags=["matinfo-sync"])
api_router.include_router(matinfo_tracker.router, prefix="/matinfo", tags=["matinfo-tracker"])
api_router.include_router(menu_management.router, prefix="/menu-management", tags=["menu-management"])
api_router.include_router(meny.router, prefix="/meny", tags=["meny"])
api_router.include_router(meny_produkt.router, prefix="/meny-produkt", tags=["meny-produkt"])
api_router.include_router(ngdata_sync.router, prefix="/ngdata", tags=["ngdata-sync"])
api_router.include_router(oppskrifter.router, prefix="/oppskrifter", tags=["oppskrifter"])
api_router.include_router(ordrer.router, prefix="/ordrer", tags=["ordrer"])
api_router.include_router(periode.router, prefix="/periode", tags=["periode"])
api_router.include_router(periode_meny.router, prefix="/periode-meny", tags=["periode-meny"])
api_router.include_router(preparation_instructions.router, prefix="/preparation-instructions", tags=["preparation-instructions"])
api_router.include_router(produkter.router, prefix="/produkter", tags=["produkter"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(vetduat_sync.router, prefix="/vetduat", tags=["vetduat-sync"])
api_router.include_router(matinfo.router, tags=["matinfo-products"])
api_router.include_router(product_search.router, tags=["product-search"])
