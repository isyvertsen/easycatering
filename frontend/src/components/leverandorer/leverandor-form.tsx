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
import { Leverandor } from "@/types/models"

const leverandorSchema = z.object({
  leverandornavn: z.string().min(1, "Leverandørnavn er påkrevd"),
  refkundenummer: z.string().optional(),
  adresse: z.string().optional(),
  postnummer: z.string().optional(),
  poststed: z.string().optional(),
  telefonnummer: z.string().optional(),
  e_post: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  webside: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  bestillingsnr: z.string().optional(),
  utgatt: z.boolean().default(false),
})

export type LeverandorFormValues = z.infer<typeof leverandorSchema>

interface LeverandorFormProps {
  leverandor?: Leverandor
  onSubmit: (data: LeverandorFormValues) => void
  onCancel: () => void
  loading?: boolean
}

export function LeverandorForm({ leverandor, onSubmit, onCancel, loading }: LeverandorFormProps) {
  const form = useForm<LeverandorFormValues>({
    resolver: zodResolver(leverandorSchema),
    defaultValues: {
      leverandornavn: "",
      refkundenummer: "",
      adresse: "",
      postnummer: "",
      poststed: "",
      telefonnummer: "",
      e_post: "",
      webside: "",
      bestillingsnr: "",
      utgatt: false,
    },
  })

  useEffect(() => {
    if (leverandor) {
      form.reset({
        leverandornavn: leverandor.leverandornavn || "",
        refkundenummer: leverandor.refkundenummer || "",
        adresse: leverandor.adresse || "",
        postnummer: leverandor.postnummer || "",
        poststed: leverandor.poststed || "",
        telefonnummer: leverandor.telefonnummer || "",
        e_post: leverandor.e_post || "",
        webside: leverandor.webside || "",
        bestillingsnr: leverandor.bestillingsnr || "",
        utgatt: leverandor.utgatt || false,
      })
    }
  }, [leverandor, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="leverandornavn"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Leverandørnavn *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Navn på leverandør" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="refkundenummer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kundenummer hos leverandør</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Vårt kundenummer" />
                </FormControl>
                <FormDescription>
                  Kundenummeret vi har hos denne leverandøren
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bestillingsnr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bestillingsnummer</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Bestillingsnummer" />
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
                  <Input {...field} placeholder="Gateadresse" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postnummer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postnummer</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="0000" />
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
                  <Input {...field} placeholder="Sted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telefonnummer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+47 00 00 00 00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="e_post"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-post</FormLabel>
                <FormControl>
                  <Input type="email" {...field} placeholder="post@leverandor.no" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="webside"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nettside</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://www.leverandor.no" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utgatt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Utgått / Inaktiv
                  </FormLabel>
                  <FormDescription>
                    Marker hvis leverandøren ikke lenger er i bruk
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
            {loading ? "Lagrer..." : leverandor ? "Oppdater" : "Opprett"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
