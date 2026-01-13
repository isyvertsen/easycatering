'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { scanPickList, ScannedLine } from '@/lib/api/plukking'

interface PickListScannerProps {
  orderId: number
  onScanComplete: (lines: ScannedLine[], confidence: number, notes: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PickListScanner({
  orderId,
  onScanComplete,
  open,
  onOpenChange,
}: PickListScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const processImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix for API
      setImagePreview(result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processImage(acceptedFiles[0])
    }
  }, [processImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: false,
  })

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera on mobile
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
      setError(null)
    } catch (err) {
      setError('Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.')
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setImagePreview(dataUrl)
      stopCamera()
    }
  }

  const handleAnalyze = async () => {
    if (!imagePreview) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Extract base64 content without prefix
      const base64Content = imagePreview.includes(',')
        ? imagePreview.split(',')[1]
        : imagePreview

      const result = await scanPickList(orderId, base64Content)

      if (result.success) {
        onScanComplete(result.lines, result.confidence, result.notes)
        handleClose()
      } else {
        setError(result.error || 'Ukjent feil ved analyse')
      }
    } catch (err) {
      setError('Kunne ikke analysere bildet. Prøv igjen.')
      console.error('Scan error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    setImagePreview(null)
    setError(null)
    onOpenChange(false)
  }

  const clearImage = () => {
    setImagePreview(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleClose()
      else onOpenChange(newOpen)
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Skann plukkliste</DialogTitle>
          <DialogDescription>
            Ta bilde av eller last opp en utfylt plukkliste for automatisk avlesning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Camera view */}
          {showCamera && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={stopCamera}>
                  Avbryt
                </Button>
                <Button onClick={capturePhoto}>
                  <Camera className="mr-2 h-4 w-4" />
                  Ta bilde
                </Button>
              </div>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && !showCamera && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Plukkliste"
                  className="w-full rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Analyze button */}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyserer med AI...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Analyser plukkliste
                  </>
                )}
              </Button>

              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={undefined} className="animate-pulse" />
                  <p className="text-sm text-muted-foreground text-center">
                    AI leser av plukklisten...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload/Camera options (when no image) */}
          {!imagePreview && !showCamera && (
            <div className="space-y-4">
              {/* Camera button */}
              <Button
                variant="outline"
                className="w-full h-20"
                onClick={startCamera}
              >
                <Camera className="mr-2 h-6 w-6" />
                Ta bilde med kamera
              </Button>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">
                  {isDragActive ? 'Slipp bildet her...' : 'Dra og slipp bilde her'}
                </p>
                <p className="text-xs text-muted-foreground">
                  eller klikk for å velge fil
                </p>
              </div>

              {/* Info box */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Tips for best resultat:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Sørg for god belysning</li>
                  <li>Hold kamera/dokumentet rett</li>
                  <li>Sjekk at alle tall er synlige</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
