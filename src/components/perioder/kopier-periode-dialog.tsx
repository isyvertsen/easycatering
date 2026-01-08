"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Copy, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { useOpprettPeriodeUke, useNestePeriodeForslag } from "@/hooks/usePeriodeView"

interface KopierPeriodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kildePeriodeId: number
  kildeUkenr: number
}

export function KopierPeriodeDialog({
  open,
  onOpenChange,
  kildePeriodeId,
  kildeUkenr
}: KopierPeriodeDialogProps) {
  const router = useRouter()
  const opprettMutation = useOpprettPeriodeUke()
  const { data: nestePeriodeForslag } = useNestePeriodeForslag()

  const currentYear = new Date().getFullYear()

  const [formData, setFormData] = useState({
    aar: currentYear,
    ukenr: kildeUkenr + 1 > 52 ? 1 : kildeUkenr + 1
  })

  // Use smart suggestion from API if available, otherwise fall back to simple calculation
  useEffect(() => {
    if (nestePeriodeForslag) {
      setFormData({
        aar: nestePeriodeForslag.aar,
        ukenr: nestePeriodeForslag.ukenr
      })
    } else if (kildeUkenr >= 52) {
      setFormData({
        aar: currentYear + 1,
        ukenr: 1
      })
    } else {
      setFormData({
        aar: currentYear,
        ukenr: kildeUkenr + 1
      })
    }
  }, [kildeUkenr, currentYear, nestePeriodeForslag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await opprettMutation.mutateAsync({
      aar: formData.aar,
      ukenr: formData.ukenr
    })

    onOpenChange(false)

    // Navigate to the new period
    router.push(`/perioder/${result.menyperiodeid}/view`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Opprett neste periode
          </DialogTitle>
          <DialogDescription>
            Opprett en ny periode basert pa uke {kildeUkenr}. Datoene beregnes automatisk (mandag-sondag).
            {nestePeriodeForslag && (
              <span className="block mt-2">
                <Badge variant="outline" className="text-xs">
                  Forslag fra system: Uke {nestePeriodeForslag.ukenr} ({nestePeriodeForslag.aar})
                </Badge>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aar">
                <Calendar className="h-4 w-4 inline mr-1" />
                Ar
              </Label>
              <Input
                id="aar"
                type="number"
                min={currentYear}
                max={currentYear + 2}
                value={formData.aar}
                onChange={(e) => setFormData({ ...formData, aar: parseInt(e.target.value) || currentYear })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ukenr">Ukenummer</Label>
              <Input
                id="ukenr"
                type="number"
                min={1}
                max={53}
                value={formData.ukenr}
                onChange={(e) => setFormData({ ...formData, ukenr: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Perioden vil starte pa mandag i uke {formData.ukenr} og avsluttes pa sondag.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={opprettMutation.isPending}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={opprettMutation.isPending}>
              {opprettMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oppretter...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Opprett periode
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
