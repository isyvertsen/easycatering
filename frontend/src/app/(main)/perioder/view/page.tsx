"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, addWeeks, startOfWeek, getISOWeek as dateFnsGetISOWeek, getYear } from "date-fns"
import { nb } from "date-fns/locale"
import { CalendarDays, Eye, Plus, Loader2, ChevronRight, CheckCircle2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { usePerioderList } from "@/hooks/usePerioder"
import { useOpprettPeriodeUke, useNestePeriodeForslag } from "@/hooks/usePeriodeView"
import { Periode } from "@/lib/api/perioder"

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Generate week info for display
function getWeekInfo(weekOffset: number): { aar: number; ukenr: number; fradato: Date; tildato: Date } {
  const today = new Date()
  const targetDate = addWeeks(today, weekOffset)
  const mondayOfWeek = startOfWeek(targetDate, { weekStartsOn: 1 })
  const sundayOfWeek = addWeeks(mondayOfWeek, 0)
  sundayOfWeek.setDate(mondayOfWeek.getDate() + 6)

  return {
    aar: getYear(mondayOfWeek),
    ukenr: dateFnsGetISOWeek(mondayOfWeek),
    fradato: mondayOfWeek,
    tildato: sundayOfWeek
  }
}

export default function PeriodeViewSelectorPage() {
  const router = useRouter()
  const { data: perioder, isLoading: isLoadingPerioder } = usePerioderList({ page_size: 100 })
  const { data: nestePeriodeForslag, isLoading: isLoadingForslag } = useNestePeriodeForslag()
  const opprettMutation = useOpprettPeriodeUke()

  // Generate weeks: 2 backward, current, 10 forward = 13 weeks total
  const weeksAroundToday = useMemo(() => {
    const weeks = []
    for (let i = -2; i <= 10; i++) {
      weeks.push({ offset: i, ...getWeekInfo(i) })
    }
    return weeks
  }, [])

  // Create a map of existing periods by week number for quick lookup
  const existingPeriodesByWeek = useMemo(() => {
    const map = new Map<string, Periode>()
    perioder?.items?.forEach((periode) => {
      // Create a key from year and week number
      const year = periode.fradato ? new Date(periode.fradato).getFullYear() : null
      if (year && periode.ukenr) {
        map.set(`${year}-${periode.ukenr}`, periode)
      }
    })
    return map
  }, [perioder])

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-"
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      return format(d, "dd.MM", { locale: nb })
    } catch {
      return "-"
    }
  }

  const handleSelectPeriode = (periodeId: string) => {
    router.push(`/perioder/${periodeId}/view`)
  }

  const handleOpprettPeriode = async (aar: number, ukenr: number) => {
    const result = await opprettMutation.mutateAsync({ aar, ukenr })
    router.push(`/perioder/${result.menyperiodeid}/view`)
  }

  const isLoading = isLoadingPerioder || isLoadingForslag

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-primary" />
          Periodevisning
        </h1>
        <p className="text-muted-foreground mt-2">
          Velg en periode for a se menystruktur med grupper, menyer og produkter
        </p>
      </div>

      {/* Weeks around today */}
      <Card>
        <CardHeader>
          <CardTitle>Kommende uker</CardTitle>
          <CardDescription>
            Klikk pa en uke for a se periodevisning, eller opprett en ny periode
            {nestePeriodeForslag && (
              <span className="ml-2 text-primary">
                Forslag: Uke {nestePeriodeForslag.ukenr} ({nestePeriodeForslag.aar})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {weeksAroundToday.map((week) => {
                const existingPeriode = existingPeriodesByWeek.get(`${week.aar}-${week.ukenr}`)
                const isCurrentWeek = week.offset === 0
                const isSuggestedWeek = nestePeriodeForslag &&
                  nestePeriodeForslag.aar === week.aar &&
                  nestePeriodeForslag.ukenr === week.ukenr

                return (
                  <Button
                    key={`${week.aar}-${week.ukenr}`}
                    variant={existingPeriode ? "default" : isSuggestedWeek ? "outline" : "ghost"}
                    className={`h-auto py-3 px-4 flex flex-col items-start gap-1 relative ${
                      isCurrentWeek ? "ring-2 ring-primary ring-offset-2" : ""
                    } ${isSuggestedWeek && !existingPeriode ? "border-primary border-2" : ""}`}
                    onClick={() => {
                      if (existingPeriode) {
                        router.push(`/perioder/${existingPeriode.menyperiodeid}/view`)
                      } else {
                        handleOpprettPeriode(week.aar, week.ukenr)
                      }
                    }}
                    disabled={opprettMutation.isPending}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-semibold">Uke {week.ukenr}</span>
                      {isCurrentWeek && (
                        <Badge variant="secondary" className="text-xs">Na</Badge>
                      )}
                      {isSuggestedWeek && !existingPeriode && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">Neste</Badge>
                      )}
                    </div>
                    <span className="text-xs opacity-70">
                      {formatDate(week.fradato)} - {formatDate(week.tildato)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      {existingPeriode ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-xs">Opprettet</span>
                          <Eye className="h-3 w-3 ml-auto" />
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          <span className="text-xs">Opprett</span>
                        </>
                      )}
                    </div>
                    {opprettMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-2" />
                    )}
                  </Button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All periods dropdown */}
      <Card>
        <CardHeader>
          <CardTitle>Alle perioder</CardTitle>
          <CardDescription>
            Velg fra listen for a se eldre perioder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingPerioder ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <Select onValueChange={handleSelectPeriode}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg en periode..." />
                </SelectTrigger>
                <SelectContent>
                  {perioder?.items?.map((periode) => (
                    <SelectItem
                      key={periode.menyperiodeid}
                      value={periode.menyperiodeid.toString()}
                    >
                      Uke {periode.ukenr} ({format(new Date(periode.fradato || ''), "dd.MM.yyyy", { locale: nb })} - {format(new Date(periode.tildato || ''), "dd.MM.yyyy", { locale: nb })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-sm text-muted-foreground">
                {perioder?.total || 0} perioder tilgjengelig
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
