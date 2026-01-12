'use client'

import { useMemo } from 'react'

interface RichTextPreviewProps {
  text: string
  className?: string
}

/**
 * Renders text with <b> tags as actual bold text.
 * Example: "Melk (<b>MELK</b>)" renders with "MELK" in bold.
 */
export function RichTextPreview({ text, className = '' }: RichTextPreviewProps) {
  const segments = useMemo(() => {
    if (!text) return []

    const result: { text: string; bold: boolean }[] = []
    const pattern = /<b>(.*?)<\/b>/gi
    let lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), bold: false })
      }
      // Add bold text
      result.push({ text: match[1], bold: true })
      lastIndex = pattern.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), bold: false })
    }

    return result
  }, [text])

  if (!text) {
    return <span className={`text-muted-foreground ${className}`}>Ingen tekst</span>
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span key={index} className={segment.bold ? 'font-bold' : ''}>
          {segment.text}
        </span>
      ))}
    </span>
  )
}
