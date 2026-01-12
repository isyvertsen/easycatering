"use client"

import { useState } from "react"
import { Loader2, Plus, Search, UtensilsCrossed } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

import { useTilgjengeligeMenyer, useTilordneMenyer } from "@/hooks/usePeriodeView"

interface TilordneMenyerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodeId: number
}

export function TilordneMenyerDialog({
  open,
  onOpenChange,
  periodeId
}: TilordneMenyerDialogProps) {
  const [selectedMenyIds, setSelectedMenyIds] = useState<number[]>([])
  const [search, setSearch] = useState("")

  const { data: tilgjengeligeMenyer, isLoading } = useTilgjengeligeMenyer(open ? periodeId : undefined)
  const tilordneMutation = useTilordneMenyer()

  // Filter menus by search
  const filteredMenyer = tilgjengeligeMenyer?.filter((meny) =>
    meny.beskrivelse.toLowerCase().includes(search.toLowerCase()) ||
    meny.menygruppe_beskrivelse.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Group menus by menygruppe
  const groupedMenyer = filteredMenyer.reduce((groups, meny) => {
    const group = meny.menygruppe_beskrivelse
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(meny)
    return groups
  }, {} as Record<string, typeof filteredMenyer>)

  const handleToggle = (menyId: number) => {
    setSelectedMenyIds((prev) =>
      prev.includes(menyId)
        ? prev.filter((id) => id !== menyId)
        : [...prev, menyId]
    )
  }

  const handleSelectAll = () => {
    if (selectedMenyIds.length === filteredMenyer.length) {
      setSelectedMenyIds([])
    } else {
      setSelectedMenyIds(filteredMenyer.map((m) => m.menyid))
    }
  }

  const handleSubmit = async () => {
    if (selectedMenyIds.length === 0) return

    await tilordneMutation.mutateAsync({
      periodeId,
      menyIds: selectedMenyIds
    })

    setSelectedMenyIds([])
    setSearch("")
    onOpenChange(false)
  }

  const handleClose = () => {
    setSelectedMenyIds([])
    setSearch("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Legg til menyer
          </DialogTitle>
          <DialogDescription>
            Velg menyer som skal legges til i denne perioden
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sok etter menyer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select all */}
          {filteredMenyer.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedMenyIds.length === filteredMenyer.length ? "Fjern alle" : "Velg alle"}
              </Button>
              <Badge variant="secondary">
                {selectedMenyIds.length} av {filteredMenyer.length} valgt
              </Badge>
            </div>
          )}

          {/* Menu list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMenyer.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <UtensilsCrossed className="h-8 w-8 mb-2" />
                <p>Ingen tilgjengelige menyer funnet</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {Object.entries(groupedMenyer).map(([gruppe, menyer]) => (
                  <div key={gruppe}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      {gruppe}
                    </h4>
                    <div className="space-y-2">
                      {menyer.map((meny) => (
                        <label
                          key={meny.menyid}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMenyIds.includes(meny.menyid)}
                            onCheckedChange={() => handleToggle(meny.menyid)}
                          />
                          <span className="flex-1">{meny.beskrivelse}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={tilordneMutation.isPending}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedMenyIds.length === 0 || tilordneMutation.isPending}
          >
            {tilordneMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Legger til...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Legg til {selectedMenyIds.length} menyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
