'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Bug, Sparkles, CheckCircle, Lightbulb, X, ImagePlus, Zap } from 'lucide-react'
import { feedbackApi } from '@/lib/api/feedback'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Screenshot {
  id: string
  dataUrl: string
  name: string
  size: number
}

type Step = 'type-selection' | 'input' | 'follow-up' | 'review' | 'success'

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  // State
  const [step, setStep] = useState<Step>('type-selection')
  const [issueType, setIssueType] = useState<'bug' | 'feature'>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({})
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [improvedTitle, setImprovedTitle] = useState('')
  const [improvedDescription, setImprovedDescription] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [targetRepositories, setTargetRepositories] = useState<string[]>([])
  const [createdIssues, setCreatedIssues] = useState<any[]>([])
  const [issueUrl, setIssueUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoHandle, setAutoHandle] = useState(false)

  // Browser info
  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    const platform = navigator.platform
    return `${ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Unknown'} på ${platform}`
  }

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const newScreenshot: Screenshot = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dataUrl: reader.result as string,
          name: file.name,
          size: file.size,
        }
        setScreenshots((prev) => [...prev, newScreenshot])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: true,
    noClick: true,  // Don't open file dialog on click, only on drop
  })

  // Handle paste
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

  // Remove screenshot
  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((img) => img.id !== id))
  }

  // Reset dialog
  const resetDialog = () => {
    setStep('type-selection')
    setIssueType('bug')
    setTitle('')
    setDescription('')
    setScreenshots([])
    setFollowUpAnswers({})
    setFollowUpQuestions([])
    setImprovedTitle('')
    setImprovedDescription('')
    setWarnings([])
    setTargetRepositories([])
    setCreatedIssues([])
    setIssueUrl('')
    setAutoHandle(false)
  }

  // Step 1: Type selection → Step 2: Input
  const handleTypeSelected = (type: 'bug' | 'feature') => {
    setIssueType(type)
    setStep('input')
  }

  // Step 2: Analyze input
  const handleAnalyze = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Fyll ut både tittel og beskrivelse')
      return
    }

    setLoading(true)
    toast.loading('AI analyserer...', { id: 'analyze' })

    try {
      const result = await feedbackApi.analyze({
        type: issueType,
        title,
        description,
        screenshots: screenshots.map(s => s.dataUrl),
      })

      toast.success('Analyse fullført!', { id: 'analyze' })

      if (result.needsMoreInfo && result.followUpQuestions) {
        // Go to follow-up step
        setFollowUpQuestions(result.followUpQuestions)
        setStep('follow-up')
      } else {
        // Go to review step
        setImprovedTitle(result.improvedTitle || title)
        setImprovedDescription(result.improvedDescription || description)
        setTargetRepositories(result.targetRepositories || ['backend', 'frontend'])

        // Build warnings
        const newWarnings: string[] = []
        if (result.existingFeature) {
          newWarnings.push(`Funksjonen finnes kanskje allerede: ${result.existingFeature}`)
        }
        if (result.suggestSplit) {
          newWarnings.push('Denne rapporten inneholder både feil og funksjonsønske. Vurder å dele den opp.')
        }
        setWarnings(newWarnings)

        setStep('review')
      }
    } catch (error) {
      toast.error('Kunne ikke analysere med AI', { id: 'analyze' })
      // Fall back to review without improvements
      setImprovedTitle(title)
      setImprovedDescription(description)
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Re-analyze with follow-up answers
  const handleFollowUpSubmit = async () => {
    if (followUpQuestions.some(q => !followUpAnswers[q]?.trim())) {
      toast.error('Vennligst svar på alle spørsmål')
      return
    }

    setLoading(true)
    toast.loading('AI analyserer på nytt...', { id: 'reanalyze' })

    try {
      const result = await feedbackApi.analyze({
        type: issueType,
        title,
        description,
        answers: followUpAnswers,
        screenshots: screenshots.map(s => s.dataUrl),
      })

      toast.success('Analyse fullført!', { id: 'reanalyze' })

      setImprovedTitle(result.improvedTitle || title)
      setImprovedDescription(result.improvedDescription || description)
      setTargetRepositories(result.targetRepositories || ['backend', 'frontend'])

      const newWarnings: string[] = []
      if (result.existingFeature) {
        newWarnings.push(`Funksjonen finnes kanskje allerede: ${result.existingFeature}`)
      }
      if (result.suggestSplit) {
        newWarnings.push('Denne rapporten inneholder både feil og funksjonsønske.')
      }
      setWarnings(newWarnings)

      setStep('review')
    } catch (error) {
      toast.error('Kunne ikke analysere med AI', { id: 'reanalyze' })
      setImprovedTitle(title)
      setImprovedDescription(description)
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  // Step 4: Create issue
  const handleCreateIssue = async () => {
    setLoading(true)
    toast.loading('Oppretter GitHub issue(s)...', { id: 'create' })

    try {
      const result = await feedbackApi.createIssue({
        type: issueType,
        title: improvedTitle,
        description: improvedDescription,
        browserInfo: getBrowserInfo(),
        currentUrl: typeof window !== 'undefined' ? window.location.href : '',
        aiImproved: improvedTitle !== title || improvedDescription !== description,
        targetRepositories: targetRepositories,
        screenshots: screenshots.map(s => s.dataUrl),
        autoHandle: autoHandle,
      })

      if (result.success && result.issues && result.issues.length > 0) {
        const issueCount = result.issues.length
        toast.success(`${issueCount} issue${issueCount > 1 ? 's' : ''} opprettet!`, { id: 'create' })
        setCreatedIssues(result.issues)
        setIssueUrl(result.issueUrl || '')  // Primary URL for backward compatibility
        setStep('success')
      } else {
        toast.error(result.error || 'Kunne ikke opprette issue', { id: 'create' })
      }
    } catch (error) {
      toast.error('Kunne ikke opprette issue', { id: 'create' })
    } finally {
      setLoading(false)
    }
  }

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 'type-selection':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Hva vil du rapportere?</DialogTitle>
              <DialogDescription>
                Velg mellom feilrapport eller funksjonsønske
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => handleTypeSelected('bug')}
              >
                <Bug className="h-8 w-8 text-red-500" />
                <div>
                  <div className="font-semibold">Feilrapport</div>
                  <div className="text-xs text-muted-foreground">Noe virker ikke</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => handleTypeSelected('feature')}
              >
                <Lightbulb className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-semibold">Funksjonsønske</div>
                  <div className="text-xs text-muted-foreground">Forslag til ny funksjon</div>
                </div>
              </Button>
            </div>
          </>
        )

      case 'input':
        return (
          <>
            <DialogHeader>
              <DialogTitle>
                {issueType === 'bug' ? 'Rapporter feil' : 'Foreslå funksjon'}
              </DialogTitle>
              <DialogDescription>
                Beskriv problemet eller funksjonen så detaljert som mulig
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kort beskrivelse..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={
                    issueType === 'bug'
                      ? 'Hva skjedde? Hva forventet du? Hvordan reprodusere?'
                      : 'Hva skal funksjonen gjøre? Hvorfor trengs den?'
                  }
                  className="min-h-[150px]"
                />

                {/* Drop zone for images */}
                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-muted-foreground/25 bg-muted/20 hover:border-muted-foreground/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ImagePlus className="h-4 w-4" />
                    {isDragActive ? (
                      <span className="font-medium text-blue-600">Slipp bildet her...</span>
                    ) : (
                      <span>Lim inn skjermbilde (Ctrl+V) eller dra og slipp bilder her</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Screenshots preview */}
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <Label>Skjermbilder ({screenshots.length})</Label>
                  <div className="space-y-2">
                    {screenshots.map((screenshot) => (
                      <div
                        key={screenshot.id}
                        className="flex items-center gap-3 p-2 border rounded-lg bg-card"
                      >
                        <img
                          src={screenshot.dataUrl}
                          alt={screenshot.name}
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{screenshot.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(screenshot.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeScreenshot(screenshot.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('type-selection')}>
                Tilbake
              </Button>
              <Button onClick={handleAnalyze} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyser med AI
              </Button>
            </DialogFooter>
          </>
        )

      case 'follow-up':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Noen oppfølgingsspørsmål</DialogTitle>
              <DialogDescription>
                AI trenger litt mer informasjon for å lage en god rapport
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {followUpQuestions.map((question, idx) => (
                <div key={idx} className="space-y-2">
                  <Label>{question}</Label>
                  <Textarea
                    value={followUpAnswers[question] || ''}
                    onChange={(e) =>
                      setFollowUpAnswers({ ...followUpAnswers, [question]: e.target.value })
                    }
                    placeholder="Ditt svar..."
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>
                Tilbake
              </Button>
              <Button onClick={handleFollowUpSubmit} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Fortsett
              </Button>
            </DialogFooter>
          </>
        )

      case 'review':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Gjennomgå rapport</DialogTitle>
              <DialogDescription>
                AI har forbedret rapporten. Sjekk at alt ser riktig ut.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <div key={idx} className="flex gap-2 p-3 border rounded-md bg-yellow-50">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label>Tittel</Label>
                <div className="p-3 border rounded-md bg-muted/50">
                  <p className="font-medium">{improvedTitle}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beskrivelse</Label>
                <div className="p-3 border rounded-md bg-muted/50 max-h-[200px] overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{improvedDescription}</p>
                </div>
              </div>
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <Label>Skjermbilder ({screenshots.length})</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {screenshots.map((screenshot) => (
                      <img
                        key={screenshot.id}
                        src={screenshot.dataUrl}
                        alt={screenshot.name}
                        className="w-full h-32 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between p-4 border rounded-md bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label htmlFor="auto-handle" className="text-sm font-medium cursor-pointer">
                      Automatisk håndtering
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      La Claude undersøke og implementere løsningen hvis risikoen er lav
                    </p>
                  </div>
                </div>
                <Switch
                  id="auto-handle"
                  checked={autoHandle}
                  onCheckedChange={setAutoHandle}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>
                Rediger
              </Button>
              <Button onClick={handleCreateIssue} disabled={loading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Opprett issue
              </Button>
            </DialogFooter>
          </>
        )

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                {createdIssues.length > 1 ? 'Issues opprettet!' : 'Issue opprettet!'}
              </DialogTitle>
              <DialogDescription>
                Takk for tilbakemeldingen. Vi har mottatt rapporten.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {createdIssues.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  Issue ble opprettet i {createdIssues.length} repositories basert på AI-analyse:
                </p>
              )}
              {createdIssues.map((issue, idx) => (
                <div key={idx} className="p-4 border rounded-md bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-green-800">
                      {issue.repository.toUpperCase()} Repository
                    </p>
                    <span className="text-xs text-green-600">#{issue.number}</span>
                  </div>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {issue.url}
                  </a>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  resetDialog()
                  onOpenChange(false)
                }}
              >
                Lukk
              </Button>
            </DialogFooter>
          </>
        )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetDialog()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}
