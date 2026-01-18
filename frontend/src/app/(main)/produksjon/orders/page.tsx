"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable, DataTableColumn } from "@/components/crud/data-table"
import { useProduksjonsList, useApproveProduksjon, useTransferToOrder } from "@/hooks/useProduksjon"
import { Produksjon } from "@/lib/api/produksjon"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, XCircle, Send, ArrowRightCircle, MoreHorizontal, Info, FileText } from "lucide-react"
import { ErrorDisplay, LoadingError } from "@/components/error/error-display"
import { ErrorBoundary } from "@/components/error/error-boundary"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Utkast", variant: "secondary" },
  submitted: { label: "Innsendt", variant: "default" },
  approved: { label: "Godkjent", variant: "default" },
  rejected: { label: "Avvist", variant: "destructive" },
  transferred: { label: "Overført", variant: "outline" },
  produced: { label: "Produsert", variant: "outline" },
}

const columns: DataTableColumn<Produksjon>[] = [
  {
    key: "produksjonkode",
    label: "ID",
    sortable: true,
  },
  {
    key: "kunde",
    label: "Kunde",
    render: (value) => value?.kundenavn || "-"
  },
  {
    key: "status",
    label: "Status",
    render: (value) => {
      const status = statusLabels[value as string] || { label: value, variant: "secondary" as const }
      return (
        <Badge variant={status.variant}>
          {status.label}
        </Badge>
      )
    }
  },
  {
    key: "template",
    label: "Template",
    render: (value) => value?.template_navn || "-"
  },
  {
    key: "created",
    label: "Opprettet",
    sortable: true,
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"
  },
  {
    key: "innsendt_dato",
    label: "Innsendt",
    render: (value) => value ? format(new Date(value), 'dd.MM.yyyy HH:mm', { locale: nb }) : "-"
  },
  {
    key: "ordre_id",
    label: "Ordre",
    render: (value) => value ? (
      <Link href={`/orders/${value}`} className="text-primary hover:underline">
        #{value}
      </Link>
    ) : "-"
  },
]

function OrdersPageContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const [params, setParams] = useState({
    page: 1,
    page_size: 20,
    status: undefined as string | undefined,
  })
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedOrderForTransfer, setSelectedOrderForTransfer] = useState<Produksjon | null>(null)

  const { data, isLoading, error, refetch } = useProduksjonsList(params)
  const approveMutation = useApproveProduksjon()
  const transferMutation = useTransferToOrder()

  const handleParamsChange = (newParams: { page?: number; page_size?: number; search?: string }) => {
    setParams(prev => ({
      ...prev,
      page: newParams.page || prev.page,
      page_size: newParams.page_size || prev.page_size,
    }))
  }

  const handleStatusFilter = (status: string) => {
    setParams(prev => ({
      ...prev,
      status: status === "all" ? undefined : status,
      page: 1,
    }))
  }

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const submittedOrders = (data?.items || [])
        .filter(o => o.status === 'submitted')
        .map(o => o.produksjonkode)
      setSelectedOrders(submittedOrders)
    } else {
      setSelectedOrders([])
    }
  }

  const handleApprove = async () => {
    if (selectedOrders.length === 0) return

    try {
      await approveMutation.mutateAsync({
        produksjonskode_list: selectedOrders,
        godkjent_av: session?.user?.id || 1,
      })
      setSelectedOrders([])
      setApproveDialogOpen(false)
      refetch()
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleTransferClick = (order: Produksjon) => {
    setSelectedOrderForTransfer(order)
    setTransferDialogOpen(true)
  }

  const handleTransfer = async () => {
    if (!selectedOrderForTransfer) return

    try {
      await transferMutation.mutateAsync({ id: selectedOrderForTransfer.produksjonkode })
      setTransferDialogOpen(false)
      setSelectedOrderForTransfer(null)
      refetch()
    } catch (error) {
      // Error handled in hook
    }
  }

  const submittedCount = (data?.items || []).filter(o => o.status === 'submitted').length

  if (error && !isLoading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonsordrer</h1>
          <p className="text-muted-foreground">
            Oversikt og godkjenning av produksjonsbestillinger
          </p>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} showRetry={true} size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produksjonsordrer</h1>
          <p className="text-muted-foreground">
            Oversikt og godkjenning av produksjonsbestillinger fra mottakskjøkken
          </p>
        </div>

        {selectedOrders.length > 0 && (
          <Button onClick={() => setApproveDialogOpen(true)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Godkjenn {selectedOrders.length} ordre(r)
          </Button>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Tips</AlertTitle>
        <AlertDescription>
          For å administrere produksjonstemplates, gå til{" "}
          <Link href="/produksjon/templates" className="font-medium underline">
            /produksjon/templates
          </Link>
        </AlertDescription>
      </Alert>

      {error && data && (
        <LoadingError resource="produksjonsordrer" error={error} onRetry={refetch} />
      )}

      <div className="flex items-center gap-4">
        <Select value={params.status || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer etter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="draft">Utkast</SelectItem>
            <SelectItem value="submitted">Innsendt ({submittedCount})</SelectItem>
            <SelectItem value="approved">Godkjent</SelectItem>
            <SelectItem value="rejected">Avvist</SelectItem>
            <SelectItem value="transferred">Overført</SelectItem>
            <SelectItem value="produced">Produsert</SelectItem>
          </SelectContent>
        </Select>

        {submittedCount > 0 && (
          <Badge variant="default" className="ml-2">
            {submittedCount} venter på godkjenning
          </Badge>
        )}
      </div>

      <DataTable<Produksjon>
        tableName="produksjon/orders"
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={data?.page || 1}
        pageSize={data?.page_size || 20}
        totalPages={data?.total_pages || 1}
        onParamsChange={handleParamsChange}
        onDelete={() => {}}
        loading={isLoading}
        idField="produksjonkode"
        searchPlaceholder="Søk etter produksjonsordre..."
        hideAddButton={true}
        enableDelete={false}
        enableBulkOperations={false}
        customActions={(order) => (
          <div className="flex items-center gap-2">
            {order.status === 'submitted' && (
              <Checkbox
                checked={selectedOrders.includes(order.produksjonkode)}
                onCheckedChange={(checked) => handleSelectOrder(order.produksjonkode, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
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
                    router.push(`/produksjon/orders/${order.produksjonkode}`)
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Se detaljer
                </DropdownMenuItem>
                {order.status === 'approved' && !order.ordre_id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTransferClick(order)
                      }}
                    >
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      Overfør til ordre
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setApproveDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Godkjenn produksjonsordrer</DialogTitle>
            <DialogDescription>
              Du er i ferd med å godkjenne {selectedOrders.length} produksjonsordre(r).
              Dette vil endre status til "Godkjent".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Godkjenner..." : "Godkjenn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} modal={false}>
        <DialogContent onPointerDownOutside={() => setTransferDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Overfør til ordre</DialogTitle>
            <DialogDescription>
              Overfør produksjonsordre #{selectedOrderForTransfer?.produksjonkode} til ordresystemet.
              Dette vil opprette en ny ordre for kunde "{selectedOrderForTransfer?.kunde?.kundenavn}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Overfører..." : "Overfør til ordre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <OrdersPageContent />
    </ErrorBoundary>
  )
}
