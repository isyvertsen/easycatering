"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useTemplatesList, useDeleteTemplate, useDistributeTemplate } from "@/hooks/useProduksjon"
import { ProduksjonsTemplate } from "@/lib/api/produksjon"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Send, Copy, MoreHorizontal } from "lucide-react"
import { ErrorDisplay, LoadingError } from "@/components/error/error-display"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const columns: DataTableColumn<ProduksjonsTemplate>[] = [
  {
    key: "template_id",
    label: "ID",
    sortable: true,
  },
  {
    key: "template_navn",
    label: "Navn",
    sortable: true,
  },
  {
    key: "beskrivelse",
    label: "Beskrivelse",
    render: (value) => value || "-"
  },
  {
    key: "kundegruppe",
    label: "Kundegruppe",
    render: (value) => value || 12
  },
  {
    key: "aktiv",
    label: "Status",
    render: (value) => (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Aktiv" : "Inaktiv"}
      </Badge>
    )
  },
  {
    key: "gyldig_fra",
    label: "Gyldig fra",
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy', { locale: nb }) : "-"
  },
  {
    key: "gyldig_til",
    label: "Gyldig til",
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy', { locale: nb }) : "-"
  },
  {
    key: "opprettet_dato",
    label: "Opprettet",
    sortable: true,
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy', { locale: nb }) : "-"
  },
]

function TemplatesPageContent() {
  const router = useRouter()
  const [params, setParams] = useState({
    page: 1,
    page_size: 20,
    search: "",
  })
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProduksjonsTemplate | null>(null)

  const { data, isLoading, error, refetch } = useTemplatesList(params)
  const deleteMutation = useDeleteTemplate()
  const distributeMutation = useDistributeTemplate()

  const handleParamsChange = (newParams: { page?: number; page_size?: number; search?: string }) => {
    setParams(prev => ({
      ...prev,
      page: newParams.page || prev.page,
      page_size: newParams.page_size || prev.page_size,
      search: newParams.search ?? prev.search,
    }))
  }

  const handleDelete = (id: number | string) => {
    if (window.confirm('Er du sikker på at du vil slette denne templaten?')) {
      deleteMutation.mutate(Number(id))
    }
  }

  const handleDistributeClick = (template: ProduksjonsTemplate) => {
    setSelectedTemplate(template)
    setDistributeDialogOpen(true)
  }

  const handleDistribute = async () => {
    if (!selectedTemplate) return

    try {
      await distributeMutation.mutateAsync({ templateId: selectedTemplate.template_id })
      setDistributeDialogOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDistributeDialogOpen(open)
    if (!open) {
      setSelectedTemplate(null)
    }
  }

  if (error && !isLoading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonstemplates</h1>
          <p className="text-muted-foreground">
            Administrer produksjonstemplates for mottakskjøkken
          </p>
        </div>

        <ErrorDisplay
          error={error}
          onRetry={refetch}
          showRetry={true}
          size="md"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonstemplates</h1>
          <p className="text-muted-foreground">
            Administrer produksjonstemplates for mottakskjøkken (kundegruppe 12)
          </p>
        </div>
        <Button asChild>
          <Link href="/produksjon/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            Ny template
          </Link>
        </Button>
      </div>

      {error && data && (
        <LoadingError
          resource="templates"
          error={error}
          onRetry={refetch}
        />
      )}

      <DataTable<ProduksjonsTemplate>
        tableName="produksjon-templates"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={handleDelete}
        loading={isLoading}
        idField="template_id"
        searchPlaceholder="Søk etter template..."
        customActions={(template) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDistributeClick(template)
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Distribuer til kunder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/produksjon/templates/${template.template_id}`)
                }}
              >
                Rediger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Distribute Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={handleDialogClose} modal={false}>
        <DialogContent onPointerDownOutside={() => setDistributeDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Distribuer template</DialogTitle>
            <DialogDescription>
              Distribuer "{selectedTemplate?.template_navn}" til alle kunder i kundegruppe {selectedTemplate?.kundegruppe || 12}.
              Dette vil opprette en produksjonsbestilling for hver kunde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDistributeDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleDistribute}
              disabled={distributeMutation.isPending}
            >
              {distributeMutation.isPending ? "Distribuerer..." : "Distribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <TemplatesPageContent />
    </ErrorBoundary>
  )
}
