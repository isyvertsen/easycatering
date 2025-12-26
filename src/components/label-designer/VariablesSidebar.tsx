'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Package, ShoppingCart, Users, Calendar, Settings, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { LABEL_VARIABLES, VARIABLE_CATEGORIES, type LabelVariable } from '@/config/label-variables'

interface VariablesSidebarProps {
  onVariableClick: (variable: LabelVariable) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const CATEGORY_ICONS = {
  product: Package,
  order: ShoppingCart,
  customer: Users,
  date: Calendar,
  custom: Settings,
}

export function VariablesSidebar({
  onVariableClick,
  collapsed = false,
  onToggleCollapse,
}: VariablesSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['product'])

  if (collapsed) {
    return (
      <div className="w-10 border-r bg-muted/30 flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapse}
          title="Vis variabler"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Variabler</h3>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-3 px-2">
            Klikk for å legge til felt med variabelnavn
          </p>

          <Accordion
            type="multiple"
            value={expandedCategories}
            onValueChange={setExpandedCategories}
          >
            {VARIABLE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.key]
              const variables = LABEL_VARIABLES.filter((v) => v.category === category.key)

              return (
                <AccordionItem key={category.key} value={category.key} className="border-none">
                  <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                      <span className="text-xs text-muted-foreground">({variables.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1">
                    <div className="space-y-1 pl-2">
                      {variables.map((variable) => (
                        <TooltipProvider key={variable.name} delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                                onClick={() => onVariableClick(variable)}
                              >
                                <GripVertical className="h-3 w-3 mr-1 opacity-50" />
                                <span className="truncate">{`{{${variable.name}}}`}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{variable.displayName}</p>
                                <p className="text-xs text-muted-foreground">{variable.description}</p>
                                <p className="text-xs">
                                  <span className="text-muted-foreground">Eksempel: </span>
                                  <span className="font-mono">{variable.exampleValue}</span>
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
}
