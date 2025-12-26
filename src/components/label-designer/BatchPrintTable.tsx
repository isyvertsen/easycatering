'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Upload, Download } from 'lucide-react'
import type { TemplateParameter } from '@/types/labels'
import { toast } from '@/hooks/use-toast'

interface BatchPrintTableProps {
  parameters: TemplateParameter[]
  data: Record<string, string>[]
  onChange: (data: Record<string, string>[]) => void
}

export function BatchPrintTable({ parameters, data, onChange }: BatchPrintTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addRow = () => {
    const newRow: Record<string, string> = {}
    parameters.forEach((p) => {
      newRow[p.field_name] = p.default_value || ''
    })
    onChange([...data, newRow])
  }

  const updateRow = (index: number, field: string, value: string) => {
    const newData = [...data]
    newData[index] = { ...newData[index], [field]: value }
    onChange(newData)
  }

  const removeRow = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())

        if (lines.length < 2) {
          toast({
            title: 'Ugyldig CSV',
            description: 'Filen ma ha minst to linjer (overskrift + data)',
            variant: 'destructive',
          })
          return
        }

        // Parse header - handle both comma and semicolon as separators
        const separator = lines[0].includes(';') ? ';' : ','
        const headers = lines[0].split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ''))

        // Parse data rows
        const imported = lines.slice(1).map((line) => {
          const values = line.split(separator).map((v) => v.trim().replace(/^["']|["']$/g, ''))
          const row: Record<string, string> = {}
          headers.forEach((h, i) => {
            row[h] = values[i] || ''
          })
          return row
        })

        onChange([...data, ...imported])

        toast({
          title: 'CSV importert',
          description: `${imported.length} rad(er) lagt til`,
        })
      } catch {
        toast({
          title: 'Feil ved import',
          description: 'Kunne ikke lese CSV-filen',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const exportCsvTemplate = () => {
    const headers = parameters.map((p) => p.field_name).join(',')
    const blob = new Blob([headers], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'etikett-mal.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Legg til rad
        </Button>

        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Importer CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button variant="outline" size="sm" onClick={exportCsvTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Last ned mal
        </Button>

        {data.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll} className="ml-auto">
            <Trash2 className="h-4 w-4 mr-2" />
            Fjern alle
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Ingen data lagt til enna</p>
          <p className="text-sm mt-1">
            Klikk &quot;Legg til rad&quot; eller importer en CSV-fil
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                {parameters.map((p) => (
                  <TableHead key={p.field_name}>{p.display_name}</TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  {parameters.map((p) => (
                    <TableCell key={p.field_name} className="p-1">
                      <Input
                        value={row[p.field_name] || ''}
                        onChange={(e) => updateRow(i, p.field_name, e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Totalt: {data.length} etikett(er)
        </p>
      )}
    </div>
  )
}
