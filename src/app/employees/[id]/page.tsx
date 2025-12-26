"use client"

import { useRouter, useParams } from "next/navigation"
import { EmployeeForm, EmployeeFormValues } from "@/components/employees/employee-form"
import { useEmployee, useUpdateEmployee } from "@/hooks/useEmployees"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const employeeId = parseInt(params.id as string)
  
  const { data: employee, isLoading } = useEmployee(employeeId)
  const updateMutation = useUpdateEmployee()

  const handleSubmit = (data: EmployeeFormValues) => {
    updateMutation.mutate(
      { id: employeeId, data },
      {
        onSuccess: () => {
          toast({
            title: "Ansatt oppdatert",
            description: "Ansattinformasjonen ble oppdatert.",
          })
          router.push('/employees')
        },
        onError: (error) => {
          toast({
            title: "Feil",
            description: "Kunne ikke oppdatere ansatt.",
            variant: "destructive",
          })
        },
      }
    )
  }

  const handleCancel = () => {
    router.push('/employees')
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

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Fant ikke ansatt med ID {employeeId}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rediger ansatt</h1>
        <p className="text-muted-foreground">
          Oppdater informasjon om {employee.fornavn} {employee.etternavn}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ansattinformasjon</CardTitle>
          <CardDescription>
            Oppdater informasjon om den ansatte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            employee={employee}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}