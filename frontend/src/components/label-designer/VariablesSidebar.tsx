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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Package, ShoppingCart, Users, Calendar, Settings, GripVertical, ChevronLeft, ChevronRight, Eye, Printer } from 'lucide-react'
import { LABEL_VARIABLES, VARIABLE_CATEGORIES, type LabelVariable } from '@/config/label-variables'
import { RichTextPreview } from './RichTextPreview'
import { PrinterConfigPanel } from './PrinterConfigPanel'
import type { PrinterConfig } from '@/types/labels'
import { DEFAULT_PRINTER_CONFIG } from '@/types/labels'

interface TextFieldPreview {
  name: string
  content: string
}

interface VariablesSidebarProps {
  onVariableClick: (variable: LabelVariable) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  textFields?: TextFieldPreview[]
  printerConfig?: PrinterConfig
  onPrinterConfigChange?: (config: PrinterConfig) => void
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
  textFields = [],
  printerConfig = DEFAULT_PRINTER_CONFIG,
  onPrinterConfigChange,
}: VariablesSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['product'])
  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState('variables')

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
        <h3 className="font-semibold text-sm">Felt</h3>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-2 mt-2" style={{ width: 'calc(100% - 16px)' }}>
          <TabsTrigger value="variables" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Variabler
          </TabsTrigger>
          <TabsTrigger value="printer" className="text-xs">
            <Printer className="h-3 w-3 mr-1" />
            Printer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variables" className="flex-1 mt-0">
          <ScrollArea className="h-full">
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

              {/* Text Preview Section */}
              {textFields.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Eye className="h-4 w-4" />
                      <span>Forhåndsvisning</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? 'Skjul' : 'Vis'}
                    </Button>
                  </div>

                  {showPreview && (
                    <div className="space-y-2 px-2">
                      <p className="text-xs text-muted-foreground">
                        Viser hvordan &lt;b&gt; tags vil se ut:
                      </p>
                      {textFields.map((field) => (
                        <div key={field.name} className="p-2 bg-card rounded border text-sm">
                          <div className="text-xs text-muted-foreground mb-1 font-mono">
                            {field.name}:
                          </div>
                          <RichTextPreview text={field.content} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="printer" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <PrinterConfigPanel
              config={printerConfig}
              onChange={onPrinterConfigChange || (() => {})}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
