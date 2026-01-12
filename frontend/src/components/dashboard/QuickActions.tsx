'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Plus,
  FileText,
  ShoppingCart,
  Calendar,
  ClipboardList,
} from 'lucide-react'

const actions = [
  {
    title: 'Ny bestilling',
    description: 'Opprett en ny matbestilling',
    icon: ShoppingCart,
    href: '/orders/new',
    color: 'text-blue-600',
  },
  {
    title: 'Ny oppskrift',
    description: 'Legg til en ny oppskrift',
    icon: FileText,
    href: '/recipes/new',
    color: 'text-green-600',
  },
  {
    title: 'Planlegg meny',
    description: 'Planlegg ukens meny',
    icon: Calendar,
    href: '/menus/plan',
    color: 'text-purple-600',
  },
  {
    title: 'Generer rapport',
    description: 'Lag rapporter for ledelsen',
    icon: ClipboardList,
    href: '/reports/new',
    color: 'text-orange-600',
  },
]

export function QuickActions() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Hurtighandlinger</h2>
      <div className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="flex items-center space-x-4 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <div className={`p-2 rounded-lg bg-gray-50 ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{action.title}</h3>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
            <Plus className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}