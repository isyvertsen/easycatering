"use client"

import { MatinfoNutrientInfo } from "@/lib/api/produkter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, Zap } from "lucide-react"

interface NutritionInfoProps {
  nutrients: MatinfoNutrientInfo[]
  compact?: boolean
}

// Mapping av nutrient koder til norske navn og visningsrekkefølge
const nutrientConfig: Record<string, { label: string; priority: number; icon?: any }> = {
  "ENERC": { label: "Energi", priority: 1, icon: Flame },
  "ENERC_KCAL": { label: "Kalorier", priority: 2, icon: Zap },
  "ENERC_KJ": { label: "Kilojoule", priority: 3 },
  "FAT": { label: "Fett", priority: 4 },
  "FASAT": { label: "Mettet fett", priority: 5 },
  "FAMSCIS": { label: "Enumettet fett", priority: 6 },
  "FAPUCIS": { label: "Flerumettet fett", priority: 7 },
  "CHO-": { label: "Karbohydrater", priority: 8 },
  "SUGAR": { label: "Sukkerarter", priority: 9 },
  "FIBTG": { label: "Kostfiber", priority: 10 },
  "PROCNT": { label: "Protein", priority: 11 },
  "NACL": { label: "Salt", priority: 12 },
}

export function NutritionInfo({ nutrients, compact = false }: NutritionInfoProps) {
  if (nutrients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Ingen næringsinnhold tilgjengelig
      </div>
    )
  }

  // Sorter nutrients basert på prioritet
  const sortedNutrients = [...nutrients].sort((a, b) => {
    const priorityA = nutrientConfig[a.code]?.priority || 999
    const priorityB = nutrientConfig[b.code]?.priority || 999
    return priorityA - priorityB
  })

  // Hoved-nutrients (energi, fett, karbohydrater, protein, salt)
  const mainNutrients = sortedNutrients.filter(n =>
    ["ENERC_KCAL", "FAT", "CHO-", "PROCNT", "NACL"].includes(n.code)
  )

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {mainNutrients.map((nutrient) => {
          const config = nutrientConfig[nutrient.code]
          const Icon = config?.icon

          return (
            <div key={nutrient.code} className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                {Icon && <Icon className="h-3 w-3" />}
                {config?.label || nutrient.name}:
              </span>
              <span className="font-medium">
                {nutrient.measurement?.toFixed(1)} {nutrient.measurement_type || "g"}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Næringsinnhold per 100g</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedNutrients.map((nutrient) => {
            const config = nutrientConfig[nutrient.code]
            const Icon = config?.icon
            const isMain = ["ENERC_KCAL", "FAT", "CHO-", "PROCNT", "NACL"].includes(nutrient.code)

            return (
              <div
                key={nutrient.code}
                className={`flex items-center justify-between ${isMain ? "font-medium" : "text-sm pl-4"}`}
              >
                <span className="text-muted-foreground flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {config?.label || nutrient.name}
                </span>
                <span>
                  {nutrient.measurement?.toFixed(1)} {nutrient.measurement_type || "g"}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface NutritionSummaryProps {
  nutrients: MatinfoNutrientInfo[]
}

export function NutritionSummary({ nutrients }: NutritionSummaryProps) {
  if (nutrients.length === 0) return null

  const calories = nutrients.find(n => n.code === "ENERC_KCAL")
  const protein = nutrients.find(n => n.code === "PROCNT")
  const carbs = nutrients.find(n => n.code === "CHO-")
  const fat = nutrients.find(n => n.code === "FAT")

  return (
    <div className="flex items-center gap-4 text-xs">
      {calories && (
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-orange-500" />
          <span className="font-medium">{calories.measurement?.toFixed(0)} kcal</span>
        </div>
      )}
      {protein && (
        <div>
          <span className="text-muted-foreground">P:</span>
          <span className="font-medium ml-1">{protein.measurement?.toFixed(1)}g</span>
        </div>
      )}
      {carbs && (
        <div>
          <span className="text-muted-foreground">K:</span>
          <span className="font-medium ml-1">{carbs.measurement?.toFixed(1)}g</span>
        </div>
      )}
      {fat && (
        <div>
          <span className="text-muted-foreground">F:</span>
          <span className="font-medium ml-1">{fat.measurement?.toFixed(1)}g</span>
        </div>
      )}
    </div>
  )
}
