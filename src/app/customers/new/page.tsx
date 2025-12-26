"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useCreateCustomer } from "@/hooks/useCustomers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Phone, Mail, MapPin } from "lucide-react"
import { Customer } from "@/types/models"
import { cn } from "@/lib/utils"

export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createMutation = useCreateCustomer()

  const [formData, setFormData] = useState<Partial<Customer>>({
    kundeinaktiv: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate required fields
    const newErrors: Record<string, string> = {}
    if (!formData.kundenavn) {
      newErrors.kundenavn = "Kundenavn er påkrevd"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await createMutation.mutateAsync(formData as Omit<Customer, 'kundeid'>)
      
      toast({
        title: "Kunde opprettet",
        description: "Den nye kunden ble lagt til.",
      })
      
      router.push('/customers')
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke opprette kunde. Prøv igjen.",
        variant: "destructive",
      })
    }
  }

  const handleChange = (field: keyof Customer, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/customers')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ny kunde</h1>
              <p className="text-muted-foreground">Opprett en ny kunde i systemet</p>
            </div>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {createMutation.isPending ? "Oppretter..." : "Opprett kunde"}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Generelt</TabsTrigger>
            <TabsTrigger value="contact">Kontakt</TabsTrigger>
            <TabsTrigger value="delivery">Levering</TabsTrigger>
            <TabsTrigger value="notes">Notater</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generell informasjon</CardTitle>
                <CardDescription>
                  Grunnleggende informasjon om kunden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kundenavn">Kundenavn *</Label>
                    <Input
                      id="kundenavn"
                      value={formData.kundenavn || ''}
                      onChange={(e) => handleChange('kundenavn', e.target.value)}
                      className={cn(errors.kundenavn && "border-red-500")}
                      required
                    />
                    {errors.kundenavn && (
                      <p className="text-sm text-red-500">{errors.kundenavn}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avdeling">Avdeling</Label>
                    <Input
                      id="avdeling"
                      value={formData.avdeling || ''}
                      onChange={(e) => handleChange('avdeling', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kundegruppe">Kundegruppe</Label>
                    <Input
                      id="kundegruppe"
                      type="number"
                      value={formData.kundegruppe || ''}
                      onChange={(e) => handleChange('kundegruppe', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kundenragresso">Kunde nr. Agresso</Label>
                    <Input
                      id="kundenragresso"
                      type="number"
                      value={formData.kundenragresso || ''}
                      onChange={(e) => handleChange('kundenragresso', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="kundeinaktiv"
                    checked={formData.kundeinaktiv || false}
                    onCheckedChange={(checked) => handleChange('kundeinaktiv', checked)}
                  />
                  <Label htmlFor="kundeinaktiv">Kunde er inaktiv</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kontaktinformasjon</CardTitle>
                <CardDescription>
                  Telefon, e-post og andre kontaktdetaljer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefonnummer">Telefonnummer</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        id="telefonnummer"
                        value={formData.telefonnummer || ''}
                        onChange={(e) => handleChange('telefonnummer', e.target.value)}
                        className="pl-10"
                        placeholder="+47 123 45 678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="e_post">E-post</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        id="e_post"
                        type="email"
                        value={formData.e_post || ''}
                        onChange={(e) => handleChange('e_post', e.target.value)}
                        className="pl-10"
                        placeholder="kunde@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webside">Nettside</Label>
                  <Input
                    id="webside"
                    type="url"
                    value={formData.webside || ''}
                    onChange={(e) => handleChange('webside', e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kontaktid">Kontakt ID</Label>
                    <Input
                      id="kontaktid"
                      value={formData.kontaktid || ''}
                      onChange={(e) => handleChange('kontaktid', e.target.value || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bestillernr">Bestiller nr.</Label>
                    <Input
                      id="bestillernr"
                      value={formData.bestillernr || ''}
                      onChange={(e) => handleChange('bestillernr', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leveringsinformasjon</CardTitle>
                <CardDescription>
                  Adresse og leveringsdetaljer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Textarea
                      id="adresse"
                      value={formData.adresse || ''}
                      onChange={(e) => handleChange('adresse', e.target.value)}
                      className="pl-10"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="postboks">Postboks</Label>
                    <Input
                      id="postboks"
                      type="number"
                      value={formData.postboks || ''}
                      onChange={(e) => handleChange('postboks', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postnr">Postnummer</Label>
                    <Input
                      id="postnr"
                      value={formData.postnr || ''}
                      onChange={(e) => handleChange('postnr', e.target.value)}
                      maxLength={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sted">Sted</Label>
                    <Input
                      id="sted"
                      value={formData.sted || ''}
                      onChange={(e) => handleChange('sted', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="velgsone">Sone</Label>
                    <Input
                      id="velgsone"
                      value={formData.velgsone || ''}
                      onChange={(e) => handleChange('velgsone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leveringsdag">Leveringsdag</Label>
                    <Input
                      id="leveringsdag"
                      value={formData.leveringsdag || ''}
                      onChange={(e) => handleChange('leveringsdag', e.target.value)}
                      placeholder="f.eks. Mandag, Onsdag, Fredag"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notater og merknader</CardTitle>
                <CardDescription>
                  Tilleggsinformasjon om kunden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="merknad">Merknad</Label>
                  <Textarea
                    id="merknad"
                    value={formData.merknad || ''}
                    onChange={(e) => handleChange('merknad', e.target.value)}
                    rows={5}
                    placeholder="Legg til merknader om kunden her..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lopenr">Løpenr</Label>
                  <Input
                    id="lopenr"
                    value={formData.lopenr || ''}
                    onChange={(e) => handleChange('lopenr', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}