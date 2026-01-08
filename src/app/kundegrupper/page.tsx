"use client"

import { useState, useCallback } from "react"
import {
  useKundegrupper,
  useCreateKundegruppe,
  useUpdateKundegruppe,
  useDeleteKundegruppe,
  useBulkDeleteKundegrupper
} from "@/hooks/useKundegruppe"
import { Kundegruppe, KundegruppeCreate, KundegruppeListParams } from "@/lib/api/kundegruppe"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, X } from "lucide-react"
import { CrudListParams } from "@/hooks/useCrud"

const columns: DataTableColumn<Kundegruppe>[] = [
  {
    key: "gruppe",
    label: "Navn",
    sortable: true,
  },
  {
    key: "webshop",
    label: "Webshop",
    sortable: true,
    render: (value) => value ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Check className="mr-1 h-3 w-3" />
        Ja
      </Badge>
    ) : (
      <Badge variant="secondary">
        <X className="mr-1 h-3 w-3" />
        Nei
      </Badge>
    ),
  },
  {
    key: "autofaktura",
    label: "Autofaktura",
    sortable: true,
    render: (value) => value ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Check className="mr-1 h-3 w-3" />
        Ja
      </Badge>
    ) : (
      <Badge variant="secondary">
        <X className="mr-1 h-3 w-3" />
        Nei
      </Badge>
    ),
  },
]

export default function KundegrupperPage() {
  // Query parameters state
  const [params, setParams] = useState<KundegruppeListParams>({
    page: 1,
    page_size: 20,
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGruppe, setEditingGruppe] = useState<Kundegruppe | null>(null)
  const [formData, setFormData] = useState<KundegruppeCreate>({
    gruppe: "",
    webshop: false,
    autofaktura: false,
  })

  // Hooks
  const { data, isLoading } = useKundegrupper(params)
  const createMutation = useCreateKundegruppe()
  const updateMutation = useUpdateKundegruppe()
  const deleteMutation = useDeleteKundegruppe()
  const bulkDeleteMutation = useBulkDeleteKundegrupper()

  const kundegrupper = data?.items || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.page_size || 20
  const totalPages = data?.total_pages || 1

  const handleParamsChange = useCallback((newParams: CrudListParams) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
    }))
  }, [])

  const handleCreate = () => {
    setEditingGruppe(null)
    setFormData({ gruppe: "", webshop: false, autofaktura: false })
    setDialogOpen(true)
  }

  const handleEdit = (gruppe: Kundegruppe) => {
    setEditingGruppe(gruppe)
    setFormData({
      gruppe: gruppe.gruppe,
      webshop: gruppe.webshop,
      autofaktura: gruppe.autofaktura,
    })
    setDialogOpen(true)
  }

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleBulkDelete = (ids: (number | string)[]) => {
    bulkDeleteMutation.mutate(ids.map(Number))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.gruppe.trim()) return

    if (editingGruppe) {
      updateMutation.mutate(
        { id: editingGruppe.gruppeid, data: formData },
        {
          onSuccess: () => {
            setDialogOpen(false)
            setEditingGruppe(null)
          },
        }
      )
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setDialogOpen(false)
          setFormData({ gruppe: "", webshop: false, autofaktura: false })
        },
      })
    }
  }

  if (isLoading && kundegrupper.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kundegrupper</h1>
        <p className="text-muted-foreground">
          Administrer kundegrupper for segmentering
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle kundegrupper</CardTitle>
          <CardDescription>
            {total} kundegrupper totalt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            tableName="kundegrupper"
            columns={columns}
            data={kundegrupper}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onParamsChange={handleParamsChange}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            loading={isLoading}
            idField="gruppeid"
            searchPlaceholder="Søk etter kundegruppe..."
            enableEdit={true}
            enableDelete={true}
            enableBulkOperations={true}
            onEdit={handleEdit}
            onCreate={handleCreate}
            createButtonLabel="Ny kundegruppe"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGruppe ? "Rediger kundegruppe" : "Ny kundegruppe"}
            </DialogTitle>
            <DialogDescription>
              {editingGruppe
                ? "Oppdater informasjon om kundegruppen"
                : "Opprett en ny kundegruppe for å segmentere kunder"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="gruppe">Gruppenavn *</Label>
                <Input
                  id="gruppe"
                  value={formData.gruppe}
                  onChange={(e) => setFormData({ ...formData, gruppe: e.target.value })}
                  placeholder="F.eks. Bedriftskunder"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="webshop">Webshop-tilgang</Label>
                  <p className="text-sm text-muted-foreground">
                    Kan kunder i denne gruppen bestille via webshop?
                  </p>
                </div>
                <Switch
                  id="webshop"
                  checked={formData.webshop}
                  onCheckedChange={(checked) => setFormData({ ...formData, webshop: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autofaktura">Autofaktura</Label>
                  <p className="text-sm text-muted-foreground">
                    Skal faktura genereres automatisk?
                  </p>
                </div>
                <Switch
                  id="autofaktura"
                  checked={formData.autofaktura}
                  onCheckedChange={(checked) => setFormData({ ...formData, autofaktura: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Lagrer..."
                  : editingGruppe
                  ? "Oppdater"
                  : "Opprett"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
