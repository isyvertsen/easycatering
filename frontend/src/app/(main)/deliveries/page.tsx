"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Truck, 
  Package, 
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react"
import { format } from "date-fns"

// Mock data for deliveries
const deliveries = [
  {
    id: 1,
    route: "Rute 1 - Sentrum",
    driver: "Per Hansen",
    date: new Date(2024, 5, 20),
    status: "underway",
    totalStops: 12,
    completedStops: 5,
    orders: [
      { id: 101, customer: "Larvik Sykehjem", address: "Storgata 10", items: 15, status: "delivered" },
      { id: 102, customer: "Byskolen", address: "Skolegata 5", items: 8, status: "delivered" },
      { id: 103, customer: "Barnehage Solstrålen", address: "Parkveien 23", items: 6, status: "pending" },
    ]
  },
  {
    id: 2,
    route: "Rute 2 - Nord",
    driver: "Anne Olsen",
    date: new Date(2024, 5, 20),
    status: "planned",
    totalStops: 8,
    completedStops: 0,
    orders: [
      { id: 201, customer: "Nordby Eldresenter", address: "Nordveien 45", items: 20, status: "pending" },
      { id: 202, customer: "Fjelltoppen Skole", address: "Høydeveien 12", items: 12, status: "pending" },
    ]
  }
]

const statusConfig = {
  planned: { label: "Planlagt", variant: "outline" as const, icon: Calendar },
  underway: { label: "Under levering", variant: "default" as const, icon: Truck },
  completed: { label: "Fullført", variant: "secondary" as const, icon: CheckCircle },
  delayed: { label: "Forsinket", variant: "destructive" as const, icon: AlertCircle }
}

export default function DeliveriesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leveranser</h1>
          <p className="text-muted-foreground mt-2">Administrer og spor dagens leveranser</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button>
            <Truck className="h-4 w-4 mr-2" />
            Planlegg ruter
          </Button>
        </div>
      </div>

      {/* Date selector and search */}
      <div className="flex gap-4">
        <Input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="w-48"
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter kunde, adresse eller sjåfør..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totale leveranser</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">8 ruter aktive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Levert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">12</div>
            <p className="text-xs text-muted-foreground mt-1">50% fullført</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under levering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8</div>
            <p className="text-xs text-muted-foreground mt-1">4 ruter aktive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Forsinket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
            <p className="text-xs text-muted-foreground mt-1">Trenger oppfølging</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery routes */}
      <div className="space-y-4">
        {deliveries.map((delivery) => {
          const status = statusConfig[delivery.status as keyof typeof statusConfig]
          const StatusIcon = status.icon
          
          return (
            <Card key={delivery.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{delivery.route}</h3>
                      <p className="text-sm text-muted-foreground">Sjåfør: {delivery.driver}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {delivery.completedStops} av {delivery.totalStops} stopp
                      </p>
                      <div className="w-32 h-2 bg-muted rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(delivery.completedStops / delivery.totalStops) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {delivery.orders.map((order, index) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-card text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{order.customer}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {order.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{order.items} varer</span>
                        {order.status === 'delivered' ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Levert
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Venter
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="outline" size="sm">
                    Se detaljer
                  </Button>
                  <Button size="sm">
                    Oppdater status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}