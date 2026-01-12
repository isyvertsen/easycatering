"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

interface CalculateNutritionButtonProps {
  recipeId: number
  onCalculated?: (data: any) => void
}

export function CalculateNutritionButton({ recipeId, onCalculated }: CalculateNutritionButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/v1/oppskrifter/${recipeId}/naering`)
      toast.success("Næringsverdier beregnet!")

      if (onCalculated) {
        onCalculated(response.data)
      }
    } catch (error) {
      console.error("Feil ved beregning av næring:", error)
      toast.error("Kunne ikke beregne næringsverdier. Sjekk at produktene har GTIN/EAN-koder.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCalculate} disabled={loading} variant="outline">
      <Calculator className="mr-2 h-4 w-4" />
      {loading ? "Beregner..." : "Beregn næringsverdier"}
    </Button>
  )
}
