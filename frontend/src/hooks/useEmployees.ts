import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Employee } from '@/types/models'
import { employeesApi, EmployeeListParams, EmployeeCreateData } from '@/lib/api/employees'
import { createEntityCrudHooks } from './useEntityCrud'
import { toast } from '@/hooks/use-toast'

// Lag type-safe hooks med konsistent error handling og toast-meldinger
const hooks = createEntityCrudHooks<Employee, EmployeeCreateData, EmployeeListParams>({
  entityName: 'employees',
  displayName: {
    singular: 'Ansatt',
    plural: 'Ansatte'
  },
  api: employeesApi,
  getId: (employee) => employee.id,
  getDisplayName: (employee) => `${employee.fornavn} ${employee.etternavn}`.trim() || 'Ansatt'
})

// Eksporter hooks med forventede navn
export const useEmployeesList = hooks.useList
export const useEmployee = hooks.useGet
export const useCreateEmployee = hooks.useCreate
export const useUpdateEmployee = hooks.useUpdate
export const useDeleteEmployee = hooks.useDelete

// Bulk delete hook
export function useBulkDeleteEmployees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => employeesApi.delete(id)))
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast({
        title: 'Slettet',
        description: `${ids.length} ansatte ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette ansatte',
        variant: 'destructive',
      })
    },
  })
}
