"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import {
  Settings,
  Building,
  Users,
  Mail,
  Bell,
  Shield,
  Database,
  Printer,
  Globe,
  Save,
  ChevronRight,
  Info,
  Sparkles,
  Check,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useBackendHealth } from "@/hooks/useBackendHealth"
import { WebshopCategoryOrderSettings } from "@/components/settings/WebshopCategoryOrderSettings"
import { systemSettingsApi, FeatureFlags } from "@/lib/api/system-settings"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const { toast } = useToast()
  const { health } = useBackendHealth()
  const [companySettings, setCompanySettings] = useState({
    name: "Larvik Kommune Catering",
    orgNumber: "123456789",
    address: "Rådhusplassen 1",
    postalCode: "3251",
    city: "Larvik",
    phone: "+47 33 12 34 56",
    email: "catering@larvik.kommune.no",
    website: "www.larvik.kommune.no/catering"
  })

  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "smtp.larvik.kommune.no",
    smtpPort: "587",
    smtpUsername: "catering@larvik.kommune.no",
    enableTLS: true,
    orderNotifications: true,
    dailyReports: true,
    weeklyReports: false
  })

  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null)
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(true)

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        const flags = await systemSettingsApi.getFeatureFlags()
        setFeatureFlags(flags)
      } catch (error) {
        console.error("Error fetching feature flags:", error)
      } finally {
        setFeatureFlagsLoading(false)
      }
    }

    fetchFeatureFlags()
  }, [])

  const handleSave = () => {
    toast({
      title: "Innstillinger lagret",
      description: "Endringene dine har blitt lagret",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Innstillinger</h1>
          <p className="text-gray-500 mt-2">Administrer systeminnstillinger og preferanser</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Lagre endringer
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company">Bedrift</TabsTrigger>
          <TabsTrigger value="email">E-post</TabsTrigger>
          <TabsTrigger value="notifications">Varsler</TabsTrigger>
          <TabsTrigger value="ai-features">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Features
          </TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Sikkerhet</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Bedriftsinformasjon
              </CardTitle>
              <CardDescription>
                Grunnleggende informasjon om din organisasjon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Bedriftsnavn</Label>
                  <Input
                    id="company-name"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-number">Organisasjonsnummer</Label>
                  <Input
                    id="org-number"
                    value={companySettings.orgNumber}
                    onChange={(e) => setCompanySettings({...companySettings, orgNumber: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postnummer</Label>
                  <Input
                    id="postal-code"
                    value={companySettings.postalCode}
                    onChange={(e) => setCompanySettings({...companySettings, postalCode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Poststed</Label>
                  <Input
                    id="city"
                    value={companySettings.city}
                    onChange={(e) => setCompanySettings({...companySettings, city: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Nettside</Label>
                <Input
                  id="website"
                  value={companySettings.website}
                  onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-postinnstillinger
              </CardTitle>
              <CardDescription>
                Konfigurer e-postserver og meldingsinnstillinger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP Server</Label>
                  <Input
                    id="smtp-server"
                    value={emailSettings.smtpServer}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpServer: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">Brukernavn</Label>
                <Input
                  id="smtp-username"
                  value={emailSettings.smtpUsername}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpUsername: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">Passord</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enable-tls">Aktiver TLS/SSL</Label>
                <Switch
                  id="enable-tls"
                  checked={emailSettings.enableTLS}
                  onCheckedChange={(checked) => setEmailSettings({...emailSettings, enableTLS: checked})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-postvarsler</CardTitle>
              <CardDescription>
                Velg hvilke e-poster som skal sendes automatisk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="order-notifications">Ordrebekreftelser</Label>
                  <p className="text-sm text-gray-500">Send bekreftelse til kunder ved nye ordrer</p>
                </div>
                <Switch
                  id="order-notifications"
                  checked={emailSettings.orderNotifications}
                  onCheckedChange={(checked) => setEmailSettings({...emailSettings, orderNotifications: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily-reports">Daglige rapporter</Label>
                  <p className="text-sm text-gray-500">Send daglig sammendrag til administratorer</p>
                </div>
                <Switch
                  id="daily-reports"
                  checked={emailSettings.dailyReports}
                  onCheckedChange={(checked) => setEmailSettings({...emailSettings, dailyReports: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekly-reports">Ukentlige rapporter</Label>
                  <p className="text-sm text-gray-500">Send ukentlig sammendrag til ledelsen</p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={emailSettings.weeklyReports}
                  onCheckedChange={(checked) => setEmailSettings({...emailSettings, weeklyReports: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Varslingsinnstillinger
              </CardTitle>
              <CardDescription>
                Administrer systemvarsler og påminnelser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nye ordrer</Label>
                  <p className="text-sm text-gray-500">Varsle når nye ordrer mottas</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Lave lagernivåer</Label>
                  <p className="text-sm text-gray-500">Varsle når produkter har lavt lager</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Leveringsforsinkelser</Label>
                  <p className="text-sm text-gray-500">Varsle om forsinkede leveranser</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Systemoppdateringer</Label>
                  <p className="text-sm text-gray-500">Informasjon om nye funksjoner og endringer</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Funksjoner
              </CardTitle>
              <CardDescription>
                Status for AI-drevne funksjoner i systemet. Disse funksjonene styres via miljøvariabler (.env) og kan bare endres av systemadministrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {featureFlagsLoading ? (
                <div className="text-sm text-gray-500">Laster feature flags...</div>
              ) : featureFlags ? (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">Oppskriftsvalidering</Label>
                        {featureFlags.ai_recipe_validation ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Check className="h-3 w-3" /> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <X className="h-3 w-3" /> Inaktiv
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI-validering av oppskrifter før PDF-generering. Sjekker for uvanlige mengder av ingredienser (salt, pepper, etc.)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        FEATURE_AI_RECIPE_VALIDATION={featureFlags.ai_recipe_validation.toString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">Rettnavn-generator</Label>
                        {featureFlags.ai_dish_name_generator ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Check className="h-3 w-3" /> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <X className="h-3 w-3" /> Inaktiv
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI-generering av rettnavn basert på oppskrifter og produkter. Fallback til regelbasert generering hvis inaktiv.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        FEATURE_AI_DISH_NAME_GENERATOR={featureFlags.ai_dish_name_generator.toString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">Chatbot</Label>
                        {featureFlags.ai_chatbot ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Check className="h-3 w-3" /> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <X className="h-3 w-3" /> Inaktiv
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI-chatbot for dokumentasjon og brukerstøtte
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        FEATURE_AI_CHATBOT={featureFlags.ai_chatbot.toString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-semibold mb-1">Hvordan endre AI-innstillinger:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                          <li>Åpne <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> filen i backend-mappen</li>
                          <li>Sett ønsket feature flag til <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">true</code> eller <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">false</code></li>
                          <li>Start backend på nytt for at endringene skal tre i kraft</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-red-500">Kunne ikke laste feature flags</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Systeminnstillinger
              </CardTitle>
              <CardDescription>
                Generelle systempreferanser og regional konfigurasjon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Språk</Label>
                  <Select defaultValue="no">
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Norsk</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sv">Svenska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Tidssone</Label>
                  <Select defaultValue="europe-oslo">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe-oslo">Europe/Oslo</SelectItem>
                      <SelectItem value="europe-stockholm">Europe/Stockholm</SelectItem>
                      <SelectItem value="europe-copenhagen">Europe/Copenhagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Valuta</Label>
                  <Select defaultValue="nok">
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nok">NOK - Norske kroner</SelectItem>
                      <SelectItem value="sek">SEK - Svenska kronor</SelectItem>
                      <SelectItem value="dkk">DKK - Danske kroner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-format">Datoformat</Label>
                  <Select defaultValue="dd-mm-yyyy">
                    <SelectTrigger id="date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-mm-yyyy">DD.MM.ÅÅÅÅ</SelectItem>
                      <SelectItem value="mm-dd-yyyy">MM/DD/ÅÅÅÅ</SelectItem>
                      <SelectItem value="yyyy-mm-dd">ÅÅÅÅ-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webshop Category Order Settings */}
          <WebshopCategoryOrderSettings />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Zebra Printer Innstillinger
              </CardTitle>
              <CardDescription>
                Administrer dine Zebra-printere for etikett-utskrift
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                <div>
                  <p className="font-medium">Administrer Zebra-printere</p>
                  <p className="text-sm text-muted-foreground">
                    Legg til, rediger og test dine Zebra-printere for etikett-utskrift
                  </p>
                </div>
                <Link href="/settings/printers">
                  <Button variant="ghost" size="sm">
                    Åpne
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatisk utskrift av ordrer</Label>
                  <p className="text-sm text-gray-500">Skriv ut ordrer automatisk ved mottak</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Versjonsinformasjon
              </CardTitle>
              <CardDescription>
                Informasjon om systemversjoner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500">Frontend versjon</Label>
                  <p className="text-lg font-medium">{health.frontendVersion || 'Laster...'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500">Backend versjon</Label>
                  <p className="text-lg font-medium">{health.backendVersion || 'Laster...'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500">Backend status</Label>
                  <p className="text-lg font-medium">
                    {health.status === 'healthy' ? 'Tilkoblet' : health.status === 'checking' ? 'Sjekker...' : 'Frakoblet'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sikkerhetsinnstillinger
              </CardTitle>
              <CardDescription>
                Administrer sikkerhet og tilgangskontroll
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>To-faktor autentisering</Label>
                    <p className="text-sm text-gray-500">Krev ekstra verifisering ved innlogging</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Passordutløp</Label>
                    <p className="text-sm text-gray-500">Krev passordbytte hver 90. dag</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP-begrensning</Label>
                    <p className="text-sm text-gray-500">Begrens tilgang til spesifikke IP-adresser</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tillatte IP-adresser</Label>
                <Textarea
                  placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Øktvarighet (minutter)</Label>
                <Input type="number" defaultValue="60" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}