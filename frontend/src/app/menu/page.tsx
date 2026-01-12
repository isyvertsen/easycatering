"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Copy,
  Send,
  Filter,
  Search
} from "lucide-react"
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns"
import { nb } from "date-fns/locale"

// Mock data for weekly menus
const weeklyMenuData = {
  "2024-06-17": {
    monday: {
      breakfast: { id: 1, name: "Havregrøt med bær", allergener: ["melk"], customers: 89 },
      lunch: { id: 2, name: "Fiskesuppe", allergener: ["fisk", "melk"], customers: 134 },
      dinner: { id: 3, name: "Kylling med grønnsaker", allergener: [], customers: 142 }
    },
    tuesday: {
      breakfast: { id: 4, name: "Yoghurt med müsli", allergener: ["melk", "gluten"], customers: 87 },
      lunch: { id: 5, name: "Pasta Bolognese", allergener: ["gluten", "melk"], customers: 131 },
      dinner: { id: 6, name: "Laks med poteter", allergener: ["fisk"], customers: 140 }
    },
    wednesday: {
      breakfast: { id: 7, name: "Egg og bacon", allergener: ["egg"], customers: 91 },
      lunch: { id: 8, name: "Kjøttboller i brun saus", allergener: ["melk", "gluten"], customers: 136 },
      dinner: { id: 9, name: "Vegetarisk lasagne", allergener: ["melk", "gluten"], customers: 138 }
    },
    thursday: {
      breakfast: { id: 10, name: "Smoothie bowl", allergener: [], customers: 85 },
      lunch: { id: 11, name: "Kyllingsuppe", allergener: ["selleri"], customers: 132 },
      dinner: { id: 12, name: "Biff med bearnaise", allergener: ["egg", "melk"], customers: 141 }
    },
    friday: {
      breakfast: { id: 13, name: "Pannekaker", allergener: ["melk", "egg", "gluten"], customers: 93 },
      lunch: { id: 14, name: "Fiskekaker", allergener: ["fisk", "melk"], customers: 128 },
      dinner: { id: 15, name: "Pizza", allergener: ["gluten", "melk"], customers: 145 }
    }
  }
}

const allergenColors: Record<string, string> = {
  melk: "bg-blue-100 text-blue-800",
  gluten: "bg-yellow-100 text-yellow-800",
  egg: "bg-orange-100 text-orange-800",
  fisk: "bg-purple-100 text-purple-800",
  selleri: "bg-green-100 text-green-800",
  nøtter: "bg-red-100 text-red-800"
}

export default function MenuPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekNumber = format(currentWeek, "w")
  
  const days = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"]
  const meals = ["Frokost", "Lunsj", "Middag"]

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ukemenyer</h1>
          <p className="text-gray-500 mt-2">Planlegg og administrer ukentlige menyer</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Kopier forrige uke
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Publiser meny
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Uke {weekNumber}</h2>
                <p className="text-sm text-gray-500">
                  {format(weekStart, "d. MMMM", { locale: nb })} - {format(addDays(weekStart, 4), "d. MMMM yyyy", { locale: nb })}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">142 aktive kunder</span>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Gå til i dag
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Menu Grid */}
      <div className="grid gap-6">
        {days.map((day, dayIndex) => (
          <Card key={day} className="overflow-hidden">
            <CardHeader className="bg-gray-50 py-3">
              <h3 className="font-semibold text-lg">{day}</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-3 divide-x">
                {meals.map((meal, mealIndex) => {
                  const mealData = meal === "Frokost" ? { id: 1, name: "Havregrøt med bær", allergener: ["melk"], customers: 89 } :
                                 meal === "Lunsj" ? { id: 2, name: "Fiskesuppe", allergener: ["fisk", "melk"], customers: 134 } :
                                 { id: 3, name: "Kylling med grønnsaker", allergener: [], customers: 142 }
                  
                  return (
                    <div key={meal} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm text-gray-600">{meal}</h4>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {mealData ? (
                        <div>
                          <p className="font-medium text-gray-900 mb-2">{mealData.name}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {mealData.allergener.map((allergen) => (
                              <span
                                key={allergen}
                                className={`text-xs px-2 py-1 rounded-full ${allergenColors[allergen] || 'bg-gray-100 text-gray-800'}`}
                              >
                                {allergen}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">{mealData.customers} kunder</p>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <Plus className="h-3 w-3 mr-1" />
                          Legg til rett
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ukeoversikt</CardTitle>
          <CardDescription>Sammendrag av allergener og ernæring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Allergenfordeling</h4>
              <div className="space-y-2">
                {Object.entries(allergenColors).slice(0, 5).map(([allergen, color]) => (
                  <div key={allergen} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
                        {allergen}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">12 retter</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Komplette dager</span>
                  <span className="text-sm font-medium">3 av 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Totalt antall retter</span>
                  <span className="text-sm font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gjennomsnittlig kundedekking</span>
                  <span className="text-sm font-medium">98%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}