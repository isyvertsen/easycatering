"use client"

// Re-export AllergenCard som AllergenDisplay for bakoverkompatibilitet
// Denne filen eksisterer for at eksisterende imports fortsatt fungerer

import { AllergenCard, AllergenInfo } from "@/components/shared/allergen-components"

interface AllergenDisplayProps {
  allergens: AllergenInfo[]
}

// AllergenDisplay er nå en wrapper rundt AllergenCard for bakoverkompatibilitet
export function AllergenDisplay({ allergens }: AllergenDisplayProps) {
  return (
    <AllergenCard
      allergens={allergens}
      title="Allergener"
      description="Allergeninformasjon for denne retten"
    />
  )
}
