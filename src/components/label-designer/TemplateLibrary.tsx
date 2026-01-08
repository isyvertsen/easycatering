'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLabelTemplates, useDeleteLabelTemplate, useCreateLabelTemplate } from '@/hooks/useLabelTemplates'
import { TemplateCard } from './TemplateCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Loader2 } from 'lucide-react'
import type { LabelTemplate } from '@/types/labels'

type FilterType = 'all' | 'mine' | 'global' | 'shared'

interface TemplateLibraryProps {
  onSelect?: (template: LabelTemplate) => void
}

export function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const { data: templates, isLoading, error } = useLabelTemplates()
  const deleteMutation = useDeleteLabelTemplate()
  const createMutation = useCreateLabelTemplate()

  // Filter templates
  const filteredTemplates = templates?.filter((t) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesName = t.name.toLowerCase().includes(searchLower)
      const matchesDesc = t.description?.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesDesc) {
        return false
      }
    }

    // Type filter
    switch (filter) {
      case 'mine':
        return !t.is_global && t.owner_id !== null
      case 'global':
        return t.is_global
      case 'shared':
        // TODO: Implement shared check when we have user context
        return false
      default:
        return true
    }
  })

  const handleDelete = (id: number | string) => {
    deleteMutation.mutate(Number(id))
  }

  const handleDuplicate = async (template: LabelTemplate) => {
    await createMutation.mutateAsync({
      name: `${template.name} (kopi)`,
      description: template.description,
      template_json: template.template_json,
      width_mm: template.width_mm,
      height_mm: template.height_mm,
      is_global: false,
      parameters: template.parameters.map((p) => ({
        field_name: p.field_name,
        display_name: p.display_name,
        parameter_type: p.parameter_type,
        source_type: p.source_type,
        source_config: p.source_config,
        is_required: p.is_required,
        default_value: p.default_value,
        validation_regex: p.validation_regex,
        sort_order: p.sort_order,
      })),
    })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Kunne ikke laste maler</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Prøv igjen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Etikett-maler</h1>
        <Link href="/labels/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ny mal
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i maler..."
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="global">Globale</TabsTrigger>
            <TabsTrigger value="shared">Delt med meg</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Ingen maler funnet for søket ditt'
              : filter === 'mine'
                ? 'Du har ingen egne maler ennå'
                : filter === 'shared'
                  ? 'Ingen maler er delt med deg'
                  : 'Ingen maler funnet'}
          </p>
          <Link href="/labels/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Opprett din første mal
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates?.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Loading overlay for mutations */}
      {(deleteMutation.isPending || createMutation.isPending) && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  )
}
