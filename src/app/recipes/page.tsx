"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useRecipesList, useDeleteRecipe } from "@/hooks/useRecipes"
import { Recipe } from "@/types/models"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ErrorDisplay, LoadingError } from "@/components/error/error-display"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { toast } from "@/hooks/use-toast"
import { getErrorMessage, getCrudErrorMessage } from "@/lib/error-utils"

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
      />
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