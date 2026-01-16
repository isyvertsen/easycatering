"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  X
} from "lucide-react"
import { CrudItem, CrudListParams } from "@/hooks/useCrud"

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, item: T) => React.ReactNode
}

interface DataTableProps<T extends CrudItem> {
  tableName: string
  columns: DataTableColumn<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onParamsChange: (params: CrudListParams) => void
  onDelete: (id: number | string) => void
  onBulkDelete?: (ids: (number | string)[]) => void
  loading?: boolean
  customActions?: (item: T) => React.ReactNode
  idField?: string
  searchPlaceholder?: string
  hideAddButton?: boolean
  enableEdit?: boolean
  enableDelete?: boolean
  enableBulkOperations?: boolean
  bulkExportColumns?: { key: string; label: string }[]
  // Optional callbacks for dialog-based editing (overrides routing)
  onEdit?: (item: T) => void
  onCreate?: () => void
  createButtonLabel?: string
}

export function DataTable<T extends CrudItem>({
  tableName,
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  onParamsChange,
  onDelete,
  onBulkDelete,
  loading = false,
  customActions,
  idField = 'id',
  enableEdit = true,
  enableDelete = true,
  enableBulkOperations = true,
  searchPlaceholder = "Søk...",
  hideAddButton = false,
  bulkExportColumns,
  onEdit,
  onCreate,
  createButtonLabel = "Legg til ny"
}: DataTableProps<T>) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteId, setDeleteId] = useState<number | string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  const handleSearch = (value: string) => {
    setSearch(value)
    onParamsChange({ search: value, page: 1 })
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
      onParamsChange({ sort_by: column, sort_order: newOrder })
    } else {
      setSortBy(column)
      setSortOrder('asc')
      onParamsChange({ sort_by: column, sort_order: 'asc' })
    }
  }

  const handlePageChange = (newPage: number) => {
    onParamsChange({ page: newPage })
  }

  const handlePageSizeChange = (newSize: string) => {
    onParamsChange({ page_size: parseInt(newSize), page: 1 })
  }

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  // Bulk selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = data.map(item => item[idField] as number)
      setSelectedIds(new Set(allIds))
    } else {
      setSelectedIds(new Set())
    }
  }, [data, idField])

  const handleSelectRow = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  const isAllSelected = data.length > 0 && data.every(item => selectedIds.has(item[idField] as number))
  const isSomeSelected = selectedIds.size > 0

  // Bulk delete handler
  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)
    }
  }

  // Bulk export handler
  const handleBulkExport = useCallback(() => {
    const selectedItems = data.filter(item => selectedIds.has(item[idField] as number))
    if (selectedItems.length === 0) return

    const exportCols = bulkExportColumns || columns
    const headers = exportCols.map(col => col.label)
    const rows = selectedItems.map(item =>
      exportCols.map(col => {
        const value = item[col.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'boolean') return value ? 'Ja' : 'Nei'
        return String(value)
      })
    )

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tableName}-eksport-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data, selectedIds, idField, columns, bulkExportColumns, tableName])

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {enableBulkOperations && isSomeSelected && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'rad' : 'rader'} valgt
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Fjern valg
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Eksporter valgte
            </Button>
            {enableDelete && onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Slett valgte
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 w-[300px]"
            />
          </div>
        </div>
        {!hideAddButton && (
          onCreate ? (
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {createButtonLabel}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/${tableName}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                {createButtonLabel}
              </Link>
            </Button>
          )
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkOperations && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Velg alle"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.key)}
                      className="h-auto p-0 font-medium"
                    >
                      {column.label}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[100px]">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableBulkOperations ? 2 : 1)} className="text-center">
                  Laster...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableBulkOperations ? 2 : 1)} className="text-center">
                  Ingen resultater funnet
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const itemId = item[idField] as number
                const isSelected = selectedIds.has(itemId)
                return (
                  <TableRow
                    key={itemId}
                    className={isSelected ? "bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted/50"}
                    onClick={() => {
                      if (enableEdit) {
                        if (onEdit) {
                          onEdit(item)
                        } else {
                          router.push(`/${tableName}/${itemId}`)
                        }
                      }
                    }}
                  >
                    {enableBulkOperations && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(itemId, checked as boolean)}
                          aria-label={`Velg rad ${itemId}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render
                          ? column.render(item[column.key], item)
                          : item[column.key]
                        }
                      </TableCell>
                    ))}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {enableEdit && (
                            <DropdownMenuItem
                              onClick={() => onEdit ? onEdit(item) : router.push(`/${tableName}/${itemId}`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Rediger
                            </DropdownMenuItem>
                          )}
                          {enableDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeleteId(itemId)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Slett
                            </DropdownMenuItem>
                          )}
                          {customActions && customActions(item)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} results
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
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres. Dette vil permanent slette elementet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett {selectedIds.size} elementer?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres. Dette vil permanent slette de valgte elementene.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600">
              Slett {selectedIds.size} elementer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
