"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Search, Users, Calculator } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Kalkyle {
  kalkylekode: number
  kalkylenavn: string
  antallporsjoner: number | null
  kategorikode: string | null
  informasjon: string | null
  opprettetdato: string | null
}

export default function KalkylerPage() {
  const router = useRouter()
  const [kalkyler, setKalkyler] = useState<Kalkyle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchKalkyler()
  }, [])

  const fetchKalkyler = async () => {
    try {
      const response = await apiClient.get("/v1/oppskrifter/")
      setKalkyler(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kalkyler")
      console.error("Error fetching kalkyler:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredKalkyler = kalkyler.filter((kalkyle) =>
    kalkyle.kalkylenavn.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ChefHat className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg">Laster oppskrifter...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Feil</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchKalkyler} className="mt-4">
              Prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="h-8 w-8" />
            Oppskrifter (Kalkyler)
          </h1>
          <p className="text-muted-foreground mt-2">
            Oversikt over alle oppskrifter med næringsberegning
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Søk etter oppskrift..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Kalkyler Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredKalkyler.map((kalkyle) => (
          <Card
            key={kalkyle.kalkylekode}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/kalkyler/${kalkyle.kalkylekode}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {kalkyle.kalkylenavn}
                  </CardTitle>
                  {kalkyle.kategorikode && (
                    <Badge variant="secondary" className="mt-2">
                      {kalkyle.kategorikode}
                    </Badge>
                  )}
                </div>
                <Calculator className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {kalkyle.antallporsjoner && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {kalkyle.antallporsjoner} porsjoner
                  </div>
                )}
                {kalkyle.informasjon && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {kalkyle.informasjon}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredKalkyler.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">
              {searchTerm
                ? "Ingen oppskrifter funnet"
                : "Ingen oppskrifter tilgjengelig"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground text-center">
            Viser {filteredKalkyler.length} av {kalkyler.length} oppskrifter
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
