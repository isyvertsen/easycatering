'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowAutomationApi, WorkflowDefinition } from '@/lib/api/workflow-automation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Bot
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useWorkflowChat } from '@/hooks/useWorkflowChat'

export default function WorkflowsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { openChat } = useWorkflowChat()
  const [deleteConfirm, setDeleteConfirm] = useState<WorkflowDefinition | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null)

  // Fetch workflows
  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowAutomationApi.listWorkflows({ page_size: 100 }),
  })

  // Update workflow mutation (toggle active)
  const updateMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      workflowAutomationApi.updateWorkflow(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast({
        title: 'Suksess',
        description: 'Arbeidsflyten ble oppdatert',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke oppdatere arbeidsflyten',
        variant: 'destructive',
      })
    },
  })

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => workflowAutomationApi.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setDeleteConfirm(null)
      toast({
        title: 'Slettet',
        description: 'Arbeidsflyten ble slettet',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke slette arbeidsflyten',
        variant: 'destructive',
      })
    },
  })

  // Execute workflow mutation
  const executeMutation = useMutation({
    mutationFn: (id: number) => workflowAutomationApi.executeWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast({
        title: 'Startet',
        description: 'Arbeidsflyten kjører nå',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke kjøre arbeidsflyten',
        variant: 'destructive',
      })
    },
  })

  const workflows = workflowsData?.items || []

  const handleToggleActive = (workflow: WorkflowDefinition) => {
    updateMutation.mutate({
      id: workflow.id,
      is_active: !workflow.is_active,
    })
  }

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
    }
  }

  const handleExecuteNow = (workflow: WorkflowDefinition) => {
    executeMutation.mutate(workflow.id)
  }

  const handleOpenAI = () => {
    openChat()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arbeidsflyter</h1>
          <p className="text-muted-foreground mt-2">
            Administrer automatiserte oppgaver og planlagte arbeidsflyter
          </p>
        </div>
        <Button onClick={handleOpenAI} size="lg">
          <Bot className="mr-2 h-5 w-5" />
          Opprett med AI
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">arbeidsflyter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter((w) => w.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">kjører automatisk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inaktive</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter((w) => !w.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">pauset</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle arbeidsflyter</CardTitle>
          <CardDescription>
            Klikk på "Opprett med AI" for å lage en ny arbeidsflyt ved hjelp av naturlig språk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center p-8">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ingen arbeidsflyter ennå</h3>
              <p className="text-muted-foreground mb-4">
                Opprett din første arbeidsflyt ved å bruke AI-assistenten
              </p>
              <Button onClick={handleOpenAI}>
                <Bot className="mr-2 h-4 w-4" />
                Kom i gang med AI
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sist kjørt</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-muted-foreground">
                            {workflow.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {workflow.workflow_type === 'scheduled' ? 'Planlagt' : 'Hendelsesbasert'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workflow.is_active ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Pause className="mr-1 h-3 w-3" />
                          Inaktiv
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {workflow.last_executed_at ? (
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(workflow.last_executed_at), {
                            addSuffix: true,
                            locale: nb,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Aldri</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedWorkflow(workflow)}
                          title="Se detaljer"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(workflow)}
                          disabled={updateMutation.isPending}
                          title={workflow.is_active ? 'Pause' : 'Aktiver'}
                        >
                          {workflow.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecuteNow(workflow)}
                          disabled={executeMutation.isPending}
                          title="Kjør nå"
                        >
                          <Play className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(workflow)}
                          disabled={deleteMutation.isPending}
                          title="Slett"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett arbeidsflyt?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette "{deleteConfirm?.name}"? Dette vil også slette alle
              steg, kjøreplaner og kjøringshistorikk. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workflow Details Dialog (TODO: Implement full details view) */}
      {selectedWorkflow && (
        <AlertDialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedWorkflow.name}</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedWorkflow.description || 'Ingen beskrivelse'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Detaljer</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd className="font-medium">
                      {selectedWorkflow.workflow_type === 'scheduled'
                        ? 'Planlagt'
                        : 'Hendelsesbasert'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="font-medium">
                      {selectedWorkflow.is_active ? 'Aktiv' : 'Inaktiv'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Opprettet:</dt>
                    <dd className="font-medium">
                      {new Date(selectedWorkflow.created_at).toLocaleDateString('nb-NO')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Lukk</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
