"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOrdersList, useBatchUpdateOrderStatus } from "@/hooks/useOrders"
import { useKundegrupper } from "@/hooks/useKundegruppe"
import { Order } from "@/types/models"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Filter, ArrowUp, ArrowDown, CheckCircle, PlayCircle, Package, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const getOrderStatus = (order: Order) => {
  if (order.kansellertdato) {
    return { label: "Kansellert", variant: "destructive" as const }
  }
  if (order.ordrelevert) {
    return { label: "Levert", variant: "default" as const }
  }
  if (order.sentbekreftelse) {
    return { label: "Bekreftet", variant: "secondary" as const }
  }

  // Map ordrestatusid til lesbar status
  const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    10: { label: "Startet", variant: "outline" },
    15: { label: "Bestilt", variant: "outline" },
    20: { label: "Godkjent", variant: "default" },
    25: { label: "Plukkliste", variant: "secondary" },
    30: { label: "Plukket", variant: "secondary" },
    35: { label: "Pakkliste", variant: "secondary" },
    80: { label: "Godkjent mottaker", variant: "default" },
    85: { label: "Fakturert", variant: "default" },
    90: { label: "Sendt regnskap", variant: "default" },
    95: { label: "Kreditert", variant: "secondary" },
    98: { label: "For sen kansellering", variant: "destructive" },
    99: { label: "Kansellert", variant: "destructive" },
  }

  const statusId = order.ordrestatusid ?? 0
  return statusMap[statusId] || { label: "Ukjent", variant: "outline" as const }
}

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [params, setParams] = useState({
    skip: 0,
    limit: 20,
    search: undefined as string | undefined,
    sort_by: 'leveringsdato' as 'leveringsdato' | 'ordredato',
    sort_order: 'asc' as 'asc' | 'desc',
    kundegruppe_ids: [] as number[],
  })
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])

  const { data, isLoading } = useOrdersList(params)
  const { data: kundegrupper } = useKundegrupper()
  const batchStatusMutation = useBatchUpdateOrderStatus()

  const handleParamsChange = (newParams: { page?: number; page_size?: number; search?: string }) => {
    setParams(prev => ({
      ...prev,
      skip: newParams.page ? (newParams.page - 1) * prev.limit : prev.skip,
      limit: newParams.page_size || prev.limit,
    }))
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setParams(prev => ({
      ...prev,
      search: value || undefined,
      skip: 0, // Reset to first page when searching
    }))
  }

  const handleKundegruppeToggle = (gruppeid: number) => {
    setParams(prev => ({
      ...prev,
      kundegruppe_ids: prev.kundegruppe_ids.includes(gruppeid)
        ? prev.kundegruppe_ids.filter(id => id !== gruppeid)
        : [...prev.kundegruppe_ids, gruppeid],
      skip: 0, // Reset to first page when filtering
    }))
  }

  const handleSortChange = (field: 'leveringsdato' | 'ordredato') => {
    setParams(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc',
      skip: 0,
    }))
  }

  const clearFilters = () => {
    setParams(prev => ({
      ...prev,
      kundegruppe_ids: [],
      skip: 0,
    }))
  }

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleAllOrders = () => {
    const nonCancelledOrders = data?.items.filter(o => !o.kansellertdato).map(o => o.ordreid) || []
    if (selectedOrders.length === nonCancelledOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(nonCancelledOrders)
    }
  }

  const handleBatchStatusUpdate = async (statusId: number) => {
    if (selectedOrders.length === 0) return

    try {
      const result = await batchStatusMutation.mutateAsync({
        orderIds: selectedOrders,
        statusId
      })
      toast({
        title: "Ordrer oppdatert",
        description: result.message,
      })
      setSelectedOrders([])
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere ordrer",
        variant: "destructive",
      })
    }
  }

  const orders = data?.items || []
  const nonCancelledOrders = orders.filter(o => !o.kansellertdato)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordrer</h1>
          <p className="text-muted-foreground">
            Administrer bestillinger og leveranser
          </p>
        </div>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            Ny ordre
          </Link>
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4 items-center flex-wrap">
        {/* Search */}
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter kunde eller ordrenummer..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Customer group filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Kundegrupper
              {params.kundegruppe_ids.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {params.kundegruppe_ids.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Filtrer etter kundegruppe</h4>
                {params.kundegruppe_ids.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Nullstill
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {kundegrupper?.items?.map(gruppe => (
                  <div key={gruppe.gruppeid} className="flex items-center space-x-2">
                    <Checkbox
                      id={`gruppe-${gruppe.gruppeid}`}
                      checked={params.kundegruppe_ids.includes(gruppe.gruppeid)}
                      onCheckedChange={() => handleKundegruppeToggle(gruppe.gruppeid)}
                    />
                    <Label
                      htmlFor={`gruppe-${gruppe.gruppeid}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {gruppe.gruppe}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Sorter etter:</Label>
          <Button
            variant={params.sort_by === 'leveringsdato' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('leveringsdato')}
          >
            Leveringsdato
            {params.sort_by === 'leveringsdato' && (
              params.sort_order === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={params.sort_by === 'ordredato' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('ordredato')}
          >
            Ordredato
            {params.sort_by === 'ordredato' && (
              params.sort_order === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedOrders.length} ordre{selectedOrders.length > 1 ? 'r' : ''} valgt
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchStatusUpdate(20)}
              disabled={batchStatusMutation.isPending}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Godkjenn
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchStatusUpdate(25)}
              disabled={batchStatusMutation.isPending}
            >
              <PlayCircle className="mr-1 h-4 w-4" />
              Plukkliste
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchStatusUpdate(30)}
              disabled={batchStatusMutation.isPending}
            >
              <Package className="mr-1 h-4 w-4" />
              Plukket
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedOrders([])}
          >
            Fjern valg
          </Button>
        </div>
      )}

      {/* Order selection table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-12">
                <Checkbox
                  checked={selectedOrders.length === nonCancelledOrders.length && nonCancelledOrders.length > 0}
                  onCheckedChange={toggleAllOrders}
                />
              </th>
              <th className="p-3 text-left font-medium">Ordrenr</th>
              <th className="p-3 text-left font-medium">Kunde</th>
              <th className="p-3 text-left font-medium">Kundegruppe</th>
              <th className="p-3 text-left font-medium">Ordredato</th>
              <th className="p-3 text-left font-medium">Levering</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Betaling</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = getOrderStatus(order)
              const isCancelled = !!order.kansellertdato
              return (
                <tr
                  key={order.ordreid}
                  className={`border-b hover:bg-muted/50 cursor-pointer ${selectedOrders.includes(order.ordreid) ? 'bg-muted' : ''}`}
                  onClick={() => router.push(`/orders/${order.ordreid}`)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {!isCancelled && (
                      <Checkbox
                        checked={selectedOrders.includes(order.ordreid)}
                        onCheckedChange={() => toggleOrderSelection(order.ordreid)}
                      />
                    )}
                  </td>
                  <td className="p-3 font-medium">{order.ordreid}</td>
                  <td className="p-3">{order.kundenavn || '-'}</td>
                  <td className="p-3">{order.kundegruppenavn || '-'}</td>
                  <td className="p-3">{order.ordredato ? format(new Date(order.ordredato), 'dd.MM.yyyy') : '-'}</td>
                  <td className="p-3">{order.leveringsdato ? format(new Date(order.leveringsdato), 'dd.MM.yyyy') : '-'}</td>
                  <td className="p-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="p-3">
                    {order.betalingsmate === 1 ? 'Faktura' : order.betalingsmate === 2 ? 'Kontant' : order.betalingsmate === 3 ? 'Kort' : '-'}
                  </td>
                </tr>
              )
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Ingen ordrer funnet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Viser {((data.page - 1) * data.page_size) + 1} - {Math.min(data.page * data.page_size, data.total)} av {data.total} ordrer
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleParamsChange({ page: data.page - 1 })}
              disabled={data.page <= 1}
            >
              Forrige
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleParamsChange({ page: data.page + 1 })}
              disabled={data.page >= data.total_pages}
            >
              Neste
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}