import { Employee } from '@/types/models'
import { employeesApi, EmployeeListParams, EmployeeCreateData } from '@/lib/api/employees'
import { createEntityCrudHooks } from './useEntityCrud'

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

// Eksporter hooks med forventede navn - Fra 72 linjer til 20 linjer!
export const useEmployeesList = hooks.useList
export const useEmployee = hooks.useGet
export const useCreateEmployee = hooks.useCreate
export const useUpdateEmployee = hooks.useUpdate
export const useDeleteEmployee = hooks.useDelete
