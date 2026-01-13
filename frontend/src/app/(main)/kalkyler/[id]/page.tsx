"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, ChefHat, Scale, Users, Printer } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface KalkylePageProps {
  params: Promise<{ id: string }>
}

interface NutritionData {
  energy_kj: number
  energy_kcal: number
  protein: number
  fat: number
  saturated_fat: number
  carbs: number
  sugars: number
  fiber: number
  salt: number
}

interface IngredientNutrition {
  product_id: number
  amount: number
  unit: string
  nutrition: NutritionData | null
}

interface DataQuality {
  total_ingredients: number
  with_nutrition_data: number
  coverage_percentage: number
  quality: string
}

interface NutritionResponse {
  kalkylekode: number
  kalkylenavn: string
  portions: number
  total_nutrition: NutritionData
  nutrition_per_portion: NutritionData
  ingredients_nutrition: IngredientNutrition[]
  data_quality: DataQuality
}

export default function KalkylePage({ params }: KalkylePageProps) {
  const { id } = use(params)
  const [nutritionData, setNutritionData] = useState<NutritionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNutrition = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get(`/v1/oppskrifter/${id}/naering`)
      setNutritionData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente næringsdata")
      console.error("Error fetching nutrition:", err)
    } finally {
      setLoading(false)
    }
  }

  const printLabel = async () => {
    setPrintLoading(true)
    try {
      const response = await apiClient.get(`/v1/oppskrifter/${id}/label`, {
        responseType: 'blob'
      })

      // Get the PDF blob
      const blob = response.data

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etikett_${nutritionData?.kalkylenavn.replace(/\s+/g, '_') || 'oppskrift'}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Error printing label:", err)
      alert("Kunne ikke generere etikett. Vennligst prøv igjen.")
    } finally {
      setPrintLoading(false)
    }
  }

  useEffect(() => {
    fetchNutrition()
  }, [id])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "utmerket":
        return "bg-green-500"
      case "god":
        return "bg-blue-500"
      case "middels":
        return "bg-yellow-500"
      case "lav":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals)
  }

  if (loading && !nutritionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg">Beregner næringsverdier...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Feil</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchNutrition} className="mt-4">
              Prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!nutritionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ingen data tilgjengelig</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="h-8 w-8" />
            {nutritionData.kalkylenavn}
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {nutritionData.portions} porsjoner
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchNutrition} disabled={loading} variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Beregner..." : "Oppdater næring"}
          </Button>
          <Button onClick={printLabel} disabled={printLoading}>
            <Printer className="h-4 w-4 mr-2" />
            {printLoading ? "Genererer..." : "Skriv ut etikett"}
          </Button>
        </div>
      </div>

      {/* Data Quality Badge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datakvalitet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={`${getQualityColor(nutritionData.data_quality.quality)} text-white`}>
              {nutritionData.data_quality.quality.toUpperCase()}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {nutritionData.data_quality.with_nutrition_data} av {nutritionData.data_quality.total_ingredients} ingredienser
              ({nutritionData.data_quality.coverage_percentage}% dekning)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Tabs */}
      <Tabs defaultValue="per-portion" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="per-portion">
            <Scale className="h-4 w-4 mr-2" />
            Per porsjon
          </TabsTrigger>
          <TabsTrigger value="total">
            <ChefHat className="h-4 w-4 mr-2" />
            Total oppskrift
          </TabsTrigger>
        </TabsList>

        <TabsContent value="per-portion">
          <Card>
            <CardHeader>
              <CardTitle>Næringsverdier per porsjon</CardTitle>
              <CardDescription>
                Næringsinnhold for én porsjon av denne oppskriften
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NutritionTable data={nutritionData.nutrition_per_portion} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total">
          <Card>
            <CardHeader>
              <CardTitle>Total næringsverdier</CardTitle>
              <CardDescription>
                Næringsinnhold for hele oppskriften ({nutritionData.portions} porsjoner)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NutritionTable data={nutritionData.total_nutrition} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ingredients Details */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredienser</CardTitle>
          <CardDescription>
            Detaljert oversikt over alle ingredienser og deres næringsinnhold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nutritionData.ingredients_nutrition.map((ing, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    Produkt #{ing.product_id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatNumber(ing.amount, 0)}{ing.unit}
                  </div>
                </div>

                {ing.nutrition ? (
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Energi:</span>
                      <span className="ml-1 font-medium">{formatNumber(ing.nutrition.energy_kcal)} kcal</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Protein:</span>
                      <span className="ml-1 font-medium">{formatNumber(ing.nutrition.protein)}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fett:</span>
                      <span className="ml-1 font-medium">{formatNumber(ing.nutrition.fat)}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Karb:</span>
                      <span className="ml-1 font-medium">{formatNumber(ing.nutrition.carbs)}g</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Ingen næringsdata tilgjengelig
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NutritionTable({ data }: { data: NutritionData }) {
  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Energi</div>
          <div className="text-2xl font-bold">
            {formatNumber(data.energy_kcal)} <span className="text-base font-normal text-muted-foreground">kcal</span>
          </div>
          <div className="text-xs text-muted-foreground">
            ({formatNumber(data.energy_kj, 0)} kJ)
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Protein</div>
          <div className="text-2xl font-bold">
            {formatNumber(data.protein)} <span className="text-base font-normal text-muted-foreground">g</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Fett</span>
          <span className="font-medium">{formatNumber(data.fat)}g</span>
        </div>
        <div className="flex justify-between pl-4">
          <span className="text-sm text-muted-foreground">- Mettet fett</span>
          <span className="font-medium">{formatNumber(data.saturated_fat)}g</span>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Karbohydrater</span>
          <span className="font-medium">{formatNumber(data.carbs)}g</span>
        </div>
        <div className="flex justify-between pl-4">
          <span className="text-sm text-muted-foreground">- Sukker</span>
          <span className="font-medium">{formatNumber(data.sugars)}g</span>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Kostfiber</span>
          <span className="font-medium">{formatNumber(data.fiber)}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Salt</span>
          <span className="font-medium">{formatNumber(data.salt, 2)}g</span>
        </div>
      </div>
    </div>
  )
}
