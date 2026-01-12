'use client'

import { useQuery } from '@tanstack/react-query'
import { ChefHat, ShoppingCart, Users, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'

const stats = [
  {
    name: 'Aktive bestillinger',
    value: '12',
    icon: ShoppingCart,
    change: '+4.75%',
    changeType: 'positive',
  },
  {
    name: 'Oppskrifter',
    value: '256',
    icon: ChefHat,
    change: '+12',
    changeType: 'positive',
  },
  {
    name: 'Ansatte',
    value: '48',
    icon: Users,
    change: '+2',
    changeType: 'positive',
  },
  {
    name: 'Månedlig omsetning',
    value: '128.450 kr',
    icon: TrendingUp,
    change: '+15.3%',
    changeType: 'positive',
  },
]

export function DashboardStats() {
  // In a real app, these would be fetched from the API
  // const { data: orderStats } = useQuery({
  //   queryKey: ['dashboard', 'orders'],
  //   queryFn: () => api.get('/stats/orders').then(res => res.data),
  // })

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <stat.icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span
              className={
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {stat.change}
            </span>
            <span className="text-muted-foreground ml-2">fra forrige måned</span>
          </div>
        </div>
      ))}
    </div>
  )
}