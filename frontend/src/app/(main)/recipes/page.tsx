"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useRecipesList, useDeleteRecipe } from "@/hooks/useRecipes"
import { Recipe } from "@/types/models"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calculator, FileText, Plus } from "lucide-react"
import { ErrorDisplay, LoadingError } from "@/components/error/error-display"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { toast } from "@/hooks/use-toast"
import { getErrorMessage, getCrudErrorMessage } from "@/lib/error-utils"
import { recipesApi } from "@/lib/api/recipes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const columns: DataTableColumn<Recipe>[] = [
  {
    key: "kalkylekode",
    label: "Kode",
    sortable: true,
  },
  {
    key: "kalkylenavn",
    label: "Navn",
    sortable: true,
  },
  {
    key: "antallporsjoner",
    label: "Porsjoner",
    sortable: true,
    render: (value) => value || "-"
  },
  {
    key: "brukestil",
    label: "Brukes til",
    render: (value) => value || "-"
  },
  {
    key: "opprettetdato",
    label: "Opprettet",
    sortable: true,
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy') : "-"
  },
]

function RecipesPageContent() {
  const router = useRouter()
  const [params, setParams] = useState({
    skip: 0,
    limit: 20,
    search: "",
  })
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [antallPorsjoner, setAntallPorsjoner] = useState<number>(1)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  const { data, isLoading, error, refetch } = useRecipesList(params)
  const deleteMutation = useDeleteRecipe({
    onSuccess: () => {
      toast({
        title: "Suksess",
        description: "Oppskriften ble slettet",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Feil ved sletting",
        description: getCrudErrorMessage('delete', 'recipe', error),
        variant: "destructive",
      })
    }
  })

  const handleParamsChange = (newParams: { page?: number; page_size?: number; search?: string }) => {
    setParams(prev => ({
      ...prev,
      skip: newParams.page ? (newParams.page - 1) * prev.limit : prev.skip,
      limit: newParams.page_size || prev.limit,
      search: newParams.search ?? prev.search,
    }))
  }

  const handleDelete = (id: number | string) => {
    if (window.confirm('Er du sikker på at du vil slette denne oppskriften?')) {
      deleteMutation.mutate(Number(id))
    }
  }

  const handleRetry = () => {
    refetch()
  }

  const handleCalculateClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setAntallPorsjoner(recipe.antallporsjoner || 1)
    setCalculateDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setCalculateDialogOpen(open)
    if (!open) {
      // Reset state when dialog closes
      setSelectedRecipe(null)
      setIsCalculating(false)
    }
  }

  const handleCalculate = async () => {
    if (!selectedRecipe) return

    setIsCalculating(true)
    try {
      await recipesApi.calculateRecipe(selectedRecipe.kalkylekode, antallPorsjoner)
      toast({
        title: "Suksess",
        description: `Oppskriften er kalkulert for ${antallPorsjoner} porsjoner`,
      })
      setCalculateDialogOpen(false)
      refetch()
    } catch (err) {
      toast({
        title: "Feil",
        description: "Kunne ikke kalkulere oppskriften",
        variant: "destructive",
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleDownloadPDF = async (recipe: Recipe) => {
    setIsDownloadingPDF(true)
    try {
      const blob = await recipesApi.downloadRecipeReport(recipe.kalkylekode)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `oppskrift_${recipe.kalkylenavn?.replace(/\s+/g, '_') || 'rapport'}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Suksess",
        description: "PDF-rapport lastet ned",
      })
    } catch (err) {
      toast({
        title: "Feil",
        description: "Kunne ikke generere rapport",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  // Show error state if there's an error loading recipes
  if (error && !isLoading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oppskrifter</h1>
          <p className="text-muted-foreground">
            Administrer oppskrifter, beregn næringsverdier og håndter allergener
          </p>
        </div>

        <ErrorDisplay
          error={error}
          onRetry={handleRetry}
          showRetry={true}
          size="md"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Oppskrifter</h1>
        <p className="text-muted-foreground">
          Administrer oppskrifter, beregn næringsverdier og håndter allergener
        </p>
      </div>

      {/* Show inline error if there's an error but we still have cached data */}
      {error && data && (
        <LoadingError 
          resource="oppskrifter" 
          error={error}
          onRetry={handleRetry}
        />
      )}

      <DataTable<Recipe>
        tableName="recipes"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        loading={isLoading}
        idField="kalkylekode"
        searchPlaceholder="Søk etter kode eller navn..."
        customActions={(recipe) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleCalculateClick(recipe)
              }}
              disabled={isCalculating}
              title="Kalkuler mengder"
            >
              <Calculator className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDownloadPDF(recipe)
              }}
              disabled={isDownloadingPDF}
              title="Last ned PDF-rapport"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {/* Calculate Dialog */}
      <Dialog open={calculateDialogOpen} onOpenChange={handleDialogClose} modal={false}>
        <DialogContent onPointerDownOutside={() => setCalculateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Kalkuler oppskrift</DialogTitle>
            <DialogDescription>
              Beregn ingrediensmengder for {selectedRecipe?.kalkylenavn}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="portions">Antall porsjoner</Label>
            <Input
              id="portions"
              type="number"
              min="1"
              value={antallPorsjoner}
              onChange={(e) => setAntallPorsjoner(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCalculateDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? "Kalkulerer..." : "Kalkuler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function RecipesPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <RecipesPageContent />
    </ErrorBoundary>
  )
}