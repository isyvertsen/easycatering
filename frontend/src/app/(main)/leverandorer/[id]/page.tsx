"use client"

import { useRouter, useParams } from "next/navigation"
import { LeverandorForm, LeverandorFormValues } from "@/components/leverandorer/leverandor-form"
import { useLeverandor, useUpdateLeverandor } from "@/hooks/useLeverandorer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditLeverandorPage() {
  const router = useRouter()
  const params = useParams()
  const leverandorId = parseInt(params.id as string)

  const { data: leverandor, isLoading } = useLeverandor(leverandorId)
  const updateMutation = useUpdateLeverandor()

  const handleSubmit = (data: LeverandorFormValues) => {
    updateMutation.mutate(
      { id: leverandorId, data },
      {
        onSuccess: () => {
          router.push('/leverandorer')
        },
      }
    )
  }

  const handleCancel = () => {
    router.push('/leverandorer')
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!leverandor) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Fant ikke leverandør med ID {leverandorId}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rediger leverandør</h1>
        <p className="text-muted-foreground">
          Oppdater informasjon om {leverandor.leverandornavn}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leverandørinformasjon</CardTitle>
          <CardDescription>
            Oppdater informasjon om leverandøren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeverandorForm
            leverandor={leverandor}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
