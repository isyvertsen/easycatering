'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  usePlukkingList,
  usePlukkingStats,
  useKundegrupperForPlukking,
  useUpdatePlukkstatus,
  useBulkUpdatePlukkstatus,
  useMarkerPakkseddelSkrevet,
} from '@/hooks/usePlukking'
import { PlukkingListParams, PlukkStatus } from '@/lib/api/plukking'
import { reportsApi } from '@/lib/api/reports'
import {
  Package,
  PackageCheck,
  Truck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  RefreshCw,
  ClipboardEdit,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'

const statusColors: Record<string, string> = {
  KLAR_TIL_PLUKKING: 'bg-yellow-100 text-yellow-800',
  PLUKKET: 'bg-green-100 text-green-800',
}

export default function PlukkingPage() {
  const { toast } = useToast()
  const [params, setParams] = useState<PlukkingListParams>({
    page: 1,
    page_size: 50,
  })
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])

  const { data: orders, isLoading, refetch } = usePlukkingList(params)
  const { data: stats } = usePlukkingStats({
    kundegruppe_id: params.kundegruppe_id,
    leveringsdato_fra: params.leveringsdato_fra,
    leveringsdato_til: params.leveringsdato_til,
  })
  const { data: kundegrupper } = useKundegrupperForPlukking()

  const updateStatusMutation = useUpdatePlukkstatus()
  const bulkUpdateMutation = useBulkUpdatePlukkstatus()
  const markerPakkseddelMutation = useMarkerPakkseddelSkrevet()

  const handleParamsChange = (newParams: Partial<PlukkingListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: newParams.page ?? 1 }))
    setSelectedOrders([])
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && orders?.items) {
      setSelectedOrders(orders.items.map((o) => o.ordreid))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelectOrder = (ordreId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, ordreId])
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== ordreId))
    }
  }

  const handleUpdateStatus = async (ordreId: number, status: PlukkStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ ordreId, plukkstatus: status })
      toast({
        title: 'Status oppdatert',
        description: `Ordre #${ordreId} er nå ${status === 'PLUKKET' ? 'plukket' : 'klar til plukking'}`,
      })
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere status',
        variant: 'destructive',
      })
    }
  }

  const handleBulkUpdate = async (status: PlukkStatus) => {
    if (selectedOrders.length === 0) return

    try {
      const result = await bulkUpdateMutation.mutateAsync({
        ordreIds: selectedOrders,
        plukkstatus: status,
      })
      toast({
        title: 'Status oppdatert',
        description: result.message,
      })
      setSelectedOrders([])
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere status',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadPakkseddel = async (ordreId: number) => {
    try {
      await reportsApi.downloadDeliveryNote(ordreId)
      await markerPakkseddelMutation.mutateAsync(ordreId)
      toast({
        title: 'Pakkseddel lastet ned',
        description: `Pakkseddel for ordre #${ordreId} er lastet ned`,
      })
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste ned pakkseddel',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadPlukkliste = async (ordreId: number) => {
    try {
      await reportsApi.downloadPickList(ordreId)
      toast({
        title: 'Plukkliste lastet ned',
        description: `Plukkliste for ordre #${ordreId} er lastet ned`,
      })
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste ned plukkliste',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plukking</h1>
          <p className="text-muted-foreground mt-1">
            Oversikt over ordrer for plukking og pakking
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Oppdater
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt ordrer</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_ordrer || 0}</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => handleParamsChange({ plukkstatus: 'KLAR_TIL_PLUKKING' })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Klar til plukking</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.klar_til_plukking || 0}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => handleParamsChange({ plukkstatus: 'PLUKKET' })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plukket</CardTitle>
            <PackageCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.plukket || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Select
              value={params.kundegruppe_id?.toString() || 'all'}
              onValueChange={(v) =>
                handleParamsChange({
                  kundegruppe_id: v === 'all' ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle kundegrupper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle kundegrupper</SelectItem>
                {kundegrupper?.filter(g => g.gruppe && g.gruppe.trim() !== '').map((group) => (
                  <SelectItem key={group.gruppeid} value={group.gruppeid.toString()}>
                    {group.gruppe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.plukkstatus || 'all'}
              onValueChange={(v) =>
                handleParamsChange({ plukkstatus: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle statuser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statuser</SelectItem>
                <SelectItem value="NULL">Uten status</SelectItem>
                <SelectItem value="KLAR_TIL_PLUKKING">Klar til plukking</SelectItem>
                <SelectItem value="PLUKKET">Plukket</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Fra dato"
              value={params.leveringsdato_fra?.split('T')[0] || ''}
              onChange={(e) =>
                handleParamsChange({
                  leveringsdato_fra: e.target.value
                    ? `${e.target.value}T00:00:00`
                    : undefined,
                })
              }
            />

            <Input
              type="date"
              placeholder="Til dato"
              value={params.leveringsdato_til?.split('T')[0] || ''}
              onChange={(e) =>
                handleParamsChange({
                  leveringsdato_til: e.target.value
                    ? `${e.target.value}T23:59:59`
                    : undefined,
                })
              }
            />

            <Button
              variant="outline"
              onClick={() =>
                setParams({ page: 1, page_size: 50 })
              }
            >
              Nullstill filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedOrders.length} ordre(r) valgt
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBulkUpdate('KLAR_TIL_PLUKKING')}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Merk som klar til plukking
                </Button>
                <Button
                  onClick={() => handleBulkUpdate('PLUKKET')}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Merk som plukket
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ordrer</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-muted-foreground">Laster...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          orders?.items &&
                          orders.items.length > 0 &&
                          selectedOrders.length === orders.items.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Kundegruppe</TableHead>
                    <TableHead>Leveringsdato</TableHead>
                    <TableHead>Ordrestatus</TableHead>
                    <TableHead>Plukkstatus</TableHead>
                    <TableHead>Pakkseddel</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.items?.map((ordre) => (
                    <TableRow key={ordre.ordreid}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(ordre.ordreid)}
                          onCheckedChange={(checked) =>
                            handleSelectOrder(ordre.ordreid, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        #{ordre.ordreid}
                      </TableCell>
                      <TableCell>{ordre.kundenavn || '-'}</TableCell>
                      <TableCell>{ordre.kundegruppe_navn || '-'}</TableCell>
                      <TableCell>
                        {ordre.leveringsdato
                          ? new Date(ordre.leveringsdato).toLocaleDateString('no-NO')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {ordre.ordrestatus_navn ? (
                          <Badge variant="outline">{ordre.ordrestatus_navn}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ordre.plukkstatus ? (
                          <Badge className={statusColors[ordre.plukkstatus] || 'bg-gray-100'}>
                            {ordre.plukkstatus === 'KLAR_TIL_PLUKKING'
                              ? 'Klar'
                              : ordre.plukkstatus === 'PLUKKET'
                              ? 'Plukket'
                              : ordre.plukkstatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ordre.pakkseddel_skrevet ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            {new Date(ordre.pakkseddel_skrevet).toLocaleDateString('no-NO')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title="Registrer plukk"
                          >
                            <Link href={`/plukking/registrer/${ordre.ordreid}`}>
                              <ClipboardEdit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPlukkliste(ordre.ordreid)}
                            title="Last ned plukkliste"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPakkseddel(ordre.ordreid)}
                            title="Last ned pakkseddel"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                          {ordre.plukkstatus !== 'KLAR_TIL_PLUKKING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(ordre.ordreid, 'KLAR_TIL_PLUKKING')
                              }
                              title="Merk som klar til plukking"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
                          {ordre.plukkstatus !== 'PLUKKET' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(ordre.ordreid, 'PLUKKET')}
                              title="Merk som plukket"
                            >
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!orders?.items || orders.items.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-8"
                      >
                        Ingen ordrer funnet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {orders && orders.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Viser {((params.page || 1) - 1) * (params.page_size || 50) + 1} til{' '}
                    {Math.min(
                      (params.page || 1) * (params.page_size || 50),
                      orders.total
                    )}{' '}
                    av {orders.total} ordrer
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleParamsChange({ page: (params.page || 1) - 1 })
                      }
                      disabled={(params.page || 1) <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Side {params.page || 1} av {orders.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleParamsChange({ page: (params.page || 1) + 1 })
                      }
                      disabled={(params.page || 1) >= orders.total_pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
