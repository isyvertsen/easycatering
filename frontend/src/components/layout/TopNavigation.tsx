'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  ChefHat,
  Home,
  Package,
  ShoppingCart,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Activity,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Oppskrifter', href: '/recipes', icon: ChefHat },
  { name: 'Bestillinger', href: '/orders', icon: ShoppingCart },
  { name: 'Produkter', href: '/products', icon: Package },
  { name: 'Ansatte', href: '/employees', icon: Users },
  { name: 'Rapporter', href: '/reports', icon: ClipboardList },
]

const isDevelopment = process.env.NODE_ENV === 'development'
const authBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

export function TopNavigation() {
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { health } = useBackendHealth()

  // In development with auth bypass, show as logged in
  const isAuthenticated = (isDevelopment && authBypass) || status === 'authenticated'
  const userDisplay = session?.user?.name || session?.user?.email || 'Development User'

  const getHealthIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'checking':
        return <Activity className="h-5 w-5 text-gray-400 animate-pulse" />
    }
  }

  const getHealthColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <nav className="bg-background shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">Catering System</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Backend Health Status */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      {getHealthIcon()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Backend Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getHealthIcon()}
                          <span className={cn('font-medium', getHealthColor())}>
                            {health.message}
                          </span>
                        </div>
                        {health.lastChecked && (
                          <p className="text-xs text-gray-500">
                            Sist sjekket: {health.lastChecked.toLocaleTimeString('no-NO')}
                          </p>
                        )}
                        {health.details && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">Detaljer:</p>
                            <div className="space-y-1 text-sm">
                              {health.details.database && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Database:</span>
                                  <span className={
                                    health.details.database === 'connected'
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }>
                                    {health.details.database}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Link href="/settings">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="hidden sm:block text-sm text-gray-700">
                  {userDisplay}
                  {isDevelopment && authBypass && (
                    <span className="ml-2 text-xs text-orange-600">(Dev Mode)</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Link href="/auth/signin">
                <Button>Logg inn</Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden ml-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn('sm:hidden', mobileMenuOpen ? 'block' : 'hidden')}>
        <div className="space-y-1 pb-3 pt-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}