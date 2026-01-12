"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NutritionData {
  kalkylekode: number
  kalkylenavn: string
  portions: number
  total_weight_grams: number
  total_nutrition: {
    energy_kj: number
    energy_kcal: number
    protein: number
    fat: number
    saturated_fat?: number
    carbs: number
    sugars?: number
    fiber: number
    salt: number
    polyunsaturated_fat?: number
    monounsaturated_fat?: number
    sugar_alcohols?: number
  }
  nutrition_per_100g: {
    energy_kj: number
    energy_kcal: number
    protein: number
    fat: number
    saturated_fat?: number
    carbs: number
    sugars?: number
    fiber: number
    salt: number
    polyunsaturated_fat?: number
    monounsaturated_fat?: number
    sugar_alcohols?: number
  }
  nutrition_per_portion: {
    energy_kj: number
    energy_kcal: number
    protein: number
    fat: number
    saturated_fat?: number
    carbs: number
    sugars?: number
    fiber: number
    salt: number
    polyunsaturated_fat?: number
    monounsaturated_fat?: number
    sugar_alcohols?: number
  }
  ingredients_nutrition?: Array<{
    product_id: number
    amount: number
    unit: string
    nutrition?: any
  }>
  data_quality: {
    total_ingredients: number
    with_nutrition_data: number
    coverage_percentage: number
    quality: "utmerket" | "god" | "middels" | "lav" | "ingen_data"
  }
}

interface NutritionDisplayProps {
  data: NutritionData | null
  loading?: boolean
}

const qualityConfig = {
  utmerket: { color: "bg-green-500", text: "Utmerket datakvalitet", icon: CheckCircle2 },
  god: { color: "bg-blue-500", text: "God datakvalitet", icon: CheckCircle2 },
  middels: { color: "bg-yellow-500", text: "Middels datakvalitet", icon: Info },
  lav: { color: "bg-orange-500", text: "Lav datakvalitet", icon: AlertCircle },
  ingen_data: { color: "bg-red-500", text: "Ingen næringsdata", icon: AlertCircle },
}

export function NutritionDisplay({ data, loading }: NutritionDisplayProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Næringsinformasjon</CardTitle>
          <CardDescription>Laster næringsberegning...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Næringsinformasjon</CardTitle>
          <CardDescription>Ingen data tilgjengelig</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Beregn næringsverdier for å se informasjon her.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const quality = qualityConfig[data.data_quality.quality]
  const QualityIcon = quality.icon

  return (
    <div className="space-y-4">
      {/* Datakvalitet */}
      <Alert>
        <QualityIcon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {quality.text} ({data.data_quality.coverage_percentage}% dekning)
          </span>
          <span className="text-sm text-muted-foreground">
            {data.data_quality.with_nutrition_data} av {data.data_quality.total_ingredients} ingredienser
          </span>
        </AlertDescription>
      </Alert>

      {/* Næringstabell */}
      <Card>
        <CardHeader>
          <CardTitle>Næringsinformasjon</CardTitle>
          <CardDescription>
            {data.kalkylenavn} - {data.portions} porsjoner | Per porsjon: {Math.round(data.total_weight_grams)}g
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="per-100g" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="per-100g">Per 100g</TabsTrigger>
              <TabsTrigger value="per-portion">Per porsjon</TabsTrigger>
            </TabsList>

            <TabsContent value="per-100g" className="space-y-4">
              <NutritionTable nutrition={data.nutrition_per_100g} />
            </TabsContent>

            <TabsContent value="per-portion" className="space-y-4">
              <NutritionTable nutrition={data.nutrition_per_portion} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function NutritionTable({ nutrition }: { nutrition: NutritionData["nutrition_per_portion"] }) {
  return (
    <div className="space-y-2">
      <NutritionRow
        label="Energi"
        value={nutrition.energy_kcal}
        unit="kcal"
        secondary={`${Math.round(nutrition.energy_kj)} kJ`}
        highlight
      />
      <div className="border-t pt-2 space-y-2">
        <NutritionRow label="Protein" value={nutrition.protein} unit="g" />
        <NutritionRow label="Fett" value={nutrition.fat} unit="g" />
        {nutrition.saturated_fat !== undefined && nutrition.saturated_fat > 0 && (
          <NutritionRow
            label="- hvorav mettede fettsyrer"
            value={nutrition.saturated_fat}
            unit="g"
            indent
          />
        )}
        {nutrition.monounsaturated_fat !== undefined && nutrition.monounsaturated_fat > 0 && (
          <NutritionRow
            label="- hvorav enumettede fettsyrer"
            value={nutrition.monounsaturated_fat}
            unit="g"
            indent
          />
        )}
        {nutrition.polyunsaturated_fat !== undefined && nutrition.polyunsaturated_fat > 0 && (
          <NutritionRow
            label="- hvorav flerumettede fettsyrer"
            value={nutrition.polyunsaturated_fat}
            unit="g"
            indent
          />
        )}
        <NutritionRow label="Karbohydrater" value={nutrition.carbs} unit="g" />
        {nutrition.sugars !== undefined && nutrition.sugars > 0 && (
          <NutritionRow
            label="- hvorav sukkerarter"
            value={nutrition.sugars}
            unit="g"
            indent
          />
        )}
        {nutrition.sugar_alcohols !== undefined && nutrition.sugar_alcohols > 0 && (
          <NutritionRow
            label="- hvorav sukkeralkoholer"
            value={nutrition.sugar_alcohols}
            unit="g"
            indent
          />
        )}
        <NutritionRow label="Kostfiber" value={nutrition.fiber} unit="g" />
        <NutritionRow label="Salt" value={nutrition.salt} unit="g" />
      </div>
    </div>
  )
}

interface NutritionRowProps {
  label: string
  value: number
  unit: string
  secondary?: string
  highlight?: boolean
  indent?: boolean
}

function NutritionRow({ label, value, unit, secondary, highlight, indent }: NutritionRowProps) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        highlight ? "font-semibold text-lg border-b-2" : ""
      } ${indent ? "pl-4 text-sm text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <span>
          {value.toFixed(1)} {unit}
        </span>
        {secondary && <span className="text-sm text-muted-foreground">({secondary})</span>}
      </div>
    </div>
  )
}
