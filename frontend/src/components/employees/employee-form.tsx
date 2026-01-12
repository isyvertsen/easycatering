"use client"

import { useEffect } from "react"
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
import { Employee } from "@/types/models"

const employeeSchema = z.object({
  fornavn: z.string().min(1, "Fornavn er påkrevd"),
  etternavn: z.string().min(1, "Etternavn er påkrevd"),
  tittel: z.string().optional(),
  avdeling: z.string().optional(),
  adresse: z.string().optional(),
  postnr: z.string().optional(),
  poststed: z.string().optional(),
  tlfprivat: z.string().optional(),
  e_postjobb: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  e_postprivat: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  fodselsdato: z.string().optional(),
  stillings_prosent: z.number().optional(),
  sluttet: z.boolean().default(false),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: Employee
  onSubmit: (data: EmployeeFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function EmployeeForm({ employee, onSubmit, onCancel, loading }: EmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fornavn: "",
      etternavn: "",
      tittel: "",
      avdeling: "",
      adresse: "",
      postnr: "",
      poststed: "",
      tlfprivat: "",
      e_postjobb: "",
      e_postprivat: "",
      fodselsdato: "",
      stillings_prosent: undefined,
      sluttet: false,
    },
  })

  useEffect(() => {
    if (employee) {
      form.reset({
        fornavn: employee.fornavn,
        etternavn: employee.etternavn,
        tittel: employee.tittel || "",
        avdeling: employee.avdeling || "",
        adresse: employee.adresse || "",
        postnr: employee.postnr || "",
        poststed: employee.poststed || "",
        tlfprivat: employee.tlfprivat || "",
        e_postjobb: employee.e_postjobb || "",
        e_postprivat: employee.e_postprivat || "",
        fodselsdato: employee.fodselsdato || "",
        stillings_prosent: employee.stillings_prosent || undefined,
        sluttet: employee.sluttet || false,
      })
    }
  }, [employee, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fornavn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornavn</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="etternavn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etternavn</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tittel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tittel</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avdeling"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avdeling</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fodselsdato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fødselsdato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stillings_prosent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stillingsprosent</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adresse"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Adresse</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postnr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postnummer</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="poststed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poststed</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tlfprivat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon (privat)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="e_postjobb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-post (jobb)</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="e_postprivat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-post (privat)</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sluttet"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Sluttet
                  </FormLabel>
                  <FormDescription>
                    Marker hvis den ansatte har sluttet
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
            {loading ? "Lagrer..." : employee ? "Oppdater" : "Opprett"}
          </Button>
        </div>
      </form>
    </Form>
  )
}