"use client"

import { useRouter } from "next/navigation"
import { LeverandorForm, LeverandorFormValues } from "@/components/leverandorer/leverandor-form"
import { useCreateLeverandor } from "@/hooks/useLeverandorer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewLeverandorPage() {
  const router = useRouter()
  const createMutation = useCreateLeverandor()

  const handleSubmit = (data: LeverandorFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        router.push('/leverandorer')
      },
    })
  }

  const handleCancel = () => {
    router.push('/leverandorer')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ny leverandør</h1>
        <p className="text-muted-foreground">
          Registrer en ny leverandør i systemet
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leverandørinformasjon</CardTitle>
          <CardDescription>
            Fyll ut informasjon om leverandøren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeverandorForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
