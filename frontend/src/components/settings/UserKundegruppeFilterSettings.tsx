"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useUserKundegruppeFilter, useUpdateUserKundegruppeFilter } from "@/hooks/useSystemSettings"
import { useKundegrupper } from "@/hooks/useKundegruppe"
import { Users, Loader2, Save } from "lucide-react"

export function UserKundegruppeFilterSettings() {
  const { data: filterData, isLoading: isLoadingFilter } = useUserKundegruppeFilter()
  const { data: kundegrupperData, isLoading: isLoadingGrupper } = useKundegrupper({ page_size: 100 })
  const updateFilter = useUpdateUserKundegruppeFilter()

  const [selectedGrupper, setSelectedGrupper] = useState<number[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize selected groups when data loads
  useEffect(() => {
    if (filterData) {
      setSelectedGrupper(filterData.gruppe_ids || [])
      setHasChanges(false)
    }
  }, [filterData])

  const toggleGruppe = (gruppeId: number) => {
    if (selectedGrupper.includes(gruppeId)) {
      setSelectedGrupper(selectedGrupper.filter(id => id !== gruppeId))
    } else {
      setSelectedGrupper([...selectedGrupper, gruppeId])
    }
    setHasChanges(true)
  }

  const handleSave = () => {
    updateFilter.mutate(selectedGrupper, {
      onSuccess: () => setHasChanges(false)
    })
  }

  if (isLoadingFilter || isLoadingGrupper) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const grupper = kundegrupperData?.items || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bruker-kundetilknytning
        </CardTitle>
        <CardDescription>
          Velg hvilke kundegrupper som skal vises i "Tilknyttede kunder"-listen
          når du redigerer brukere. Hvis ingen er valgt, vises alle aktive kunder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {grupper.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
            Ingen kundegrupper funnet i systemet.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Velg kundegrupper:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {grupper.map((gruppe) => (
                <div
                  key={gruppe.gruppeid}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent/50"
                >
                  <Checkbox
                    id={`gruppe-${gruppe.gruppeid}`}
                    checked={selectedGrupper.includes(gruppe.gruppeid)}
                    onCheckedChange={() => toggleGruppe(gruppe.gruppeid)}
                  />
                  <label
                    htmlFor={`gruppe-${gruppe.gruppeid}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {gruppe.gruppe}
                    {gruppe.webshop && (
                      <span className="ml-2 text-xs text-muted-foreground">(Webshop)</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedGrupper.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedGrupper.length} gruppe{selectedGrupper.length > 1 ? 'r' : ''} valgt
          </p>
        )}

        {selectedGrupper.length === 0 && grupper.length > 0 && (
          <p className="text-sm text-amber-600">
            Ingen grupper valgt - alle aktive kunder vil vises i bruker-tilknytning
          </p>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateFilter.isPending}
          >
            {updateFilter.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lagre filter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
