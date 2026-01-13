"use client"

import { useRouter } from "next/navigation"
import { use, useState } from "react"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { RecipeIngredients } from "@/components/recipes/recipe-ingredients"
import { NutritionDisplay } from "@/components/recipes/nutrition-display"
import { CalculateNutritionButton } from "@/components/recipes/calculate-nutrition-button"
import { useRecipe, useUpdateRecipe } from "@/hooks/useRecipes"
import { Recipe } from "@/types/models"

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
        </div>
      </div>
    </div>
  )
}