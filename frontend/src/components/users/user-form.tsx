"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bruker } from "@/types/models"
import { useEmployeesList } from "@/hooks/useEmployees"
import { useCustomersList } from "@/hooks/useCustomers"
import { useQuery } from "@tanstack/react-query"
import { systemSettingsApi } from "@/lib/api/system-settings"

const brukerSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  full_name: z.string().min(1, "Navn er påkrevd"),
  password: z.string().min(8, "Passord må være minst 8 tegn").optional().or(z.literal("")),
  ansattid: z.coerce.number().optional().nullable(),
  kundeids: z.array(z.number()).optional(),
  rolle: z.string().default("bruker"),
  is_active: z.boolean().default(true),
})

export type BrukerFormValues = z.infer<typeof brukerSchema>

interface UserFormProps {
  bruker?: Bruker
  onSubmit: (data: BrukerFormValues) => void
  onCancel: () => void
  loading?: boolean
}

const ROLLER = [
  { value: "bruker", label: "Bruker" },
  { value: "admin", label: "Administrator" },
  { value: "webshop", label: "Webshop" },
]

export function UserForm({ bruker, onSubmit, onCancel, loading }: UserFormProps) {
  const { data: employeesData } = useEmployeesList({ page_size: 1000 })
  const { data: customersData } = useCustomersList({ page_size: 1000 })

  // Fetch kundegruppe filter setting
  const { data: kundegruppeFilter } = useQuery({
    queryKey: ['system-settings', 'user-kundegruppe-filter'],
    queryFn: () => systemSettingsApi.getUserKundegruppeFilter(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const sortedEmployees = useMemo(() => {
    if (!employeesData?.items) return []
    return [...employeesData.items]
      .filter(emp => !emp.sluttet)
      .sort((a, b) =>
        `${a.fornavn} ${a.etternavn}`.localeCompare(
          `${b.fornavn} ${b.etternavn}`,
          'no'
        )
      )
  }, [employeesData?.items])

  // Filter to only active customers, optionally by kundegruppe, and sort by name
  const sortedCustomers = useMemo(() => {
    if (!customersData?.items) return []
    const allowedGrupper = kundegruppeFilter?.gruppe_ids || []

    return [...customersData.items]
      .filter(kunde => {
        // Must be active
        if (kunde.kundeinaktiv || kunde.avsluttet) return false
        // If filter is set, only show customers in those groups
        if (allowedGrupper.length > 0) {
          return kunde.kundegruppe != null && allowedGrupper.includes(kunde.kundegruppe)
        }
        return true
      })
      .sort((a, b) =>
        (a.kundenavn || '').localeCompare(b.kundenavn || '', 'no')
      )
  }, [customersData?.items, kundegruppeFilter?.gruppe_ids])

  // Use bruker ID as key to force re-render when editing different users
  const formKey = bruker?.id?.toString() || 'new'

  const form = useForm<BrukerFormValues>({
    resolver: zodResolver(brukerSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      ansattid: null,
      kundeids: [],
      rolle: "bruker",
      is_active: true,
    },
  })

  useEffect(() => {
    if (bruker) {
      // Extract kundeids from kunder relationship
      const kundeids = bruker.kunder?.map(k => k.kundeid) || []
      form.reset({
        email: bruker.email,
        full_name: bruker.full_name,
        password: "",
        ansattid: bruker.ansattid || null,
        kundeids: kundeids,
        rolle: bruker.rolle || "bruker",
        is_active: bruker.is_active,
      })
    } else {
      // Reset to default values when creating new user
      form.reset({
        email: "",
        full_name: "",
        password: "",
        ansattid: null,
        kundeids: [],
        rolle: "bruker",
        is_active: true,
      })
    }
  }, [bruker, form])

  const handleSubmit = (data: BrukerFormValues) => {
    const submitData = { ...data }
    if (!submitData.password) {
      delete (submitData as any).password
    }
    if (submitData.ansattid === null || submitData.ansattid === 0) {
      submitData.ansattid = undefined
    }
    onSubmit(submitData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" key={formKey}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fullt navn</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ola Nordmann" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-postadresse</FormLabel>
                <FormControl>
                  <Input type="email" {...field} placeholder="ola@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hide password field for OAuth users (users with google_id) */}
          {!bruker?.google_id && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{bruker ? "Nytt passord (valgfritt)" : "Passord"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder={bruker ? "La stå tom for å beholde" : "Minst 8 tegn"}
                    />
                  </FormControl>
                  <FormDescription>
                    {bruker
                      ? "Fyll inn kun hvis du vil endre passordet"
                      : "Passord må være minst 8 tegn"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {bruker?.google_id && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Denne brukeren logger inn med Google-konto. Passord kan ikke endres her.
              </p>
            </div>
          )}

          <FormField
            control={form.control}
            name="rolle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rolle</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {ROLLER.map((rolle) => (
                      <option key={rolle.value} value={rolle.value}>
                        {rolle.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormDescription>
                  Administratorer kan administrere brukere og system
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ansattid"
            render={({ field }) => {
              const selectValue = field.value?.toString() || ""
              return (
                <FormItem className="md:col-span-2">
                  <FormLabel>Tilknyttet ansatt</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={selectValue}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === "" ? null : parseInt(value))
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Ingen tilknytning</option>
                      {sortedEmployees.map((emp) => (
                        <option
                          key={emp.ansattid}
                          value={emp.ansattid.toString()}
                        >
                          {emp.fornavn} {emp.etternavn}
                          {emp.e_postjobb && ` (${emp.e_postjobb})`}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Koble brukerkontoen til en ansatt i systemet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <FormField
            control={form.control}
            name="kundeids"
            render={({ field }) => {
              const selectedIds = field.value || []
              const [kundeSearch, setKundeSearch] = useState("")

              // Filter and sort: selected first, then by search, then alphabetically
              const displayedCustomers = useMemo(() => {
                let filtered = sortedCustomers

                // Apply search filter
                if (kundeSearch.trim()) {
                  const searchLower = kundeSearch.toLowerCase()
                  filtered = filtered.filter(kunde =>
                    kunde.kundenavn?.toLowerCase().includes(searchLower) ||
                    kunde.avdeling?.toLowerCase().includes(searchLower)
                  )
                }

                // Sort: selected first, then alphabetically
                return [...filtered].sort((a, b) => {
                  const aSelected = selectedIds.includes(a.kundeid)
                  const bSelected = selectedIds.includes(b.kundeid)
                  if (aSelected && !bSelected) return -1
                  if (!aSelected && bSelected) return 1
                  return (a.kundenavn || '').localeCompare(b.kundenavn || '', 'no')
                })
              }, [sortedCustomers, selectedIds, kundeSearch])

              return (
                <FormItem className="md:col-span-2">
                  <FormLabel>Tilknyttede kunder</FormLabel>
                  <FormDescription className="mb-2">
                    Velg hvilke kunder denne brukeren kan bestille på vegne av (for webshop-brukere)
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="Søk etter kunde..."
                        value={kundeSearch}
                        onChange={(e) => setKundeSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-64 overflow-y-auto rounded-md border border-input p-3 space-y-2">
                        {displayedCustomers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {kundeSearch ? "Ingen kunder matcher søket" : "Ingen aktive kunder funnet"}
                          </p>
                        ) : (
                          displayedCustomers.map((kunde) => {
                            const isSelected = selectedIds.includes(kunde.kundeid)
                            return (
                              <div
                                key={kunde.kundeid}
                                className={`flex items-center space-x-2 p-1 rounded ${isSelected ? 'bg-primary/10' : ''}`}
                              >
                                <Checkbox
                                  id={`kunde-${kunde.kundeid}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...selectedIds, kunde.kundeid])
                                    } else {
                                      field.onChange(selectedIds.filter(id => id !== kunde.kundeid))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`kunde-${kunde.kundeid}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {kunde.kundenavn}
                                  {kunde.avdeling && ` - ${kunde.avdeling}`}
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </FormControl>
                  {selectedIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedIds.length} kunde{selectedIds.length > 1 ? 'r' : ''} valgt
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Aktiv</FormLabel>
                  <FormDescription>
                    Inaktive brukere kan ikke logge inn
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Avbryt
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Lagrer..." : bruker ? "Oppdater" : "Opprett"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
