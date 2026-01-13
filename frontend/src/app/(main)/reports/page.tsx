"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Package,
  DollarSign,
  FileText,
  Printer,
  ClipboardList,
  Loader2,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import {
  useGetQuickStatsQuery,
  useGetSalesReportQuery,
  useGetProductReportQuery,
  useGetCustomerReportQuery,
  useGetNutritionStatsQuery
} from "@/lib/graphql/generated"

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedReport, setSelectedReport] = useState("sales")

  // GraphQL queries
  const [quickStatsResult] = useGetQuickStatsQuery({
    variables: { period: selectedPeriod }
  })
  const [salesReportResult] = useGetSalesReportQuery({
    variables: { period: selectedPeriod }
  })
  const [productReportResult] = useGetProductReportQuery({
    variables: { period: selectedPeriod, limit: 10 }
  })
  const [customerReportResult] = useGetCustomerReportQuery({
    variables: { period: selectedPeriod }
  })
  const [nutritionStatsResult] = useGetNutritionStatsQuery({
    variables: { period: selectedPeriod }
  })

  const { data: quickStats, fetching: loadingQuickStats } = quickStatsResult
  const { data: salesReport, fetching: loadingSales } = salesReportResult
  const { data: productReport, fetching: loadingProducts } = productReportResult
  const { data: customerReport, fetching: loadingCustomers } = customerReportResult
  const { data: nutritionStats, fetching: loadingNutrition } = nutritionStatsResult

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapporter</h1>
          <p className="text-gray-500 mt-2">Analyser salg, kunder og ytelse</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Denne uken</SelectItem>
              <SelectItem value="month">Denne måneden</SelectItem>
              <SelectItem value="quarter">Dette kvartalet</SelectItem>
              <SelectItem value="year">Dette året</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/reports/ai-generator">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Rapport Generator
            </Button>
          </Link>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Eksporter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total omsetning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuickStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  kr {quickStats?.quickStats?.totalRevenue?.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  (quickStats?.quickStats?.revenueChangePercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {(quickStats?.quickStats?.revenueChangePercentage || 0) >= 0 ? '+' : ''}
                  {quickStats?.quickStats?.revenueChangePercentage?.toFixed(1)}% fra forrige måned
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Antall ordrer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuickStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">{quickStats?.quickStats?.totalOrders || 0}</div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  (quickStats?.quickStats?.ordersChangePercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {(quickStats?.quickStats?.ordersChangePercentage || 0) >= 0 ? '+' : ''}
                  {quickStats?.quickStats?.ordersChangePercentage?.toFixed(1)}% fra forrige måned
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aktive kunder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuickStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">{quickStats?.quickStats?.activeCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gjennomsnittlig ordre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingQuickStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  kr {quickStats?.quickStats?.averageOrderValue?.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  (quickStats?.quickStats?.avgOrderChangePercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {(quickStats?.quickStats?.avgOrderChangePercentage || 0) >= 0 ? '+' : ''}
                  {quickStats?.quickStats?.avgOrderChangePercentage?.toFixed(1)}% fra forrige måned
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport}>
        <TabsList>
          <TabsTrigger value="sales">Salgsrapport</TabsTrigger>
          <TabsTrigger value="products">Produktrapport</TabsTrigger>
          <TabsTrigger value="customers">Kunderapport</TabsTrigger>
          <TabsTrigger value="nutrition">Ernæringsrapport</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salgsutvikling</CardTitle>
              <CardDescription>Månedlig salg og antall ordrer</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="h-64 flex items-end justify-between gap-2">
                  {salesReport?.salesReport?.monthlyData?.map((month) => {
                    const maxSales = Math.max(...(salesReport?.salesReport?.monthlyData?.map(m => m.sales) || [1]))
                    return (
                      <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-blue-200 rounded-t" style={{ height: `${(month.sales / maxSales) * 100}%` }}>
                          <div className="text-xs text-center pt-1">{month.orders}</div>
                        </div>
                        <div className="text-sm font-medium">{month.month}</div>
                        <div className="text-xs text-gray-600">kr {(month.sales / 1000).toFixed(0)}k</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Salg per kategori</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <div className="space-y-3">
                    {salesReport?.salesReport?.categorySales?.map((cat) => (
                      <div key={cat.category} className="flex justify-between items-center">
                        <span className="text-sm">{cat.category}</span>
                        <span className="text-sm font-medium">
                          kr {cat.amount.toLocaleString('nb-NO', { maximumFractionDigits: 0 })} ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Betalingsmetoder</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <div className="space-y-3">
                    {salesReport?.salesReport?.paymentMethods?.map((method) => (
                      <div key={method.method} className="flex justify-between items-center">
                        <span className="text-sm">{method.method}</span>
                        <span className="text-sm font-medium">{method.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topp 10 produkter</CardTitle>
              <CardDescription>Mest solgte produkter denne perioden</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {productReport?.productReport?.topProducts?.map((product, index) => (
                    <div key={product.produktid} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{product.produktnavn}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-sm text-gray-600">{product.quantity} solgt</span>
                        <span className="text-sm font-medium">kr {product.revenue.toLocaleString('nb-NO', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Kundefordeling</CardTitle>
                <CardDescription>Kunder per segment</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCustomers ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <div className="space-y-3">
                    {customerReport?.customerReport?.segments?.map((stat) => (
                      <div key={stat.segmentType} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{stat.segmentType}</span>
                          <span className="font-medium">{stat.count} ({stat.percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kundeaktivitet</CardTitle>
                <CardDescription>Ordrefrekvens</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCustomers ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <div className="space-y-3">
                    {customerReport?.customerReport?.activity?.map((act) => (
                      <div key={act.frequency} className="flex justify-between items-center">
                        <span className="text-sm">{act.frequency}</span>
                        <span className={`text-sm font-medium ${
                          act.frequency === 'Inaktive kunder' ? 'text-red-600' : ''
                        }`}>{act.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ernæringsstatistikk</CardTitle>
              <CardDescription>Gjennomsnittlige næringsverdier per porsjon</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNutrition ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{nutritionStats?.nutritionStats?.calories?.toFixed(0) || 0}</div>
                    <div className="text-sm text-gray-600">kcal</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{nutritionStats?.nutritionStats?.protein?.toFixed(0) || 0}g</div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{nutritionStats?.nutritionStats?.carbohydrates?.toFixed(0) || 0}g</div>
                    <div className="text-sm text-gray-600">Karbohydrater</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{nutritionStats?.nutritionStats?.fat?.toFixed(0) || 0}g</div>
                    <div className="text-sm text-gray-600">Fett</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Special Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Eksporter rapporter</CardTitle>
            <CardDescription>Last ned rapporter i forskjellige formater</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => window.location.href = '/reports/period-menu'}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <ClipboardList className="h-8 w-8 text-green-600" />
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">Periode Meny Rapport</CardTitle>
            <CardDescription className="mt-2">
              Generer kunderapport for spesifikke perioder med menyer og produkter
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}