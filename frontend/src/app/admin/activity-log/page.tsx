'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  useActivityLogsList,
  useActivityLogsStats,
  useActivityLogActions,
  useActivityLogResourceTypes,
  useExportActivityLogs,
} from '@/hooks/useActivityLogs'
import { ActivityLogListParams } from '@/lib/api/activity-logs'
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Users,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  VIEW: 'bg-gray-100 text-gray-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-orange-100 text-orange-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
  ERROR: 'bg-red-200 text-red-900',
  BULK_DELETE: 'bg-red-100 text-red-800',
}

export default function ActivityLogPage() {
  const [params, setParams] = useState<ActivityLogListParams>({
    page: 1,
    page_size: 25,
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const { data: logs, isLoading } = useActivityLogsList(params)
  const { data: stats } = useActivityLogsStats()
  const { data: actions } = useActivityLogActions()
  const { data: resourceTypes } = useActivityLogResourceTypes()
  const exportMutation = useExportActivityLogs()

  const handleParamsChange = (newParams: Partial<ActivityLogListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }

  const handleExport = () => {
    exportMutation.mutate(params)
  }

  // Prepare chart data
  const timeChartData = stats?.requests_over_time?.map((item) => ({
    period: item.period ? new Date(item.period).toLocaleString('no-NO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }) : '',
    requests: item.count,
  })) || []

  const actionPieData = stats
    ? Object.entries(stats.requests_by_action).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aktivitetslogg</h1>
          <p className="text-muted-foreground mt-1">
            Oversikt over systemaktivitet og API-metrikker
          </p>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          <Download className="h-4 w-4 mr-2" />
          Eksporter CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt foresporsler</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_requests?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Siste 7 dager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feil</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.total_errors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.error_rate || 0}% feilrate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gj.snitt responstid</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats?.avg_response_time_ms || 0)} ms
            </div>
            <p className="text-xs text-muted-foreground">API responstid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive brukere</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.requests_by_user?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Unike brukere</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aktivitet over tid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {timeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Ingen data tilgjengelig
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Handlinger fordeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {actionPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={actionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {actionPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Ingen data tilgjengelig
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      {stats?.requests_by_user && stats.requests_by_user.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mest aktive brukere</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
              {stats.requests_by_user.slice(0, 5).map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground">{index + 1}.</span>
                    <span className="text-sm truncate max-w-[120px]" title={user.name || user.email}>
                      {user.name || user.email}
                    </span>
                  </div>
                  <Badge variant="secondary">{user.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              placeholder="Sok..."
              value={params.search || ''}
              onChange={(e) => handleParamsChange({ search: e.target.value || undefined, page: 1 })}
            />

            <Select
              value={params.action || 'all'}
              onValueChange={(v) => handleParamsChange({ action: v === 'all' ? undefined : v, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle handlinger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle handlinger</SelectItem>
                {actions?.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.resource_type || 'all'}
              onValueChange={(v) =>
                handleParamsChange({ resource_type: v === 'all' ? undefined : v, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle ressurser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle ressurser</SelectItem>
                {resourceTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={params.date_from?.split('T')[0] || ''}
              onChange={(e) =>
                handleParamsChange({
                  date_from: e.target.value ? `${e.target.value}T00:00:00` : undefined,
                  page: 1,
                })
              }
            />

            <Input
              type="date"
              value={params.date_to?.split('T')[0] || ''}
              onChange={(e) =>
                handleParamsChange({
                  date_to: e.target.value ? `${e.target.value}T23:59:59` : undefined,
                  page: 1,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loggoppforinger</CardTitle>
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
                    <TableHead>Tidspunkt</TableHead>
                    <TableHead>Bruker</TableHead>
                    <TableHead>Handling</TableHead>
                    <TableHead>Ressurs</TableHead>
                    <TableHead>Endepunkt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.items?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString('no-NO')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_name || log.user_email || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || 'bg-gray-100'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.resource_type}</TableCell>
                      <TableCell className="text-sm">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[200px] truncate block">
                          {log.endpoint || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.response_status ? (
                          <span className={log.response_status >= 400 ? 'text-red-600' : 'text-green-600'}>
                            {log.response_status}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!logs?.items || logs.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Ingen loggoppforinger funnet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {logs && logs.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Viser {((params.page || 1) - 1) * (params.page_size || 25) + 1} til{' '}
                    {Math.min((params.page || 1) * (params.page_size || 25), logs.total)} av{' '}
                    {logs.total} oppforinger
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleParamsChange({ page: (params.page || 1) - 1 })}
                      disabled={(params.page || 1) <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Side {params.page || 1} av {logs.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleParamsChange({ page: (params.page || 1) + 1 })}
                      disabled={(params.page || 1) >= logs.total_pages}
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
