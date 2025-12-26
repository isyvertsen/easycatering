"use client"

import { useRouter } from "next/navigation"
import { EmployeeForm, EmployeeFormValues } from "@/components/employees/employee-form"
import { useCreateEmployee } from "@/hooks/useEmployees"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const createMutation = useCreateEmployee()

  const handleSubmit = (data: EmployeeFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Ansatt opprettet",
          description: "Den ansatte ble opprettet.",
        })
        router.push('/employees')
      },
      onError: (error) => {
        toast({
          title: "Feil",
          description: "Kunne ikke opprette ansatt.",
          variant: "destructive",
        })
      },
    })
  }

  const handleCancel = () => {
    router.push('/employees')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ny ansatt</h1>
        <p className="text-muted-foreground">
          Registrer en ny ansatt i systemet
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ansattinformasjon</CardTitle>
          <CardDescription>
            Fyll ut informasjon om den ansatte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}