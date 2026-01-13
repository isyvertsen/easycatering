"use client"

import { useRouter } from "next/navigation"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { useCreateRecipe } from "@/hooks/useRecipes"
import { Recipe } from "@/types/models"

export default function NewRecipePage() {
  const router = useRouter()
  const createMutation = useCreateRecipe()

  const handleSubmit = async (data: Partial<Recipe>) => {
    await createMutation.mutateAsync(data as Omit<Recipe, 'kalkylekode'>)
    router.push('/recipes')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ny oppskrift</h1>
        <p className="text-muted-foreground">
          Opprett en ny oppskrift med ingredienser og næringsberegning
        </p>
      </div>

      <div className="max-w-2xl">
        <RecipeForm 
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  )
}