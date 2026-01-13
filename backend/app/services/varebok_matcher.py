"""Varebok product matching service."""
import csv
import logging
from pathlib import Path
from typing import List, Optional, Dict, Tuple
from fuzzywuzzy import fuzz
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.varebok import (
    VarebokProduct,
    MatchResult,
    RecipeProduct,
    RecipeProductWithMatches,
    VarebokStats,
)

logger = logging.getLogger(__name__)

# Path to Varebok CSV
VAREBOK_CSV_PATH = Path(__file__).parent.parent.parent / "data" / "Varebok Larvik kommunale catering.csv"

# CSV column indices (0-based)
CSV_COLUMNS = {
    "kategori_navn": 2,
    "hovedvaregruppe_navn": 4,
    "ean_d_pakn": 18,
    "ean_f_pakn": 19,
    "varenummer": 20,
    "nytt_varenummer": 21,
    "varenavn": 22,
    "mengde": 25,
    "maleenhet": 26,
    "pris_pakn": 28,
    "leverandor_navn": 40,
}


class VarebokMatcherService:
    """Service for matching products against Varebok CSV."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._varebok_cache: Optional[List[VarebokProduct]] = None
        self._ean_index: Optional[Dict[str, VarebokProduct]] = None
        self._varenr_index: Optional[Dict[str, VarebokProduct]] = None

    def _load_varebok_sync(self) -> List[VarebokProduct]:
        """Load Varebok CSV file synchronously."""
        if self._varebok_cache is not None:
            return self._varebok_cache

        products = []
        try:
            with open(VAREBOK_CSV_PATH, "r", encoding="cp1252") as f:
                reader = csv.reader(f, delimiter=";")
                next(reader)  # Skip header

                for row in reader:
                    if len(row) < 30:
                        continue

                    try:
                        mengde = None
                        if row[CSV_COLUMNS["mengde"]]:
                            try:
                                mengde = float(row[CSV_COLUMNS["mengde"]].replace(",", "."))
                            except ValueError:
                                pass

                        pris = None
                        if row[CSV_COLUMNS["pris_pakn"]]:
                            try:
                                pris = float(row[CSV_COLUMNS["pris_pakn"]].replace(",", "."))
                            except ValueError:
                                pass

                        product = VarebokProduct(
                            varenummer=row[CSV_COLUMNS["varenummer"]].strip(),
                            nytt_varenummer=row[CSV_COLUMNS["nytt_varenummer"]].strip() or None,
                            varenavn=row[CSV_COLUMNS["varenavn"]].strip(),
                            ean_d_pakn=row[CSV_COLUMNS["ean_d_pakn"]].strip() or None,
                            ean_f_pakn=row[CSV_COLUMNS["ean_f_pakn"]].strip() or None,
                            kategori_navn=row[CSV_COLUMNS["kategori_navn"]].strip() or None,
                            hovedvaregruppe_navn=row[CSV_COLUMNS["hovedvaregruppe_navn"]].strip() or None,
                            mengde=mengde,
                            maleenhet=row[CSV_COLUMNS["maleenhet"]].strip() or None,
                            pris=pris,
                            leverandor_navn=row[CSV_COLUMNS["leverandor_navn"]].strip() or None,
                        )
                        products.append(product)
                    except Exception as e:
                        logger.warning(f"Error parsing row: {e}")
                        continue

            self._varebok_cache = products
            self._build_indexes()
            logger.info(f"Loaded {len(products)} products from Varebok CSV")

        except FileNotFoundError:
            logger.error(f"Varebok CSV not found at {VAREBOK_CSV_PATH}")
            self._varebok_cache = []

        return self._varebok_cache

    def _build_indexes(self):
        """Build indexes for fast lookup."""
        self._ean_index = {}
        self._varenr_index = {}

        for product in self._varebok_cache or []:
            # Index by EAN codes
            if product.ean_d_pakn:
                normalized = self._normalize_ean(product.ean_d_pakn)
                if normalized:
                    self._ean_index[normalized] = product
            if product.ean_f_pakn:
                normalized = self._normalize_ean(product.ean_f_pakn)
                if normalized:
                    self._ean_index[normalized] = product

            # Index by varenummer
            if product.varenummer:
                self._varenr_index[product.varenummer] = product
            if product.nytt_varenummer:
                self._varenr_index[product.nytt_varenummer] = product

    def _normalize_ean(self, ean: Optional[str]) -> Optional[str]:
        """Normalize EAN code by stripping and removing leading zeros."""
        if not ean:
            return None
        cleaned = "".join(c for c in ean if c.isdigit())
        return cleaned if cleaned else None

    async def get_recipe_products(self) -> List[RecipeProduct]:
        """Get all products used in recipes."""
        query = text("""
            SELECT
                p.produktid,
                p.produktnavn,
                p.ean_kode,
                p.leverandorsproduktnr,
                COUNT(DISTINCT kd.kalkylekode) as recipe_count
            FROM tblprodukter p
            INNER JOIN tbl_rpkalkyledetaljer kd ON kd.produktid = p.produktid
            GROUP BY p.produktid, p.produktnavn, p.ean_kode, p.leverandorsproduktnr
            ORDER BY recipe_count DESC
        """)

        result = await self.db.execute(query)
        rows = result.fetchall()

        return [
            RecipeProduct(
                produktid=row.produktid,
                produktnavn=row.produktnavn,
                ean_kode=row.ean_kode,
                leverandorsproduktnr=row.leverandorsproduktnr,
                recipe_count=row.recipe_count,
            )
            for row in rows
        ]

    def find_matches(self, product: RecipeProduct, limit: int = 5) -> List[MatchResult]:
        """Find matching Varebok products for a given product."""
        varebok = self._load_varebok_sync()
        matches: List[MatchResult] = []

        # 1. Exact EAN match
        if product.ean_kode:
            normalized_ean = self._normalize_ean(product.ean_kode)
            if normalized_ean and self._ean_index and normalized_ean in self._ean_index:
                vb = self._ean_index[normalized_ean]
                changes = self._calculate_changes(product, vb)
                matches.append(MatchResult(
                    varebok_product=vb,
                    match_type="ean_exact",
                    confidence=1.0,
                    changes=changes,
                ))

        # 2. Exact varenummer match
        if product.leverandorsproduktnr and self._varenr_index:
            if product.leverandorsproduktnr in self._varenr_index:
                vb = self._varenr_index[product.leverandorsproduktnr]
                # Avoid duplicates
                if not any(m.varebok_product.varenummer == vb.varenummer for m in matches):
                    changes = self._calculate_changes(product, vb)
                    matches.append(MatchResult(
                        varebok_product=vb,
                        match_type="varenr_exact",
                        confidence=0.95,
                        changes=changes,
                    ))

        # 3. Fuzzy name match
        if product.produktnavn:
            product_name_lower = product.produktnavn.lower()
            fuzzy_matches = []

            for vb in varebok:
                # Skip already matched
                if any(m.varebok_product.varenummer == vb.varenummer for m in matches):
                    continue

                vb_name_lower = vb.varenavn.lower()
                ratio = fuzz.ratio(product_name_lower, vb_name_lower)
                token_ratio = fuzz.token_sort_ratio(product_name_lower, vb_name_lower)
                best_ratio = max(ratio, token_ratio)

                if best_ratio >= 70:  # Minimum threshold
                    changes = self._calculate_changes(product, vb)
                    fuzzy_matches.append(MatchResult(
                        varebok_product=vb,
                        match_type="name_fuzzy",
                        confidence=best_ratio / 100.0,
                        changes=changes,
                    ))

            # Sort by confidence and take top matches
            fuzzy_matches.sort(key=lambda x: x.confidence, reverse=True)
            matches.extend(fuzzy_matches[:limit - len(matches)])

        return matches[:limit]

    def _calculate_changes(
        self, product: RecipeProduct, vb: VarebokProduct
    ) -> Dict[str, Tuple[Optional[str], Optional[str]]]:
        """Calculate what fields would change if this match is applied."""
        changes = {}

        # Determine best EAN from Varebok (prefer F-pakn as it's usually the sales unit)
        new_ean = vb.ean_f_pakn or vb.ean_d_pakn
        if new_ean:
            # Normalize for comparison
            current_normalized = self._normalize_ean(product.ean_kode)
            new_normalized = self._normalize_ean(new_ean)
            if current_normalized != new_normalized:
                changes["ean_kode"] = (product.ean_kode, new_ean)

        # Product name
        if product.produktnavn != vb.varenavn:
            changes["produktnavn"] = (product.produktnavn, vb.varenavn)

        # Leverandør produktnummer
        new_varenr = vb.nytt_varenummer or vb.varenummer
        if product.leverandorsproduktnr != new_varenr:
            changes["leverandorsproduktnr"] = (product.leverandorsproduktnr, new_varenr)

        return changes

    async def apply_match(
        self,
        produktid: int,
        varebok_varenummer: str,
        update_ean: bool = True,
        update_name: bool = True,
        update_leverandorsproduktnr: bool = True,
    ) -> Tuple[bool, Dict[str, Tuple[Optional[str], Optional[str]]], str]:
        """Apply a match by updating the product."""
        varebok = self._load_varebok_sync()

        # Find the Varebok product
        vb = None
        for v in varebok:
            if v.varenummer == varebok_varenummer or v.nytt_varenummer == varebok_varenummer:
                vb = v
                break

        if not vb:
            return False, {}, f"Varebok product {varebok_varenummer} not found"

        # Build update query
        updates = []
        params = {"produktid": produktid}
        changes = {}

        if update_ean:
            new_ean = vb.ean_f_pakn or vb.ean_d_pakn
            if new_ean:
                updates.append("ean_kode = :ean_kode")
                params["ean_kode"] = new_ean
                # Get current value for change tracking
                result = await self.db.execute(
                    text("SELECT ean_kode FROM tblprodukter WHERE produktid = :pid"),
                    {"pid": produktid}
                )
                row = result.fetchone()
                old_ean = row.ean_kode if row else None
                changes["ean_kode"] = (old_ean, new_ean)

        if update_name:
            updates.append("produktnavn = :produktnavn")
            params["produktnavn"] = vb.varenavn
            result = await self.db.execute(
                text("SELECT produktnavn FROM tblprodukter WHERE produktid = :pid"),
                {"pid": produktid}
            )
            row = result.fetchone()
            old_name = row.produktnavn if row else None
            changes["produktnavn"] = (old_name, vb.varenavn)

        if update_leverandorsproduktnr:
            new_varenr = vb.nytt_varenummer or vb.varenummer
            updates.append("leverandorsproduktnr = :leverandorsproduktnr")
            params["leverandorsproduktnr"] = new_varenr
            result = await self.db.execute(
                text("SELECT leverandorsproduktnr FROM tblprodukter WHERE produktid = :pid"),
                {"pid": produktid}
            )
            row = result.fetchone()
            old_varenr = row.leverandorsproduktnr if row else None
            changes["leverandorsproduktnr"] = (old_varenr, new_varenr)

        if not updates:
            return False, {}, "No fields to update"

        # Execute update
        query = text(f"UPDATE tblprodukter SET {', '.join(updates)} WHERE produktid = :produktid")
        await self.db.execute(query, params)
        await self.db.commit()

        logger.info(f"Applied match for product {produktid}: {changes}")
        return True, changes, "Match applied successfully"

    async def get_stats(self) -> VarebokStats:
        """Get matching statistics."""
        recipe_products = await self.get_recipe_products()
        varebok = self._load_varebok_sync()

        matched = 0
        partial = 0
        no_match = 0

        for product in recipe_products:
            matches = self.find_matches(product, limit=1)
            if matches:
                if matches[0].confidence >= 0.95:
                    matched += 1
                else:
                    partial += 1
            else:
                no_match += 1

        return VarebokStats(
            total_recipe_products=len(recipe_products),
            matched_products=matched,
            partial_matches=partial,
            no_matches=no_match,
            total_varebok_products=len(varebok),
        )

    async def get_recipe_products_with_matches(
        self, limit: int = 100, offset: int = 0
    ) -> List[RecipeProductWithMatches]:
        """Get recipe products with their match suggestions."""
        recipe_products = await self.get_recipe_products()

        # Apply pagination
        paginated = recipe_products[offset:offset + limit]

        results = []
        for product in paginated:
            matches = self.find_matches(product, limit=5)
            best = matches[0] if matches else None
            has_exact = best.confidence >= 0.95 if best else False

            results.append(RecipeProductWithMatches(
                produktid=product.produktid,
                produktnavn=product.produktnavn,
                ean_kode=product.ean_kode,
                leverandorsproduktnr=product.leverandorsproduktnr,
                recipe_count=product.recipe_count,
                matches=matches,
                best_match=best,
                has_exact_match=has_exact,
            ))

        return results
