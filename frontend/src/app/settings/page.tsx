"use client"

import { useState } from "react"
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
  Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useBackendHealth } from "@/hooks/useBackendHealth"

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Bedrift</TabsTrigger>
          <TabsTrigger value="email">E-post</TabsTrigger>
          <TabsTrigger value="notifications">Varsler</TabsTrigger>
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