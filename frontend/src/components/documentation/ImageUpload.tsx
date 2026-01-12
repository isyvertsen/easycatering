'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Copy, Check, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadedImage {
  id: string
  url: string
  name: string
  size: number
}

export function ImageUpload() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onload = () => {
        const imageUrl = reader.result as string
        const newImage: UploadedImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: imageUrl,
          name: file.name,
          size: file.size,
        }

        setImages((prev) => [...prev, newImage])
      }

      reader.readAsDataURL(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    },
    multiple: true,
  })

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          onDrop([file])
        }
      }
    }
  }, [onDrop])

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const copyMarkdown = (image: UploadedImage) => {
    const markdown = `![${image.name}](${image.url})`
    navigator.clipboard.writeText(markdown)
    setCopiedId(image.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragActive ? 'Slipp bildene her...' : 'Dra og slipp bilder her'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          eller klikk for å velge filer
        </p>
        <div className="text-xs text-gray-400">
          Støtter PNG, JPG, GIF, SVG, WebP
        </div>
      </div>

      {/* Paste area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <ImageIcon className="h-5 w-5 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Eller lim inn bilde fra utklippstavlen
          </p>
        </div>
        <input
          type="text"
          placeholder="Klikk her og lim inn bilde (Ctrl+V / Cmd+V)"
          onPaste={handlePaste}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Uploaded images */}
      {images.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Opplastede bilder</h3>
          <div className="space-y-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="border rounded-lg p-4 flex items-start gap-4 bg-card"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-24 h-24 object-cover rounded border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {image.name}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(image.size)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyMarkdown(image)}
                      className="text-xs"
                    >
                      {copiedId === image.id ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Kopier markdown
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeImage(image.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Fjern
                    </Button>
                  </div>
                  {copiedId === image.id && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-mono">
                      ![{image.name}]({image.url.substring(0, 50)}...)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hvordan bruke</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Last opp bilder ved å dra og slippe eller klikke i området over</li>
          <li>Lim inn bilder direkte fra utklippstavlen</li>
          <li>Klikk "Kopier markdown" for å få markdown-koden for bildet</li>
          <li>Lim inn markdown-koden i dokumentasjonen din</li>
        </ul>
      </div>
    </div>
  )
}
