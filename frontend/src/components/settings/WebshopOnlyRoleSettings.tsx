"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWebshopOnlyRole, useUpdateWebshopOnlyRole } from "@/hooks/useSystemSettings"
import { ShoppingCart, Loader2, Save, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Available roles that can be set as webshop-only
const AVAILABLE_ROLES = [
  { value: "webshop", label: "Webshop" },
  { value: "kunde", label: "Kunde" },
  { value: "ekstern", label: "Ekstern" },
]

export function WebshopOnlyRoleSettings() {
  const { data: roleData, isLoading } = useWebshopOnlyRole()
  const updateRole = useUpdateWebshopOnlyRole()

  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize selected role when data loads
  useEffect(() => {
    if (roleData !== undefined) {
      setSelectedRole(roleData.role)
      setHasChanges(false)
    }
  }, [roleData])

  const handleRoleChange = (value: string) => {
    if (value === "none") {
      setSelectedRole(null)
    } else {
      setSelectedRole(value)
    }
    setHasChanges(true)
  }

  const handleSave = () => {
    updateRole.mutate(selectedRole, {
      onSuccess: () => setHasChanges(false)
    })
  }

  if (isLoading) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Webshop-bare tilgang
        </CardTitle>
        <CardDescription>
          Velg hvilken rolle som kun skal ha tilgang til webshop.
          Brukere med denne rollen vil bli omdirigert til webshop ved innlogging
          og vil ikke ha tilgang til hovedapplikasjonen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webshop-bare rolle:</label>
          <Select
            value={selectedRole || "none"}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Velg rolle..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen (deaktivert)</SelectItem>
              {AVAILABLE_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRole && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Brukere med rollen "{selectedRole}" vil kun ha tilgang til webshop.
              Ved innlogging omdirigeres de automatisk til /webshop og kan ikke
              navigere til andre deler av systemet.
            </AlertDescription>
          </Alert>
        )}

        {!selectedRole && (
          <p className="text-sm text-muted-foreground">
            Ingen rolle er valgt - alle roller har full tilgang til systemet.
          </p>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateRole.isPending}
          >
            {updateRole.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lagre innstilling
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
