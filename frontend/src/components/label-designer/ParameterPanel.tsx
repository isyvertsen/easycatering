'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatabaseSourceConfig } from './DatabaseSourceConfig'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { TemplateParameterCreate, ParameterType, SourceType } from '@/types/labels'

interface ParameterPanelProps {
  parameters: TemplateParameterCreate[]
  onChange: (parameters: TemplateParameterCreate[]) => void
}

const PARAMETER_TYPES: { value: ParameterType; label: string }[] = [
  { value: 'text', label: 'Tekst' },
  { value: 'number', label: 'Tall' },
  { value: 'date', label: 'Dato' },
  { value: 'barcode', label: 'Strekkode' },
  { value: 'qr', label: 'QR-kode' },
  { value: 'image', label: 'Bilde' },
]

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'manual', label: 'Manuell' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API' },
]

export function ParameterPanel({ parameters, onChange }: ParameterPanelProps) {
  const [expandedItem, setExpandedItem] = useState<string | undefined>()

  const addParameter = () => {
    const newParam: TemplateParameterCreate = {
      field_name: `field_${parameters.length + 1}`,
      display_name: `Parameter ${parameters.length + 1}`,
      parameter_type: 'text',
      source_type: 'manual',
      is_required: false,
      sort_order: parameters.length,
    }
    onChange([...parameters, newParam])
    setExpandedItem(`param-${parameters.length}`)
  }

  const updateParameter = (index: number, updates: Partial<TemplateParameterCreate>) => {
    const newParams = [...parameters]
    newParams[index] = { ...newParams[index], ...updates }
    onChange(newParams)
  }

  const removeParameter = (index: number) => {
    onChange(parameters.filter((_, i) => i !== index))
  }

  const moveParameter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= parameters.length) return

    const newParams = [...parameters]
    const temp = newParams[index]
    newParams[index] = newParams[newIndex]
    newParams[newIndex] = temp

    // Update sort orders
    newParams.forEach((p, i) => {
      p.sort_order = i
    })

    onChange(newParams)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Parametere</CardTitle>
        <Button variant="outline" size="sm" onClick={addParameter}>
          <Plus className="h-4 w-4 mr-2" />
          Legg til
        </Button>
      </CardHeader>
      <CardContent>
        {parameters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen parametere definert. Legg til en parameter for a gjore malen dynamisk.
          </p>
        ) : (
          <Accordion
            type="single"
            collapsible
            value={expandedItem}
            onValueChange={setExpandedItem}
          >
            {parameters.map((param, index) => (
              <AccordionItem key={index} value={`param-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{param.display_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({param.field_name})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Feltnavn</Label>
                      <Input
                        value={param.field_name}
                        onChange={(e) =>
                          updateParameter(index, {
                            field_name: e.target.value.replace(/\s/g, '_').toLowerCase(),
                          })
                        }
                        placeholder="feltnavn"
                      />
                    </div>
                    <div>
                      <Label>Visningsnavn</Label>
                      <Input
                        value={param.display_name}
                        onChange={(e) =>
                          updateParameter(index, { display_name: e.target.value })
                        }
                        placeholder="Visningsnavn"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={param.parameter_type || 'text'}
                        onValueChange={(value) =>
                          updateParameter(index, { parameter_type: value as ParameterType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARAMETER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Datakilde</Label>
                      <Select
                        value={param.source_type || 'manual'}
                        onValueChange={(value) =>
                          updateParameter(index, { source_type: value as SourceType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {param.source_type === 'database' && (
                    <DatabaseSourceConfig
                      value={param.source_config as { table?: string; column?: string }}
                      onChange={(config) =>
                        updateParameter(index, { source_config: config })
                      }
                    />
                  )}

                  <div>
                    <Label>Standardverdi</Label>
                    <Input
                      value={param.default_value || ''}
                      onChange={(e) =>
                        updateParameter(index, { default_value: e.target.value })
                      }
                      placeholder="Standardverdi (valgfritt)"
                    />
                  </div>

                  <div>
                    <Label>Validering (regex)</Label>
                    <Input
                      value={param.validation_regex || ''}
                      onChange={(e) =>
                        updateParameter(index, { validation_regex: e.target.value })
                      }
                      placeholder="^[A-Z0-9]+$ (valgfritt)"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={param.is_required || false}
                        onCheckedChange={(checked) =>
                          updateParameter(index, { is_required: checked })
                        }
                      />
                      <Label className="cursor-pointer">Pakrevd felt</Label>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveParameter(index, 'up')}
                        disabled={index === 0}
                      >
                        Opp
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveParameter(index, 'down')}
                        disabled={index === parameters.length - 1}
                      >
                        Ned
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
