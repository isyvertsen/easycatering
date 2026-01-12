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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  useAppLogsList,
  useAppLogStats,
  useLogLevels,
  useExceptionTypes,
  useExportAppLogs,
} from '@/hooks/useAppLogs'
import { AppLogListParams, AppLog } from '@/lib/api/app-logs'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  TrendingUp,
  BarChart3,
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

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']

const levelColors: Record<string, string> = {
  ERROR: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  INFO: 'bg-blue-100 text-blue-800',
  DEBUG: 'bg-gray-100 text-gray-800',
}

const levelIcons: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="h-4 w-4 text-red-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  DEBUG: <Bug className="h-4 w-4 text-gray-500" />,
}

function LogDetailDialog({ log }: { log: AppLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {levelIcons[log.level]}
            <span>{log.level}</span>
            <span className="text-muted-foreground text-sm">
              {log.logger_name}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Melding</h4>
            <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
              {log.message}
            </p>
          </div>

          {log.exception_type && (
            <div>
              <h4 className="font-semibold mb-1">Unntak</h4>
              <p className="text-sm">
                <span className="text-red-600 font-mono">{log.exception_type}</span>
                {log.exception_message && (
                  <span className="text-muted-foreground">: {log.exception_message}</span>
                )}
              </p>
            </div>
          )}

          {log.traceback && (
            <div>
              <h4 className="font-semibold mb-1">Traceback</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre">
                {log.traceback}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Kilde</h4>
              <p className="text-muted-foreground">
                {log.module}.{log.function_name}:{log.line_number}
              </p>
              {log.path && (
                <p className="text-xs text-muted-foreground truncate" title={log.path}>
                  {log.path}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-1">Tidspunkt</h4>
              <p className="text-muted-foreground">
                {new Date(log.created_at).toLocaleString('no-NO')}
              </p>
            </div>
          </div>

          {(log.request_id || log.endpoint) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Request</h4>
                <p className="text-muted-foreground font-mono">{log.request_id || '-'}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Endepunkt</h4>
                <p className="text-muted-foreground">
                  {log.http_method} {log.endpoint || '-'}
                </p>
              </div>
            </div>
          )}

          {(log.user_id || log.user_email) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Bruker</h4>
                <p className="text-muted-foreground">
                  {log.user_email || `ID: ${log.user_id}`}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">IP-adresse</h4>
                <p className="text-muted-foreground">{log.ip_address || '-'}</p>
              </div>
            </div>
          )}

          {log.extra && Object.keys(log.extra).length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Ekstra data</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(log.extra, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AppLogPage() {
  const [params, setParams] = useState<AppLogListParams>({
    page: 1,
    page_size: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const { data: logs, isLoading } = useAppLogsList(params)
  const { data: stats } = useAppLogStats()
  const { data: levels } = useLogLevels()
  const { data: exceptionTypes } = useExceptionTypes()
  const exportMutation = useExportAppLogs()

  const handleParamsChange = (newParams: Partial<AppLogListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }

  const handleExport = () => {
    exportMutation.mutate(params)
  }

  // Prepare chart data
  const timeChartData = stats?.logs_over_time?.map((item) => ({
    period: item.period ? new Date(item.period).toLocaleString('no-NO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }) : '',
    count: item.count,
  })) || []

  const levelPieData = stats
    ? Object.entries(stats.logs_by_level).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Applikasjonslogger</h1>
          <p className="text-muted-foreground mt-1">
            System logger, feilmeldinger og debugging
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
            <CardTitle className="text-sm font-medium">Totalt logger</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_logs?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Siste 7 dager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feil</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.error_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ERROR-nivå logger
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advarsler</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.warning_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">WARNING-nivå logger</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.info_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">INFO-nivå logger</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Logger over tid
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
                      dataKey="count"
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
              Fordeling per nivå
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {levelPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={levelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {levelPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === 'ERROR' ? '#ef4444' :
                            entry.name === 'WARNING' ? '#f59e0b' :
                            entry.name === 'INFO' ? '#3b82f6' :
                            COLORS[index % COLORS.length]
                          }
                        />
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

      {/* Top Exceptions */}
      {stats?.top_exceptions && stats.top_exceptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Hyppigste feil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_exceptions.slice(0, 5).map((exc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-red-600 truncate">
                      {exc.exception_type}
                    </p>
                    {exc.exception_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {exc.exception_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <Badge variant="destructive">{exc.count}</Badge>
                    {exc.last_occurrence && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(exc.last_occurrence).toLocaleDateString('no-NO')}
                      </span>
                    )}
                  </div>
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
              value={params.level || 'all'}
              onValueChange={(v) => handleParamsChange({ level: v === 'all' ? undefined : v, page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle nivåer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle nivåer</SelectItem>
                {levels?.filter(l => l && l.trim() !== '').map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.exception_type || 'all'}
              onValueChange={(v) =>
                handleParamsChange({ exception_type: v === 'all' ? undefined : v, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle unntak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle unntak</SelectItem>
                {exceptionTypes?.filter(t => t && t.trim() !== '').map((type) => (
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
                    <TableHead className="w-[50px]">Nivå</TableHead>
                    <TableHead>Tidspunkt</TableHead>
                    <TableHead>Logger</TableHead>
                    <TableHead className="max-w-[400px]">Melding</TableHead>
                    <TableHead>Kilde</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.items?.map((log) => (
                    <TableRow key={log.id} className={log.level === 'ERROR' ? 'bg-red-50' : ''}>
                      <TableCell>
                        <Badge className={levelColors[log.level] || 'bg-gray-100'}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('no-NO')}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {log.logger_name?.split('.').pop() || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[400px] truncate" title={log.message}>
                          {log.exception_type && (
                            <span className="text-red-600 font-mono mr-1">
                              [{log.exception_type}]
                            </span>
                          )}
                          {log.message}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.function_name}:{log.line_number}
                      </TableCell>
                      <TableCell>
                        <LogDetailDialog log={log} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!logs?.items || logs.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                    Viser {((params.page || 1) - 1) * (params.page_size || 50) + 1} til{' '}
                    {Math.min((params.page || 1) * (params.page_size || 50), logs.total)} av{' '}
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
