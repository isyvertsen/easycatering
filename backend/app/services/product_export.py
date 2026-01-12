"""Service for exporting products for RAG system."""
import json
import os
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.matinfo_products import MatinfoProduct
import logging
import zipfile
import tempfile

logger = logging.getLogger(__name__)

class ProductExporter:
    """Exports products in a format optimized for RAG systems."""
    
    def __init__(self, export_dir: str = "exportcatalog"):
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(exist_ok=True)
        
        # Optimize for chunk size 768 with overlap 20
        # Each product entry should be self-contained for better search
        # We'll batch products to create files around 50-100KB for efficient processing
        self.products_per_file = 100  # Adjust based on average product size
        self.chunk_size = 768
        self.overlap = 20
    
    def format_product_for_rag(self, product: MatinfoProduct) -> Dict[str, Any]:
        """Format a product optimized for RAG search."""
        # Create a search-optimized format with all key information
        # Keep it concise but complete for better chunking
        base_url = "http://localhost:3000"  # Frontend URL
        
        return {
            "gtin": product.gtin,
            "name": product.name,
            "producer": product.producername,
            "ingredients": product.ingredientstatement,
            # Add searchable metadata
            "search_text": self._create_search_text(product),
            "metadata": {
                "brand": product.brandname,
                "item_number": product.itemnumber,
                "provider": product.providername
            },
            # Add direct product links
            "links": {
                "view": f"{base_url}/products/search?gtin={product.gtin}",
                "api": f"http://localhost:8000/api/v1/products/{product.gtin}"
            }
        }
    
    def _create_search_text(self, product: MatinfoProduct) -> str:
        """Create optimized search text for RAG."""
        # Combine key fields into a single searchable text
        # This helps RAG systems find products more effectively
        parts = []
        
        if product.name:
            parts.append(f"Produkt: {product.name}")
        
        if product.brandname:
            parts.append(f"Merke: {product.brandname}")
            
        if product.producername:
            parts.append(f"Produsent: {product.producername}")
            
        if product.ingredientstatement:
            # Clean and format ingredients for better search
            ingredients = product.ingredientstatement.replace("<b>", "").replace("</b>", "")
            parts.append(f"Ingredienser: {ingredients}")
        
        # Join with delimiter that won't interfere with chunking
        return " | ".join(parts)
    
    def create_markdown_format(self, products: List[Dict[str, Any]]) -> str:
        """Create markdown format optimized for RAG chunking."""
        # Use markdown format for better structure recognition
        content = []
        
        for product in products:
            # Each product is a self-contained section
            content.append(f"## {product['name']}")
            content.append(f"**GTIN:** [{product['gtin']}]({product['links']['view']})")
            content.append(f"**Produsent:** {product['producer'] or 'Ukjent'}")
            
            if product['ingredients']:
                # Clean HTML from ingredients
                ingredients = product['ingredients'].replace("<b>", "**").replace("</b>", "**")
                content.append(f"**Ingredienser:** {ingredients}")
            
            if product['metadata']['brand']:
                content.append(f"**Merke:** {product['metadata']['brand']}")
            
            # Add product links
            content.append(f"\n**Se produkt:** [Åpne i systemet]({product['links']['view']})")
            
            # Add separator for clear boundaries
            content.append("\n---\n")
        
        return "\n".join(content)
    
    def create_jsonl_format(self, products: List[Dict[str, Any]]) -> str:
        """Create JSONL format for structured processing."""
        # JSONL allows each line to be processed independently
        lines = []
        for product in products:
            # Compact format for efficient storage
            lines.append(json.dumps(product, ensure_ascii=False))
        return "\n".join(lines)
    
    async def export_products(self, session: AsyncSession, format: str = "jsonl") -> Dict[str, Any]:
        """Export all products to files optimized for RAG.
        
        Args:
            session: Database session
            format: Export format - 'json', 'jsonl', or 'markdown'
        """
        try:
            # Get total count
            count_result = await session.execute(select(func.count()).select_from(MatinfoProduct))
            total_count = count_result.scalar()
            
            if total_count == 0:
                return {
                    "success": True,
                    "message": "No products to export",
                    "files_created": 0,
                    "total_products": 0
                }
            
            # Create timestamp for this export
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            export_subdir = self.export_dir / timestamp
            export_subdir.mkdir(exist_ok=True)
            
            # Export in batches
            files_created = 0
            products_exported = 0
            offset = 0
            
            # For JSON format, collect all products first
            if format == "json":
                all_products = []
                stmt = select(MatinfoProduct).order_by(MatinfoProduct.gtin)
                result = await session.execute(stmt)
                products = result.scalars().all()
                
                for product in products:
                    all_products.append(self.format_product_for_rag(product))
                
                # Write single JSON file
                json_filename = export_subdir / "products.json"
                with open(json_filename, 'w', encoding='utf-8') as f:
                    json.dump(all_products, f, ensure_ascii=False, indent=2)
                
                files_created = 1
                products_exported = len(products)
                logger.info(f"Exported all {products_exported} products to JSON")
            
            # For Markdown format, one file per product
            elif format == "markdown":
                stmt = select(MatinfoProduct).order_by(MatinfoProduct.gtin)
                result = await session.execute(stmt)
                products = result.scalars().all()
                
                for idx, product in enumerate(products, 1):
                    formatted_product = self.format_product_for_rag(product)
                    
                    # Create markdown content for single product
                    md_content = self.create_markdown_format([formatted_product])
                    
                    # Use GTIN as filename, or index if GTIN not available
                    filename = f"{product.gtin or f'product_{idx:06d}'}.md"
                    md_filename = export_subdir / filename
                    
                    with open(md_filename, 'w', encoding='utf-8') as f:
                        f.write(md_content)
                    
                    files_created += 1
                    products_exported += 1
                
                logger.info(f"Exported {products_exported} products to Markdown files")
            
            # Default JSONL format (existing behavior)
            else:
                while offset < total_count:
                    # Get batch of products
                    stmt = (
                        select(MatinfoProduct)
                        .offset(offset)
                        .limit(self.products_per_file)
                        .order_by(MatinfoProduct.gtin)
                    )
                    result = await session.execute(stmt)
                    products = result.scalars().all()
                    
                    if not products:
                        break
                    
                    # Format products
                    formatted_products = [
                        self.format_product_for_rag(product) 
                        for product in products
                    ]
                    
                    # Create file number with padding for proper sorting
                    file_num = (offset // self.products_per_file) + 1
                    
                    # Export JSONL format for RAG processing
                    jsonl_filename = export_subdir / f"products_{file_num:04d}.jsonl"
                    with open(jsonl_filename, 'w', encoding='utf-8') as f:
                        f.write(self.create_jsonl_format(formatted_products))
                    
                    files_created += 1
                    products_exported += len(products)
                    offset += self.products_per_file
                    
                    logger.info(f"Exported batch {file_num}: {len(products)} products")
            
            # Create metadata file
            metadata = {
                "export_timestamp": timestamp,
                "total_products": total_count,
                "products_exported": products_exported,
                "files_created": files_created,
                "products_per_file": self.products_per_file if format == "jsonl" else 1,
                "chunk_size": self.chunk_size,
                "overlap": self.overlap,
                "format": format,
                "schema": {
                    "gtin": "Product GTIN/EAN code",
                    "name": "Product name",
                    "producer": "Producer/manufacturer name",
                    "ingredients": "Ingredient statement",
                    "search_text": "Optimized search text for RAG",
                    "metadata": "Additional product metadata",
                    "links": "Direct links to view product in system"
                }
            }
            
            metadata_file = export_subdir / "export_metadata.json"
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            # Create a README for the export
            format_description = {
                "jsonl": "JSONL files (100 products per file)",
                "json": "Single JSON file containing all products",
                "markdown": "Individual Markdown files (one per product)"
            }
            
            readme_content = f"""# Product Export for RAG System

Export Date: {timestamp}
Total Products: {total_count}
Files Created: {files_created} {format_description.get(format, format)} 
Export Format: {format.upper()}

## File Format

"""
            
            if format == "jsonl":
                readme_content += """### JSONL Files (.jsonl)
Machine-readable format where each line contains a complete product record.
Optimized for RAG system processing with structured data for consistent embeddings.
Each file contains up to 100 products for efficient batch processing.
"""
            elif format == "json":
                readme_content += """### JSON File (products.json)
Single JSON file containing all products in an array format.
Structured data with all product information in one convenient file.
"""
            elif format == "markdown":
                readme_content += """### Markdown Files (.md)
Individual markdown file for each product.
Human-readable format with structured sections.
File names use product GTIN codes for easy identification.
"""
            
            readme_content += f"""
## Usage with RAG Systems

These files are optimized for chunk size {self.chunk_size} with overlap {self.overlap}.
Each product entry is self-contained to ensure complete information is preserved
during chunking.

## Search Optimization

The 'search_text' field combines key product information
for improved search accuracy in Norwegian language.
"""
            
            readme_file = export_subdir / "README.md"
            with open(readme_file, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            # Create RAG context files
            self._create_rag_context_files(export_subdir, format, total_count)
            
            return {
                "success": True,
                "message": f"Export completed successfully",
                "export_path": str(export_subdir),
                "files_created": files_created,
                "total_products": products_exported,
                "timestamp": timestamp
            }
            
        except Exception as e:
            logger.error(f"Export failed: {str(e)}")
            return {
                "success": False,
                "message": f"Export failed: {str(e)}",
                "files_created": 0,
                "total_products": 0
            }
    
    def create_zip_file(self, export_path: str) -> str:
        """Create a zip file from an export directory.
        
        Args:
            export_path: Path to the export directory
            
        Returns:
            Path to the created zip file
        """
        export_dir = Path(export_path)
        if not export_dir.exists():
            raise FileNotFoundError(f"Export directory not found: {export_path}")
        
        # Create zip file in a temporary location
        zip_filename = f"{export_dir.name}.zip"
        zip_path = export_dir.parent / zip_filename
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all files from the export directory
            for file_path in export_dir.rglob('*'):
                if file_path.is_file():
                    # Add file to zip with relative path
                    arcname = file_path.relative_to(export_dir)
                    zipf.write(file_path, arcname)
        
        return str(zip_path)
    
    def get_export_list(self) -> List[Dict[str, Any]]:
        """Get list of available exports.
        
        Returns:
            List of export directories with metadata
        """
        exports = []
        
        if not self.export_dir.exists():
            return exports
        
        # List all directories in export_dir
        for path in sorted(self.export_dir.iterdir(), reverse=True):
            if path.is_dir() and path.name.startswith('20'):  # Timestamp directories
                # Check if metadata exists
                metadata_file = path / "export_metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    # Add directory size
                    total_size = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
                    
                    exports.append({
                        "timestamp": path.name,
                        "path": str(path),
                        "total_products": metadata.get("total_products", 0),
                        "files_created": metadata.get("files_created", 0),
                        "format": metadata.get("format", "unknown"),
                        "size_bytes": total_size,
                        "size_mb": round(total_size / (1024 * 1024), 2)
                    })
        
        return exports
    
    def _create_rag_context_files(self, export_dir: Path, format: str, total_products: int):
        """Create context files for RAG system prompts.
        
        Args:
            export_dir: Directory where files will be created
            format: Export format used
            total_products: Total number of products exported
        """
        # Base URL for product links - adjust this based on your deployment
        base_url = "http://localhost:3000"  # Frontend URL
        api_base_url = "http://localhost:8000/api/v1"  # API URL
        
        # Create user context file
        user_context = f"""# Larvik Kommune Catering - Produktkatalog Kontekst

## Om dette systemet
Dette er produktkatalogen for Larvik Kommune Catering. Katalogen inneholder {total_products} produkter fra våre leverandører.

## Søkeinstruksjoner for brukere
Når du søker etter produkter:
1. Du kan søke på produktnavn, merke, produsent eller ingredienser
2. Søk på norsk for best resultat
3. Bruk spesifikke termer for mer presise resultater

## Produktinformasjon
Hvert produkt inneholder:
- GTIN/EAN-kode for unik identifikasjon
- Fullstendig produktnavn
- Produsent og merkevareinformasjon
- Ingrediensliste med allergener markert i **fet skrift**
- Direkte lenke for å se produktet i systemet

## Viktig om allergener
Allergener er markert med **fet skrift** i ingredienslisten. Vær oppmerksom på dette når du søker etter produkter for personer med allergier.

## Produktlenker
Når et produkt vises i søkeresultatene, kan du klikke på GTIN-koden for å se fullstendig produktinformasjon:
- Produktdetaljer: {base_url}/products/search?gtin=[GTIN]
- API-endepunkt: {api_base_url}/products/[GTIN]

## Eksempel på søk
- "glutenfri brød" - Finner alle glutenfrie brødprodukter
- "Tine melk" - Finner alle melkeprodukter fra Tine
- "uten nøtter" - Finner produkter som ikke inneholder nøtter
"""
        
        user_context_file = export_dir / "rag_context_user.txt"
        with open(user_context_file, 'w', encoding='utf-8') as f:
            f.write(user_context)
        
        # Create admin context file
        admin_context = f"""# Larvik Kommune Catering - Produktkatalog Admin Kontekst

## System Oversikt
Dette er en eksport av produktkatalogen for Larvik Kommune Catering med {total_products} produkter.
Eksportformat: {format.upper()}
Eksportdato: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Administratorinstruksjoner
Som administrator har du tilgang til:
1. Fullstendig produktinformasjon inkludert interne data
2. Mulighet til å redigere produkter via systemet
3. Eksport og import funksjoner
4. Leverandør- og kategoridata

## Systemintegrasjon
Produktene kan nås via følgende grensesnitt:
- Webgrensesnitt: {base_url}/products
- Produktsøk: {base_url}/products/search
- API-endepunkt: {api_base_url}/products/[GTIN]
- Bulk-operasjoner: {api_base_url}/products/import

## Produktdatastruktur
Hvert produkt inneholder:
- GTIN: Unik produktidentifikator (EAN/GTIN-13)
- name: Produktnavn fra leverandør
- producer: Produsentens navn
- ingredients: Fullstendig ingrediensliste med allergener i fet skrift
- metadata.brand: Merkevare
- metadata.item_number: Internt varenummer
- metadata.provider: Leverandørens navn

## Produktlenker og navigasjon
For hvert produkt i søkeresultatene:
1. GTIN kan brukes som direkte lenke: {base_url}/products/search?gtin=[GTIN]
2. API-kall for produktdetaljer: GET {api_base_url}/products/[GTIN]
3. Rediger produkt: {base_url}/products/edit/[GTIN]
4. Se i leverandørkatalog: {base_url}/products/vendor/[GTIN]

## Vedlikeholdsnotater
- Produktdata oppdateres daglig fra leverandører
- Allergener ekstraheres automatisk fra ingredienslister
- Manglende GTIN-koder bør rapporteres til leverandør
- Bruk eksportfunksjonen regelmessig for backup

## Søkeoptimalisering
Søketeksten ('search_text') kombinerer:
- Produktnavn
- Merkenavn
- Produsentnavn
- Ingredienser (uten HTML-formatering)

Dette gir bedre treff ved fritekstsøk.
"""
        
        admin_context_file = export_dir / "rag_context_admin.txt"
        with open(admin_context_file, 'w', encoding='utf-8') as f:
            f.write(admin_context)
        
        # Create data context file
        data_context = f"""# Produktkatalog - Data Kontekst

## Dataformat
Eksportformat: {format.upper()}
Antall produkter: {total_products}
Eksportdato: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Feltbeskrivelser
- **gtin**: Global Trade Item Number (GTIN-13/EAN-13) - Unik produktidentifikator
- **name**: Produktets offisielle navn fra leverandør
- **producer**: Produsentens/fabrikantens navn
- **ingredients**: Komplett ingrediensliste. Allergener er markert med <b>fet skrift</b>
- **search_text**: Optimalisert søketekst som kombinerer alle nøkkelfelt
- **metadata.brand**: Merkevare/brand
- **metadata.item_number**: Leverandørens varenummer
- **metadata.provider**: Leverandør/distributør

## URL-struktur for produktvisning
Hvert produkt kan nås via følgende URL-mønstre:

### Frontend URLs (for brukere):
- Direkte produktvisning: {base_url}/products/search?gtin={{gtin}}
- Produktsøk: {base_url}/products/search?q={{søketerm}}
- Produktliste: {base_url}/products

### API URLs (for integrasjon):
- Hent produkt: GET {api_base_url}/products/{{gtin}}
- Søk produkter: GET {api_base_url}/products/search?q={{søketerm}}
- Liste produkter: GET {api_base_url}/products

## Eksempel på produktlenke
For et produkt med GTIN "7035620030437":
- Brukerlenke: {base_url}/products/search?gtin=7035620030437
- API-lenke: {api_base_url}/products/7035620030437

## Integrasjonsmuligheter
1. **Direkte lenking**: Bruk GTIN i URL for å vise spesifikt produkt
2. **Søkeintegrasjon**: Send søketermer til search-endepunktet
3. **Bulk-operasjoner**: Bruk API for å hente flere produkter samtidig

## Allergenhåndtering
- Allergener i ingredienslisten er alltid markert med HTML <b> tags
- Ved visning bør disse fremheves visuelt
- Søk etter allergener kan gjøres direkte i ingrediensfeltet

## Datakvalitet
- Alle produkter har GTIN som primærnøkkel
- Ingredienslister følger norsk standard for merking
- Manglende data indikeres med null eller tom streng
- Datoer er i ISO 8601-format (YYYY-MM-DD)
"""
        
        data_context_file = export_dir / "rag_context_data.txt"
        with open(data_context_file, 'w', encoding='utf-8') as f:
            f.write(data_context)