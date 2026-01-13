"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCustomersList, useDeleteCustomer } from "@/hooks/useCustomers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { reportsApi } from "@/lib/api/reports"
import { useToast } from "@/hooks/use-toast"
import { useUrlParams } from "@/hooks/useUrlParams"
import { useState } from "react"

type CustomerListParams = {
  page: number
  page_size: number
  search: string
  aktiv: boolean
  sort_by?: string
  sort_order?: "asc" | "desc"
}

const defaultParams: CustomerListParams = {
  page: 1,
  page_size: 20,
  search: "",
  aktiv: true,
}

function CustomersPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { params, setParams } = useUrlParams<CustomerListParams>(defaultParams)

  const deleteMutation = useDeleteCustomer()

  // Convert page/page_size to skip/limit for API
  const apiParams = {
    skip: ((params.page || 1) - 1) * (params.page_size || 20),
    limit: params.page_size || 20,
    search: params.search || undefined,
    aktiv: params.aktiv,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  }

  const { data, isLoading } = useCustomersList(apiParams)

  const handleSearch = (value: string) => {
    setParams({ search: value, page: 1 })
  }

  const handleSort = (column: string) => {
    if (params.sort_by === column) {
      const newOrder = params.sort_order === "asc" ? "desc" : "asc"
      setParams({ sort_order: newOrder })
    } else {
      setParams({ sort_by: column, sort_order: "asc" })
    }
  }

  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage })
  }

  const handlePageSizeChange = (newSize: string) => {
    setParams({ page_size: parseInt(newSize), page: 1 })
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null)
        }
      })
    }
  }

  const handleExportExcel = async () => {
    try {
      await reportsApi.downloadCustomerListExcel()
      toast({
        title: "Lykkes",
        description: "Kundeliste eksportert til Excel",
      })
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke eksportere kundeliste",
        variant: "destructive",
      })
    }
  }

  const getSortIcon = (column: string) => {
    if (params.sort_by !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return params.sort_order === "asc"
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  const total = data?.total || 0
  const pageSize = params.page_size || 20
  const currentPage = params.page || 1
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kunder</h1>
        <p className="text-muted-foreground">
          Administrer kunder og deres informasjon
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Switch
            id="aktiv-filter"
            checked={params.aktiv}
            onCheckedChange={(checked) => setParams({ aktiv: checked, page: 1 })}
          />
          <Label htmlFor="aktiv-filter">Kun aktive kunder</Label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Søk etter kunder..."
              value={params.search || ""}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 w-[300px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Eksporter til Excel
          </Button>
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              Ny kunde
            </Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("kundenavn")}
                  className="h-auto p-0 font-medium"
                >
                  Kundenavn
                  {getSortIcon("kundenavn")}
                </Button>
              </TableHead>
              <TableHead>Avdeling</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Laster...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Ingen kunder funnet
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((customer) => (
                <TableRow
                  key={customer.kundeid}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/customers/${customer.kundeid}`)}
                >
                  <TableCell className="font-medium">
                    {customer.kundenavn}
                  </TableCell>
                  <TableCell>{customer.avdeling || "-"}</TableCell>
                  <TableCell>
                    {customer.adresse ? (
                      <div>
                        <div>{customer.adresse}</div>
                        {customer.postnr && customer.sted && (
                          <div className="text-sm text-muted-foreground">
                            {customer.postnr} {customer.sted}
                          </div>
                        )}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.telefonnummer && (
                        <div className="flex items-center text-sm">
                          <Phone className="mr-1 h-3 w-3" />
                          {customer.telefonnummer}
                        </div>
                      )}
                      {customer.e_post && (
                        <div className="flex items-center text-sm">
                          <Mail className="mr-1 h-3 w-3" />
                          <a href={`mailto:${customer.e_post}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                            {customer.e_post}
                          </a>
                        </div>
                      )}
                      {customer.webside && (
                        <div className="flex items-center text-sm">
                          <Globe className="mr-1 h-3 w-3" />
                          <a href={customer.webside} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                            Nettside
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={!customer.kundeinaktiv ? "default" : "secondary"}>
                      {!customer.kundeinaktiv ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/customers/${customer.kundeid}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Rediger
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(customer.kundeid)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Viser {((currentPage - 1) * pageSize) + 1} til {Math.min(currentPage * pageSize, total)} av {total} kunder
            </p>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Side {currentPage} av {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres. Dette vil permanent slette kunden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-6">Laster...</div>}>
      <CustomersPageContent />
    </Suspense>
  )
}
