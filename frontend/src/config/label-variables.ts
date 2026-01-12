/**
 * Predefined variables for label templates
 *
 * These variables can be used in label designs and will be
 * replaced with actual data when printing labels.
 */

export interface LabelVariable {
  name: string
  displayName: string
  description: string
  category: 'product' | 'order' | 'customer' | 'date' | 'custom'
  exampleValue: string
}

export const LABEL_VARIABLES: LabelVariable[] = [
  // Product/Menu variables
  {
    name: 'menu_name',
    displayName: 'Menynavn',
    description: 'Navn på menyen/retten',
    category: 'product',
    exampleValue: 'Kjøttkaker med brun saus',
  },
  {
    name: 'product_name',
    displayName: 'Produktnavn',
    description: 'Navn på produktet',
    category: 'product',
    exampleValue: 'Kyllingfilet',
  },
  {
    name: 'product_ean',
    displayName: 'EAN-kode',
    description: 'EAN/strekkode for produktet',
    category: 'product',
    exampleValue: '7038010000123',
  },
  {
    name: 'product_weight',
    displayName: 'Vekt',
    description: 'Vekt på produktet',
    category: 'product',
    exampleValue: '500g',
  },
  {
    name: 'product_price',
    displayName: 'Pris',
    description: 'Pris på produktet',
    category: 'product',
    exampleValue: '89,90 kr',
  },
  {
    name: 'product_unit',
    displayName: 'Enhet',
    description: 'Enhet for produktet',
    category: 'product',
    exampleValue: 'stk',
  },
  {
    name: 'product_allergens',
    displayName: 'Allergener',
    description: 'Liste over allergener',
    category: 'product',
    exampleValue: 'Melk, Egg, Hvete',
  },
  {
    name: 'product_ingredients',
    displayName: 'Ingredienser',
    description: 'Ingrediensliste',
    category: 'product',
    exampleValue: 'Kylling, salt, pepper',
  },
  {
    name: 'menu_ingredients',
    displayName: 'Meny ingredienser',
    description: 'Alle ingredienser i retten',
    category: 'product',
    exampleValue: 'Kjøttdeig (storfe), løk, <b>HVETE</b>mel, <b>MELK</b>, smør (<b>MELK</b>), salt, pepper, muskatnøtt',
  },
  {
    name: 'product_nutrition',
    displayName: 'Næringsinnhold',
    description: 'Næringsinnhold per 100g',
    category: 'product',
    exampleValue: 'Energi: 165 kcal',
  },
  {
    name: 'nutrition_per_100g',
    displayName: 'Næringsverdier pr 100g',
    description: 'Fullstendig næringsinnhold per 100g',
    category: 'product',
    exampleValue: 'Energi: 185 kcal\nFett: 9g\n- hvorav mettet: 4g\nKarbohydrat: 12g\n- hvorav sukker: 2g\nProtein: 14g\nSalt: 1.2g',
  },
  {
    name: 'instructions',
    displayName: 'Tilberedning',
    description: 'Instruksjoner for tilberedning',
    category: 'product',
    exampleValue: 'Varm i stekeovn på 180°C i 20-25 min. Kan også varmes i mikrobølgeovn på full effekt i 4-5 min.',
  },

  // Order variables
  {
    name: 'order_number',
    displayName: 'Ordrenummer',
    description: 'Unikt ordrenummer',
    category: 'order',
    exampleValue: 'ORD-2024-001234',
  },
  {
    name: 'order_quantity',
    displayName: 'Antall',
    description: 'Antall enheter i ordren',
    category: 'order',
    exampleValue: '10',
  },
  {
    name: 'delivery_date',
    displayName: 'Leveringsdato',
    description: 'Dato for levering',
    category: 'order',
    exampleValue: '15.01.2025',
  },
  {
    name: 'delivery_time',
    displayName: 'Leveringstid',
    description: 'Klokkeslett for levering',
    category: 'order',
    exampleValue: '10:00',
  },

  // Customer variables
  {
    name: 'customer_name',
    displayName: 'Kundenavn',
    description: 'Navn på kunden',
    category: 'customer',
    exampleValue: 'Larvik Sykehjem',
  },
  {
    name: 'customer_address',
    displayName: 'Adresse',
    description: 'Leveringsadresse',
    category: 'customer',
    exampleValue: 'Storgata 1, 3256 Larvik',
  },
  {
    name: 'customer_department',
    displayName: 'Avdeling',
    description: 'Avdeling hos kunden',
    category: 'customer',
    exampleValue: 'Avdeling 3',
  },
  {
    name: 'customer_contact',
    displayName: 'Kontaktperson',
    description: 'Kontaktperson hos kunden',
    category: 'customer',
    exampleValue: 'Kari Nordmann',
  },

  // Date variables
  {
    name: 'production_date',
    displayName: 'Produksjonsdato',
    description: 'Dato produktet ble laget',
    category: 'date',
    exampleValue: '14.01.2025',
  },
  {
    name: 'expiry_date',
    displayName: 'Utløpsdato',
    description: 'Siste forbruksdato',
    category: 'date',
    exampleValue: '21.01.2025',
  },
  {
    name: 'best_before',
    displayName: 'Best før',
    description: 'Best før dato',
    category: 'date',
    exampleValue: '20.01.2025',
  },
  {
    name: 'pack_date',
    displayName: 'Pakkedato',
    description: 'Dato produktet ble pakket',
    category: 'date',
    exampleValue: '14.01.2025',
  },
  {
    name: 'current_date',
    displayName: 'Dagens dato',
    description: 'Nåværende dato',
    category: 'date',
    exampleValue: '14.01.2025',
  },

  // Custom variables
  {
    name: 'batch_number',
    displayName: 'Batchnummer',
    description: 'Produksjons-batch',
    category: 'custom',
    exampleValue: 'B2024-0142',
  },
  {
    name: 'lot_number',
    displayName: 'Lotnummer',
    description: 'Lot-identifikasjon',
    category: 'custom',
    exampleValue: 'L001',
  },
  {
    name: 'storage_temp',
    displayName: 'Oppbevaringstemperatur',
    description: 'Anbefalt lagringstemperatur',
    category: 'custom',
    exampleValue: '2-4°C',
  },
  {
    name: 'custom_text',
    displayName: 'Egendefinert tekst',
    description: 'Valgfri tekst',
    category: 'custom',
    exampleValue: 'Din tekst her',
  },
]

// Group variables by category
export const VARIABLE_CATEGORIES = [
  { key: 'product' as const, label: 'Produkt' },
  { key: 'order' as const, label: 'Ordre' },
  { key: 'customer' as const, label: 'Kunde' },
  { key: 'date' as const, label: 'Dato' },
  { key: 'custom' as const, label: 'Egendefinert' },
]

export function getVariablesByCategory(category: LabelVariable['category']) {
  return LABEL_VARIABLES.filter((v) => v.category === category)
}

export function getVariableByName(name: string) {
  return LABEL_VARIABLES.find((v) => v.name === name)
}
