-- ============================================
-- TEST-OPPSKRIFT FOR NÆRINGSBEREGNING
-- ============================================
-- Denne filen oppretter en testoppskrift "Grønnsakswok"
-- med ingredienser som har GTIN-koblinger til Matinfo
--
-- Kjør dette skriptet for å teste næringsberegningen

-- 1. OPPRETT OPPSKRIFT
-- =====================
INSERT INTO tbl_rpkalkyle (
    kalkylekode,
    kalkylenavn,
    ansattid,
    opprettetdato,
    revidertdato,
    informasjon,
    refporsjon,
    kategorikode,
    antallporsjoner,
    produksjonsmetode,
    gruppeid,
    alergi,
    merknad,
    enhet,
    twporsjon
) VALUES (
    999999,  -- Eller bruk 295 for neste normale kalkylekode
    'TEST - Grønnsakswok (Næringstest)',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'Testoppskrift for å verifisere næringsberegning med GTIN-koblede produkter',
    '1 porsjon',
    'MIDDAG',
    4,
    'Wok/Steking',
    1,
    NULL,
    'Automatisk opprettet for testing av næringsberegning. Alle produkter har GTIN-kobling til Matinfo.',
    'porsjon',
    350.0
);

-- 2. LEGG TIL INGREDIENSER
-- =========================

-- Ingrediens 1: Amerikansk blanding (frosne grønnsaker) - 500g
-- GTIN: 07026510152407
-- Næringsverdier per 100g: 64 kcal, 2.6g protein, 0.6g fett, 10.9g karb
INSERT INTO tbl_rpkalkyledetaljer (
    kalkylekode,
    produktid,
    produktnavn,
    leverandorsproduktnr,
    pris,
    porsjonsmengde,
    enh,
    totmeng,
    kostpris,
    visningsenhet,
    svinnprosent,
    tblkalkyledetaljerid
) VALUES (
    999999,
    5,  -- AMERIKANSK BLANDING
    'AMERIKANSK BLANDING',
    '968669',
    88.64,
    125,  -- 125g per porsjon
    'g',
    0.5,  -- 500g total (0.5 kg)
    NULL,
    'Gram',
    NULL,
    9999991
);

-- Ingrediens 2: H-melk (saus-base) - 400ml
-- GTIN: 07038010000232
-- Næringsverdier per 100ml: 63 kcal, 3.4g protein, 3.5g fett, 4.5g karb
INSERT INTO tbl_rpkalkyledetaljer (
    kalkylekode,
    produktid,
    produktnavn,
    leverandorsproduktnr,
    pris,
    porsjonsmengde,
    enh,
    totmeng,
    kostpris,
    visningsenhet,
    svinnprosent,
    tblkalkyledetaljerid
) VALUES (
    999999,
    1288,  -- H-MELK
    '10 L B.I.B. H-MELK 1stk',
    NULL,
    156.3,
    100,  -- 100ml per porsjon
    'ml',
    0.4,  -- 400ml total (0.4 liter)
    NULL,
    'Milliliter',
    NULL,
    9999992
);

-- Ingrediens 3: Aprikos tørkede (søtlig element) - 80g
-- GTIN: 17311041041595
-- Næringsverdier per 100g: 289 kcal, 2.5g protein, 0.3g fett, 65.7g karb
INSERT INTO tbl_rpkalkyledetaljer (
    kalkylekode,
    produktid,
    produktnavn,
    leverandorsproduktnr,
    pris,
    porsjonsmengde,
    enh,
    totmeng,
    kostpris,
    visningsenhet,
    svinnprosent,
    tblkalkyledetaljerid
) VALUES (
    999999,
    12,  -- APRIKOS E& CHOIS 5 KG
    'APRIKOS E& CHOIS 5 KG',
    '542878',
    84.24,
    20,  -- 20g per porsjon
    'g',
    0.08,  -- 80g total (0.08 kg)
    NULL,
    'Gram',
    NULL,
    9999993
);

-- Ingrediens 4: Bacon (protein) - 200g
-- GTIN: 27035620022603
-- Næringsverdier per 100g: vil gi fett og protein
INSERT INTO tbl_rpkalkyledetaljer (
    kalkylekode,
    produktid,
    produktnavn,
    leverandorsproduktnr,
    pris,
    porsjonsmengde,
    enh,
    totmeng,
    kostpris,
    visningsenhet,
    svinnprosent,
    tblkalkyledetaljerid
) VALUES (
    999999,
    2961,  -- BACON TØRRSALTET 100GRAM PK
    'BACON TØRRSALTET 100GRAM PK',
    NULL,
    NULL,
    50,  -- 50g per porsjon
    'g',
    0.2,  -- 200g total (0.2 kg)
    NULL,
    'Gram',
    NULL,
    9999994
);

-- Ingrediens 5: Agurk (frisk topping) - 200g
-- GTIN: 27072633101017
-- Næringsverdier per 100g: Lavt i kalorier
INSERT INTO tbl_rpkalkyledetaljer (
    kalkylekode,
    produktid,
    produktnavn,
    leverandorsproduktnr,
    pris,
    porsjonsmengde,
    enh,
    totmeng,
    kostpris,
    visningsenhet,
    svinnprosent,
    tblkalkyledetaljerid
) VALUES (
    999999,
    3203,  -- AGURK
    'AGURK',
    NULL,
    NULL,
    50,  -- 50g per porsjon
    'g',
    0.2,  -- 200g total (0.2 kg)
    NULL,
    'Gram',
    NULL,
    9999995
);

-- 3. VERIFISER OPPRETTELSE
-- =========================

-- Sjekk oppskriften
SELECT
    kalkylekode,
    kalkylenavn,
    antallporsjoner,
    informasjon
FROM tbl_rpkalkyle
WHERE kalkylekode = 999999;

-- Sjekk ingrediensene
SELECT
    kd.produktid,
    kd.produktnavn,
    kd.porsjonsmengde,
    kd.enh,
    kd.totmeng,
    p.ean_kode,
    LTRIM(p.ean_kode, '-') as clean_gtin,
    mp.name as matinfo_navn,
    (SELECT COUNT(*) FROM matinfo_nutrients WHERE product_id = mp.id) as antall_naering
FROM tbl_rpkalkyledetaljer kd
JOIN tblprodukter p ON kd.produktid = p.produktid
LEFT JOIN matinfo_products mp ON LTRIM(p.ean_kode, '-') = mp.gtin
WHERE kd.kalkylekode = 999999
ORDER BY kd.tblkalkyledetaljerid;

-- 4. FORVENTET RESULTAT
-- ======================

-- TOTAL NÆRING FOR HELE OPPSKRIFTEN (alle ingredienser):
--
-- Amerikansk blanding: 500g
--   - Energi: 500g * (64 kcal / 100g) = 320 kcal
--   - Protein: 500g * (2.6g / 100g) = 13g
--   - Fett: 500g * (0.6g / 100g) = 3g
--   - Karbohydrater: 500g * (10.9g / 100g) = 54.5g
--
-- H-melk: 400ml
--   - Energi: 400ml * (63 kcal / 100ml) = 252 kcal
--   - Protein: 400ml * (3.4g / 100ml) = 13.6g
--   - Fett: 400ml * (3.5g / 100ml) = 14g
--   - Karbohydrater: 400ml * (4.5g / 100ml) = 18g
--
-- Aprikos: 80g
--   - Energi: 80g * (289 kcal / 100g) = 231.2 kcal
--   - Protein: 80g * (2.5g / 100g) = 2g
--   - Fett: 80g * (0.3g / 100g) = 0.24g
--   - Karbohydrater: 80g * (65.7g / 100g) = 52.56g
--
-- Bacon: 200g (avhenger av Matinfo-data)
-- Agurk: 200g (avhenger av Matinfo-data)
--
-- FORVENTET TOTAL (kun første 3 ingredienser):
--   - Energi: ~803 kcal
--   - Protein: ~28.6g
--   - Fett: ~17.24g
--   - Karbohydrater: ~125g
--
-- PER PORSJON (4 porsjoner):
--   - Energi: ~200 kcal per porsjon
--   - Protein: ~7g per porsjon
--   - Fett: ~4.3g per porsjon
--   - Karbohydrater: ~31g per porsjon

-- 5. TEST NÆRINGSBEREGNING VIA API
-- ==================================
--
-- Etter å ha kjørt dette skriptet, test APIet:
--
-- POST http://localhost:8000/api/v1/recipes/999999/calculate-nutrition
--
-- ELLER via curl:
-- curl -X POST http://localhost:8000/api/v1/recipes/999999/calculate-nutrition \
--   -H "Content-Type: application/json" \
--   --cookie "session=<din-session>"
--
-- ELLER via Python:
-- ```python
-- from app.services.nutrition_calculator import NutritionCalculator
-- calculator = NutritionCalculator(db)
-- result = await calculator.calculate_recipe_nutrition(recipe_id=999999)
-- print(result)
-- ```

-- 6. CLEANUP (KJØ DETTE FOR Å SLETTE TESTDATA)
-- ============================================

-- DELETE FROM tbl_rpkalkyledetaljer WHERE kalkylekode = 999999;
-- DELETE FROM tbl_rpkalkyle WHERE kalkylekode = 999999;
