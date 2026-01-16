"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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

const brukerSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  full_name: z.string().min(1, "Navn er påkrevd"),
  password: z.string().min(8, "Passord må være minst 8 tegn").optional().or(z.literal("")),
  ansattid: z.coerce.number().optional().nullable(),
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
]

export function UserForm({ bruker, onSubmit, onCancel, loading }: UserFormProps) {
  const { data: employeesData } = useEmployeesList({ page_size: 1000 })

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

  // Use bruker ID as key to force re-render when editing different users
  const formKey = bruker?.id?.toString() || 'new'

  const form = useForm<BrukerFormValues>({
    resolver: zodResolver(brukerSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      ansattid: null,
      rolle: "bruker",
      is_active: true,
    },
  })

  useEffect(() => {
    if (bruker) {
      form.reset({
        email: bruker.email,
        full_name: bruker.full_name,
        password: "",
        ansattid: bruker.ansattid || null,
        rolle: bruker.rolle || "bruker",
        is_active: bruker.is_active,
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

          <FormField
            control={form.control}
            name="rolle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rolle</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg rolle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLLER.map((rolle) => (
                      <SelectItem key={rolle.value} value={rolle.value}>
                        {rolle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              const selectValue = field.value?.toString() || "__none__"
              return (
                <FormItem className="md:col-span-2">
                  <FormLabel>Tilknyttet ansatt</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "__none__" ? null : parseInt(value))
                    }
                    value={selectValue}
                    defaultValue={selectValue}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg ansatt (valgfritt)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Ingen tilknytning</SelectItem>
                      {sortedEmployees.map((emp) => (
                        <SelectItem
                          key={emp.ansattid}
                          value={emp.ansattid.toString()}
                        >
                          {emp.fornavn} {emp.etternavn}
                          {emp.e_postjobb && ` (${emp.e_postjobb})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
