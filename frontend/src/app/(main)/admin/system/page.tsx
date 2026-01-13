"use client"

import { useBackendHealth } from "@/hooks/useBackendHealth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"

export default function SystemStatusPage() {
  const { health, checkHealth } = useBackendHealth()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'checking':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tilkoblet</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Advarsel</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Frakoblet</Badge>
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sjekker...</Badge>
      default:
        return <Badge variant="secondary">Ukjent</Badge>
    }
  }

  const getDatabaseStatusBadge = (dbStatus?: string) => {
    if (!dbStatus) return <Badge variant="secondary">Ukjent</Badge>
    if (dbStatus === 'connected') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tilkoblet</Badge>
    }
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Frakoblet</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Systemstatus</h1>
          <p className="text-gray-500 mt-2">Oversikt over systemets helsetilstand</p>
        </div>
        <Button onClick={checkHealth} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Oppdater status
        </Button>
      </div>

      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(health.status)}
            Overordnet status
          </CardTitle>
          <CardDescription>
            {health.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {getStatusBadge(health.status)}
            {health.lastChecked && (
              <span className="text-sm text-gray-500">
                Sist sjekket: {health.lastChecked.toLocaleTimeString('nb-NO')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Backend Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-blue-500" />
              Backend API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              {getStatusBadge(health.status)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Versjon</span>
              <span className="font-mono text-sm">{health.backendVersion || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Frontend Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-purple-500" />
              Frontend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Kjører</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Versjon</span>
              <span className="font-mono text-sm">{health.frontendVersion || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-orange-500" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              {getDatabaseStatusBadge(health.details?.database)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Navn</span>
              <span className="font-mono text-sm">{health.databaseName || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Response (for debugging) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API-respons</CardTitle>
          <CardDescription>Rådata fra /api/health/ready</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-auto">
            {JSON.stringify({
              status: health.status === 'healthy' ? 'ready' : health.status,
              version: health.backendVersion,
              frontend_version: health.frontendVersion,
              database: health.databaseName,
              checks: health.details,
              lastChecked: health.lastChecked?.toISOString()
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
