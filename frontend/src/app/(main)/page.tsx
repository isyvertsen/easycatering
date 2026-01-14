"use client"

import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  Calendar,
  ChefHat,
  Truck,
  Clock,
  ArrowRight,
  BarChart3,
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Lazy load chart component (recharts is ~3MB)
const OrdersChart = dynamic(
  () => import("@/components/dashboard/OrdersChart").then(mod => ({ default: mod.OrdersChart })),
  {
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false
  }
)

interface TodayDelivery {
  total_orders: number
  delivered: number
  pending: number
}

interface UpcomingPeriod {
  periodeid: number
  beskrivelse: string | null
  startdato: string
  sluttdato: string
  days_until: number
}

interface DashboardStats {
  totalCustomers: number
  totalEmployees: number
  totalProducts: number
  totalOrders: number
  totalMenus: number
  totalRecipes: number
  ordersToday: number
  ordersThisWeek: number
  ordersThisMonth: number
  pendingOrders: number
  todayDeliveries: TodayDelivery
  upcomingPeriods: UpcomingPeriod[]
}

interface DailySales {
  date: string
  order_count: number
}

interface SalesHistoryResponse {
  data: DailySales[]
  period_days: number
}

interface TopProduct {
  produktid: number
  produktnavn: string
  total_quantity: number
  order_count: number
}

interface TopProductsResponse {
  products: TopProduct[]
  period_days: number
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await apiClient.get('/v1/stats/')

    return {
      totalCustomers: response.data.total_customers || 0,
      totalEmployees: response.data.total_employees || 0,
      totalProducts: response.data.total_products || 0,
      totalOrders: response.data.total_orders || 0,
      totalMenus: response.data.total_menus || 0,
      totalRecipes: response.data.total_recipes || 0,
      ordersToday: response.data.orders_today || 0,
      ordersThisWeek: response.data.orders_this_week || 0,
      ordersThisMonth: response.data.orders_this_month || 0,
      pendingOrders: response.data.pending_orders || 0,
      todayDeliveries: response.data.today_deliveries || { total_orders: 0, delivered: 0, pending: 0 },
      upcomingPeriods: response.data.upcoming_periods || [],
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      totalCustomers: 0,
      totalEmployees: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalMenus: 0,
      totalRecipes: 0,
      ordersToday: 0,
      ordersThisWeek: 0,
      ordersThisMonth: 0,
      pendingOrders: 0,
      todayDeliveries: { total_orders: 0, delivered: 0, pending: 0 },
      upcomingPeriods: [],
    }
  }
}

async function fetchSalesHistory(days: number = 30): Promise<SalesHistoryResponse> {
  try {
    const response = await apiClient.get(`/v1/stats/sales-history?days=${days}`)
    return response.data
  } catch (error) {
    console.error('Error fetching sales history:', error)
    return { data: [], period_days: days }
  }
}

async function fetchTopProducts(days: number = 30, limit: number = 10): Promise<TopProductsResponse> {
  try {
    const response = await apiClient.get(`/v1/stats/top-products?days=${days}&limit=${limit}`)
    return response.data
  } catch (error) {
    console.error('Error fetching top products:', error)
    return { products: [], period_days: days }
  }
}

export default function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: salesHistory } = useQuery({
    queryKey: ['sales-history', 30],
    queryFn: () => fetchSalesHistory(30),
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', 30],
    queryFn: () => fetchTopProducts(30, 10),
    refetchInterval: 60000, // Refresh every minute
  })

  // Prepare chart data
  const chartData = salesHistory?.data?.map(item => ({
    date: new Date(item.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }),
    ordrer: item.order_count,
  })) || []

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-2">Laster data...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const deliveryProgress = stats?.todayDeliveries?.total_orders
    ? (stats.todayDeliveries.delivered / stats.todayDeliveries.total_orders) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Velkommen tilbake! Her er dagens oversikt.</p>
      </div>

      {/* Today's Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/orders" className="block">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordrer i dag</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.ordersToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.ordersThisWeek || 0} denne uken
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/webshop-godkjenning" className="block">
          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ubehandlede ordrer</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                Startet eller bestilt (10-19)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/deliveries" className="block">
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dagens leveringer</CardTitle>
              <Truck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.todayDeliveries?.delivered || 0} / {stats?.todayDeliveries?.total_orders || 0}
              </div>
              <Progress value={deliveryProgress} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports" className="block">
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Denne måneden</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.ordersThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ordrer totalt
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ordrer siste 30 dager
          </CardTitle>
          <CardDescription>Antall ordrer per dag</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <OrdersChart data={chartData} />
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ingen data tilgjengelig</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/customers">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kunder</CardTitle>
              <div className="p-2 rounded-lg text-blue-600 bg-blue-50">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
              <p className="text-xs text-gray-600">
                Totalt antall kunder
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordrer</CardTitle>
              <div className="p-2 rounded-lg text-green-600 bg-green-50">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-gray-600">
                Totalt antall ordrer
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/recipes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oppskrifter</CardTitle>
              <div className="p-2 rounded-lg text-purple-600 bg-purple-50">
                <ChefHat className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRecipes || 0}</div>
              <p className="text-xs text-gray-600">
                Totalt antall oppskrifter
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produkter</CardTitle>
              <div className="p-2 rounded-lg text-orange-600 bg-orange-50">
                <Package className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-gray-600">
                Totalt antall produkter
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Periods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kommende perioder
            </CardTitle>
            <CardDescription>Perioder som starter snart</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.upcomingPeriods && stats.upcomingPeriods.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingPeriods.map((period) => (
                  <div
                    key={period.periodeid}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{period.beskrivelse || `Periode ${period.periodeid}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(period.startdato).toLocaleDateString('nb-NO')} - {new Date(period.sluttdato).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                    <Badge variant={period.days_until === 0 ? "default" : "secondary"}>
                      {period.days_until === 0 ? 'I dag' : `${period.days_until} dager`}
                    </Badge>
                  </div>
                ))}
                <Link href="/perioder">
                  <Button variant="ghost" className="w-full mt-2">
                    Se alle perioder
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ingen kommende perioder</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hurtigtilgang
            </CardTitle>
            <CardDescription>Vanlige handlinger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link href="/orders/new">
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Ny ordre
                </Button>
              </Link>
              <Link href="/customers/new">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Ny kunde
                </Button>
              </Link>
              <Link href="/produkter">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Produkter
                </Button>
              </Link>
              <Link href="/recipes/new">
                <Button variant="outline" className="w-full justify-start">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Ny oppskrift
                </Button>
              </Link>
              <Link href="/menus">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Menyer
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Topp 10 produkter
          </CardTitle>
          <CardDescription>Mest bestilte produkter siste 30 dager</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts?.products && topProducts.products.length > 0 ? (
            <div className="space-y-3">
              {topProducts.products.map((product, index) => {
                // Capitalize helper
                const capitalize = (str: string) =>
                  str.toLowerCase().replace(/(?:^|[\s-])(\w)/g, (m) => m.toUpperCase())

                return (
                  <div
                    key={product.produktid}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{capitalize(product.produktnavn)}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.order_count} ordrer
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {product.total_quantity.toLocaleString('nb-NO')} stk
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Ingen produktdata tilgjengelig</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Systemoversikt</CardTitle>
          <CardDescription>Komplett oversikt over alle moduler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Personer</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Ansatte</span>
                  <span className="font-medium">{stats?.totalEmployees || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kunder</span>
                  <span className="font-medium">{stats?.totalCustomers || 0}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Produkter & Menyer</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Produkter</span>
                  <span className="font-medium">{stats?.totalProducts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Menyer</span>
                  <span className="font-medium">{stats?.totalMenus || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Oppskrifter</span>
                  <span className="font-medium">{stats?.totalRecipes || 0}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Ordrer</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Totalt</span>
                  <span className="font-medium">{stats?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Denne måneden</span>
                  <span className="font-medium">{stats?.ordersThisMonth || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ubehandlede</span>
                  <span className="font-medium text-amber-600">{stats?.pendingOrders || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
