'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Bold, Eye, EyeOff } from 'lucide-react'
import { RichTextPreview } from './RichTextPreview'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RichTextInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  rows?: number
}

/**
 * Text input with bold formatting toolbar and live preview.
 * Supports <b>...</b> tags for bold text.
 */
export function RichTextInput({
  value,
  onChange,
  label,
  placeholder = 'Skriv tekst her...',
  rows = 3,
}: RichTextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(true)

  const wrapSelectionWithTag = useCallback((tag: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    if (selectedText) {
      // Wrap selected text with tag
      const newValue =
        value.substring(0, start) +
        `<${tag}>${selectedText}</${tag}>` +
        value.substring(end)
      onChange(newValue)

      // Restore cursor position after the wrapped text
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = end + tag.length * 2 + 5 // Account for <tag></tag>
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    } else {
      // No selection - insert tags at cursor and place cursor between them
      const newValue =
        value.substring(0, start) +
        `<${tag}></${tag}>` +
        value.substring(end)
      onChange(newValue)

      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + tag.length + 2 // Position between <tag> and </tag>
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }, [value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+B or Cmd+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      wrapSelectionWithTag('b')
    }
  }, [wrapSelectionWithTag])

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border rounded-t-md bg-muted/30">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => wrapSelectionWithTag('b')}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fet skrift (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Skjul
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Vis
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showPreview ? 'Skjul forhåndsvisning' : 'Vis forhåndsvisning'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Text input */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="rounded-t-none font-mono text-sm"
      />

      {/* Preview */}
      {showPreview && value && (
        <div className="p-3 border rounded-md bg-white">
          <div className="text-xs text-muted-foreground mb-1">Forhåndsvisning:</div>
          <RichTextPreview text={value} className="text-sm" />
        </div>
      )}
    </div>
  )
}
