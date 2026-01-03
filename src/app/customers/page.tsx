"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCustomersList, useDeleteCustomer } from "@/hooks/useCustomers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Phone, Mail, Globe, FileSpreadsheet } from "lucide-react"
import { reportsApi } from "@/lib/api/reports"
import { useToast } from "@/hooks/use-toast"

export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [params, setParams] = useState({
    skip: 0,
    limit: 20,
    search: "",
  })

  const { data, isLoading } = useCustomersList(params)
  const deleteMutation = useDeleteCustomer()

  const handleSearch = (value: string) => {
    setSearch(value)
    setParams(prev => ({ ...prev, search: value, skip: 0 }))
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kunder</h1>
        <p className="text-muted-foreground">
          Administrer kunder og deres informasjon
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Søk etter kunder..."
              value={search}
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
              <TableHead>Kundenavn</TableHead>
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
                          <a href={`mailto:${customer.e_post}`} className="text-blue-600 hover:underline">
                            {customer.e_post}
                          </a>
                        </div>
                      )}
                      {customer.webside && (
                        <div className="flex items-center text-sm">
                          <Globe className="mr-1 h-3 w-3" />
                          <a href={customer.webside} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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