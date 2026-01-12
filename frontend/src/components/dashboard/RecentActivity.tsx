'use client'

import { formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ShoppingCart, FileText, Users, Package } from 'lucide-react'

// Mock data - in real app this would come from API
const activities = [
  {
    id: 1,
    type: 'order',
    title: 'Ny bestilling #1234',
    description: 'Bestilling for Larvik Sykehjem',
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    icon: ShoppingCart,
    iconColor: 'text-blue-600',
  },
  {
    id: 2,
    type: 'recipe',
    title: 'Oppskrift oppdatert',
    description: 'Fiskegrateng med rotgrønnsaker',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    icon: FileText,
    iconColor: 'text-green-600',
  },
  {
    id: 3,
    type: 'employee',
    title: 'Ny ansatt registrert',
    description: 'Kari Nordmann lagt til i systemet',
    time: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    icon: Users,
    iconColor: 'text-purple-600',
  },
  {
    id: 4,
    type: 'product',
    title: 'Lav lagerbeholdning',
    description: 'Melk og egg under minimumsgrense',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    icon: Package,
    iconColor: 'text-orange-600',
  },
]

export function RecentActivity() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Siste aktivitet</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4">
            <div
              className={`p-2 rounded-lg bg-gray-50 ${activity.iconColor}`}
            >
              <activity.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-sm text-muted-foreground">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(activity.time, {
                  addSuffix: true,
                  locale: nb,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}