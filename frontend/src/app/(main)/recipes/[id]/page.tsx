"use client"

import { useRouter } from "next/navigation"
import { use, useState } from "react"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { RecipeIngredients } from "@/components/recipes/recipe-ingredients"
import { NutritionDisplay } from "@/components/recipes/nutrition-display"
import { CalculateNutritionButton } from "@/components/recipes/calculate-nutrition-button"
import { useRecipe, useUpdateRecipe } from "@/hooks/useRecipes"
import { Recipe } from "@/types/models"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calculator, FileText } from "lucide-react"
import { recipesApi } from "@/lib/api/recipes"

interface RecipeEditPageProps {
  params: Promise<{ id: string }>
}

export default function RecipeEditPage({ params }: RecipeEditPageProps) {
  const router = useRouter()
  const { id } = use(params)

  const { data: recipe, isLoading } = useRecipe(Number(id))
  const updateMutation = useUpdateRecipe()
  const [nutritionData, setNutritionData] = useState<any>(null)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [antallPorsjoner, setAntallPorsjoner] = useState<number>(1)
  const [calculateBeforeReport, setCalculateBeforeReport] = useState(false)
  const [calculateLoading, setCalculateLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const handleSubmit = async (data: Partial<Recipe>) => {
    await updateMutation.mutateAsync({
      id: Number(id),
      data: { ...data }
    })
    router.push('/recipes')
  }

  const handleNutritionCalculated = (data: any) => {
    setNutritionData(data)
  }

  const calculateRecipe = async () => {
    setCalculateLoading(true)
    try {
      await recipesApi.calculateRecipe(Number(id), antallPorsjoner)
      alert(`Oppskriften er kalkulert for ${antallPorsjoner} porsjoner`)
      // Optionally refresh the page or recipe data
      window.location.reload()
    } catch (err) {
      console.error("Error calculating recipe:", err)
      alert("Kunne ikke kalkulere oppskriften. Vennligst prøv igjen.")
    } finally {
      setCalculateLoading(false)
    }
  }

  const downloadReport = async () => {
    setReportLoading(true)
    try {
      const blob = await recipesApi.downloadRecipeReport(
        Number(id),
        calculateBeforeReport ? antallPorsjoner : undefined
      )

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `oppskrift_${recipe?.kalkylenavn?.replace(/\s+/g, '_') || 'rapport'}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // If we calculated before report, refresh the page
      if (calculateBeforeReport) {
        window.location.reload()
      }
    } catch (err) {
      console.error("Error downloading report:", err)
      alert("Kunne ikke generere rapport. Vennligst prøv igjen.")
    } finally {
      setReportLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Laster oppskrift...</p>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Oppskrift ikke funnet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rediger oppskrift</h1>
          <p className="text-muted-foreground">
            Oppdater oppskriftinformasjon
          </p>
        </div>
        <CalculateNutritionButton
          recipeId={Number(id)}
          onCalculated={handleNutritionCalculated}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RecipeForm
            recipe={recipe}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
          />
        </div>
        <div className="space-y-6">
          <RecipeIngredients recipeId={Number(id)} nutritionData={nutritionData} />
          <NutritionDisplay data={nutritionData} loading={nutritionLoading} />

          {/* Kalkulering og Rapport */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Kalkulering og Rapport
              </CardTitle>
              <CardDescription>
                Kalkuler mengder for et bestemt antall porsjoner og generer detaljert PDF-rapport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Input for number of portions */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="antallporsjoner">Antall porsjoner</Label>
                    <Input
                      id="antallporsjoner"
                      type="number"
                      min="1"
                      value={antallPorsjoner}
                      onChange={(e) => setAntallPorsjoner(parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={calculateRecipe}
                    disabled={calculateLoading}
                    className="min-w-[120px]"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {calculateLoading ? "Kalkulerer..." : "Kalkuler"}
                  </Button>
                </div>

                {/* Report download section */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="calculate-before-report"
                      checked={calculateBeforeReport}
                      onCheckedChange={(checked) => setCalculateBeforeReport(checked as boolean)}
                    />
                    <label
                      htmlFor="calculate-before-report"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Kalkuler for {antallPorsjoner} porsjoner før generering
                    </label>
                  </div>

                  <Button
                    onClick={downloadReport}
                    disabled={reportLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {reportLoading ? "Genererer rapport..." : "Last ned rapport (PDF)"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}