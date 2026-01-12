'use client'

import { useState, useEffect } from 'react'
import { useDataSourceTables, useDataSourceColumns } from '@/hooks/useLabelTemplates'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface DatabaseSourceConfigProps {
  value?: { table?: string; column?: string }
  onChange: (config: { table: string; column: string }) => void
}

export function DatabaseSourceConfig({ value, onChange }: DatabaseSourceConfigProps) {
  const [selectedTable, setSelectedTable] = useState(value?.table || '')
  const [selectedColumn, setSelectedColumn] = useState(value?.column || '')

  const { data: tables, isLoading: isLoadingTables } = useDataSourceTables()
  const { data: columns, isLoading: isLoadingColumns } = useDataSourceColumns(selectedTable)

  // Update parent when selection changes
  useEffect(() => {
    if (selectedTable && selectedColumn) {
      onChange({ table: selectedTable, column: selectedColumn })
    }
  }, [selectedTable, selectedColumn, onChange])

  const handleTableChange = (table: string) => {
    setSelectedTable(table)
    setSelectedColumn('') // Reset column when table changes
  }

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Tabell</Label>
        <Select
          value={selectedTable}
          onValueChange={handleTableChange}
          disabled={isLoadingTables}
        >
          <SelectTrigger>
            {isLoadingTables ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Laster tabeller...</span>
              </div>
            ) : (
              <SelectValue placeholder="Velg tabell" />
            )}
          </SelectTrigger>
          <SelectContent>
            {tables?.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTable && (
        <div>
          <Label>Kolonne</Label>
          <Select
            value={selectedColumn}
            onValueChange={handleColumnChange}
            disabled={isLoadingColumns}
          >
            <SelectTrigger>
              {isLoadingColumns ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Laster kolonner...</span>
                </div>
              ) : (
                <SelectValue placeholder="Velg kolonne" />
              )}
            </SelectTrigger>
            <SelectContent>
              {columns?.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  <span className="flex items-center gap-2">
                    <span>{col.name}</span>
                    <span className="text-xs text-muted-foreground">({col.type})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
