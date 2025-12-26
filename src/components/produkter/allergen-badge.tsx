"use client"

// Re-export fra den felles allergen-komponenten
// Beholder denne filen for bakoverkompatibilitet med eksisterende imports

export {
  AllergenBadge,
  AllergenList,
  AllergenCard,
  type AllergenInfo
} from "@/components/shared/allergen-components"

// For bakoverkompatibilitet med MatinfoAllergenInfo
import { MatinfoAllergenInfo } from "@/lib/api/produkter"
import { AllergenInfo } from "@/components/shared/allergen-components"

// Type guard/converter - MatinfoAllergenInfo er kompatibel med AllergenInfo
export function toAllergenInfo(allergen: MatinfoAllergenInfo): AllergenInfo {
  return allergen
}
