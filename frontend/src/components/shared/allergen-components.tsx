"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, XCircle, AlertTriangle, Info } from "lucide-react"

// Felles allergen-type som fungerer for både Matinfo og recipes
export interface AllergenInfo {
  code: string
  level: "CONTAINS" | "MAY_CONTAIN" | "FREE_FROM" | string
  name: string
}

// Konfigurasjon for allergen-nivåer
const allergenLevelConfig = {
  CONTAINS: {
    variant: "destructive" as const,
    icon: AlertCircle,
    label: "Inneholder",
    className: "bg-red-500 hover:bg-red-600"
  },
  MAY_CONTAIN: {
    variant: "secondary" as const,
    icon: AlertTriangle,
    label: "Kan inneholde",
    className: "bg-yellow-500 hover:bg-yellow-600 text-white"
  },
  FREE_FROM: {
    variant: "outline" as const,
    icon: XCircle,
    label: "Fri fra",
    className: "bg-green-50 text-green-700 border-green-300"
  }
}

// ============================================
// AllergenBadge - Enkelt badge for én allergen
// ============================================
interface AllergenBadgeProps {
  allergen: AllergenInfo
  size?: "sm" | "md" | "lg"
}

export function AllergenBadge({ allergen, size = "md" }: AllergenBadgeProps) {
  const config = allergenLevelConfig[allergen.level as keyof typeof allergenLevelConfig] || allergenLevelConfig.CONTAINS
  const Icon = config.icon

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  }

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {allergen.name}
    </Badge>
  )
}

// ============================================
// AllergenList - Kompakt liste av allergener
// ============================================
interface AllergenListProps {
  allergens: AllergenInfo[]
  maxDisplay?: number
  size?: "sm" | "md" | "lg"
}

export function AllergenList({ allergens, maxDisplay = 5, size = "sm" }: AllergenListProps) {
  if (allergens.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Ingen allergeninformasjon tilgjengelig
      </div>
    )
  }

  // Sorter: CONTAINS først, deretter MAY_CONTAIN, til slutt FREE_FROM
  const sortedAllergens = [...allergens].sort((a, b) => {
    const order = { CONTAINS: 0, MAY_CONTAIN: 1, FREE_FROM: 2 }
    return (order[a.level as keyof typeof order] ?? 3) - (order[b.level as keyof typeof order] ?? 3)
  })

  const displayAllergens = sortedAllergens.slice(0, maxDisplay)
  const remaining = allergens.length - maxDisplay

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayAllergens.map((allergen, idx) => (
        <AllergenBadge key={`${allergen.code}-${idx}`} allergen={allergen} size={size} />
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining} flere
        </Badge>
      )}
    </div>
  )
}

// ============================================
// AllergenCard - Full kortvisning av allergener
// ============================================
interface AllergenCardProps {
  allergens: AllergenInfo[]
  title?: string
  description?: string
}

export function AllergenCard({
  allergens,
  title = "Allergener",
  description = "Allergeninformasjon"
}: AllergenCardProps) {
  if (!allergens || allergens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Ingen allergener funnet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Inneholder ingen kjente allergener</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const containsAllergens = allergens.filter((a) => a.level === "CONTAINS")
  const mayContainAllergens = allergens.filter((a) => a.level === "MAY_CONTAIN")
  const freeFromAllergens = allergens.filter((a) => a.level === "FREE_FROM")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {containsAllergens.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Inneholder
            </h4>
            <div className="flex flex-wrap gap-2">
              {containsAllergens.map((allergen) => (
                <AllergenBadge key={allergen.code} allergen={allergen} size="md" />
              ))}
            </div>
          </div>
        )}

        {mayContainAllergens.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Kan inneholde
            </h4>
            <div className="flex flex-wrap gap-2">
              {mayContainAllergens.map((allergen) => (
                <AllergenBadge key={allergen.code} allergen={allergen} size="md" />
              ))}
            </div>
          </div>
        )}

        {freeFromAllergens.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-green-600" />
              Fri fra
            </h4>
            <div className="flex flex-wrap gap-2">
              {freeFromAllergens.map((allergen) => (
                <AllergenBadge key={allergen.code} allergen={allergen} size="md" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
