"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Database,
  RefreshCw,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Loader2,
  ArrowRight
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface GTINStatistics {
  total_gtins: number
  pending: number
  synced: number
  failed: number
  last_sync: string | null
  last_sync_status: string | null
}

interface MatinfoProduct {
  id: number
  gtin: string
  name: string
  brand: string | null
  producer: string | null
  package_size: string | null
  last_updated: string | null
}

async function fetchStatistics(): Promise<GTINStatistics> {
  const response = await apiClient.get('/v1/matinfo/tracker/statistics')
  return response.data
}

async function fetchPendingGtins(limit: number = 50): Promise<string[]> {
  const response = await apiClient.get(`/v1/matinfo/tracker/pending?limit=${limit}`)
  return response.data
}

async function searchMatinfoProducts(query: string): Promise<MatinfoProduct[]> {
  if (!query.trim()) return []
  const response = await apiClient.get(`/v1/produkter/matinfo/search?query=${encodeURIComponent(query)}&limit=20`)
  return response.data
}

export default function MatinfoPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [daysBack, setDaysBack] = useState("7")

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['matinfo-stats'],
    queryFn: fetchStatistics,
    refetchInterval: 30000,
  })

  const { data: pendingGtins = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['matinfo-pending'],
    queryFn: () => fetchPendingGtins(10),
  })

  const { data: searchResults = [], isLoading: searchLoading, refetch: searchRefetch } = useQuery({
    queryKey: ['matinfo-search', searchQuery],
    queryFn: () => searchMatinfoProducts(searchQuery),
    enabled: searchQuery.length > 2,
  })

  const fetchUpdatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/v1/matinfo/tracker/fetch-updates?days_back=${daysBack}`)
      return response.data
    },
    onSuccess: (data) => {
      toast({
        title: "Oppdateringer hentet",
        description: `${data.new} nye, ${data.updated} oppdaterte GTIN-koder`,
      })
      queryClient.invalidateQueries({ queryKey: ['matinfo-stats'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-pending'] })
    },
    onError: (error) => {
      toast({
        title: "Feil",
        description: "Kunne ikke hente oppdateringer",
        variant: "destructive",
      })
    },
  })

  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/v1/matinfo/sync/products?days_back=${daysBack}`)
      return response.data
    },
    onSuccess: (data) => {
      toast({
        title: "Synkronisering fullført",
        description: `${data.synced} produkter synkronisert, ${data.failed} feilet`,
      })
      queryClient.invalidateQueries({ queryKey: ['matinfo-stats'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-pending'] })
    },
    onError: (error) => {
      toast({
        title: "Feil",
        description: "Kunne ikke synkronisere produkter",
        variant: "destructive",
      })
    },
  })

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      searchRefetch()
    }
  }

  const syncProgress = stats
    ? (stats.synced / Math.max(stats.total_gtins, 1)) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matinfo Administrasjon</h1>
          <p className="text-muted-foreground">
            Synkroniser og administrer produktdata fra Matinfo.no
          </p>
        </div>
        <Link href="/products/ean-management">
          <Button variant="outline">
            <Package className="mr-2 h-4 w-4" />
            GTIN-kobling
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt i database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.total_gtins.toLocaleString('nb-NO') || 0}
            </div>
            <p className="text-xs text-muted-foreground">Matinfo-produkter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synkronisert</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : stats?.synced.toLocaleString('nb-NO') || 0}
            </div>
            <Progress value={syncProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venter</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {statsLoading ? "..." : stats?.pending.toLocaleString('nb-NO') || 0}
            </div>
            <p className="text-xs text-muted-foreground">Venter på synkronisering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feilet</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? "..." : stats?.failed.toLocaleString('nb-NO') || 0}
            </div>
            <p className="text-xs text-muted-foreground">Trenger oppmerksomhet</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synkronisering
          </CardTitle>
          <CardDescription>
            Hent oppdateringer fra Matinfo.no og synkroniser produktdata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Dager tilbake:</span>
              <Select value={daysBack} onValueChange={setDaysBack}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dag</SelectItem>
                  <SelectItem value="7">7 dager</SelectItem>
                  <SelectItem value="14">14 dager</SelectItem>
                  <SelectItem value="30">30 dager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => fetchUpdatesMutation.mutate()}
              disabled={fetchUpdatesMutation.isPending}
            >
              {fetchUpdatesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Hent oppdateringer
            </Button>

            <Button
              onClick={() => syncProductsMutation.mutate()}
              disabled={syncProductsMutation.isPending}
              variant="default"
            >
              {syncProductsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Synkroniser produkter
            </Button>
          </div>

          {stats?.last_sync && (
            <p className="text-sm text-muted-foreground">
              Siste synkronisering: {new Date(stats.last_sync).toLocaleString('nb-NO')}
              {stats.last_sync_status && (
                <Badge variant="secondary" className="ml-2">
                  {stats.last_sync_status}
                </Badge>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending GTINs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ventende GTIN-koder
            </CardTitle>
            <CardDescription>
              GTIN-koder som venter på synkronisering
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingGtins.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ingen ventende GTIN-koder</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingGtins.map((gtin) => (
                  <div key={gtin} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <code className="text-sm font-mono">{gtin}</code>
                    <Badge variant="secondary">Venter</Badge>
                  </div>
                ))}
                {stats && stats.pending > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    ...og {stats.pending - 10} til
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Søk i Matinfo
            </CardTitle>
            <CardDescription>
              Søk etter produkter i Matinfo-databasen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Søk etter produktnavn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading || searchQuery.length < 3}>
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchResults.map((product: any) => (
                  <div key={product.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code>{product.gtin}</code>
                      {product.brand && <span>- {product.brand}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
