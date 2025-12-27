'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Info } from 'lucide-react'
import type { PrinterConfig } from '@/types/labels'
import { DEFAULT_PRINTER_CONFIG } from '@/types/labels'

interface PrinterConfigPanelProps {
  config: PrinterConfig
  onChange: (config: PrinterConfig) => void
}

export function PrinterConfigPanel({ config, onChange }: PrinterConfigPanelProps) {
  const handleDarknessChange = (value: string) => {
    const darkness = parseInt(value, 10)
    if (!isNaN(darkness) && darkness >= 0 && darkness <= 30) {
      onChange({ ...config, darkness })
    }
  }

  const handleSpeedChange = (value: string) => {
    const speed = parseInt(value, 10)
    if (!isNaN(speed) && speed >= 2 && speed <= 14) {
      onChange({ ...config, speed })
    }
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>Disse innstillingene sendes til Zebra-printeren som ZPL-kommandoer før utskrift.</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="darkness" className="text-sm">
            Mørkhet (Darkness)
          </Label>
          <span className="text-xs text-muted-foreground">0-30</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="darkness"
            type="number"
            min={0}
            max={30}
            value={config.darkness ?? DEFAULT_PRINTER_CONFIG.darkness}
            onChange={(e) => handleDarknessChange(e.target.value)}
            className="w-20"
          />
          <input
            type="range"
            min={0}
            max={30}
            value={config.darkness ?? DEFAULT_PRINTER_CONFIG.darkness}
            onChange={(e) => handleDarknessChange(e.target.value)}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Høyere verdi = mørkere utskrift. Standard: 15
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="speed" className="text-sm">
            Hastighet (Speed)
          </Label>
          <span className="text-xs text-muted-foreground">2-14 ips</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="speed"
            type="number"
            min={2}
            max={14}
            value={config.speed ?? DEFAULT_PRINTER_CONFIG.speed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="w-20"
          />
          <input
            type="range"
            min={2}
            max={14}
            value={config.speed ?? DEFAULT_PRINTER_CONFIG.speed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Inches per second. Lavere = bedre kvalitet. Standard: 4
        </p>
      </div>

      <div className="mt-4 pt-3 border-t">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">ZPL Kommandoer</h4>
        <div className="bg-muted/50 rounded p-2 font-mono text-xs">
          <div>~SD{config.darkness ?? DEFAULT_PRINTER_CONFIG.darkness}</div>
          <div>^PR{config.speed ?? DEFAULT_PRINTER_CONFIG.speed}</div>
        </div>
      </div>
    </div>
  )
}
