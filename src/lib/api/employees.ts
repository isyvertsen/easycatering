import { Employee } from '@/types/models'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'

export interface EmployeeListParams extends BaseListParams {
  aktiv?: boolean
  avdeling?: string
}

export type EmployeeListResponse = BaseListResponse<Employee>

// CreateData type - omit both id and ansattid since they are server-generated
export type EmployeeCreateData = Omit<Employee, 'id' | 'ansattid'>

// Bruk generisk CRUD factory - reduserer ~60 linjer duplicate kode
export const employeesApi = createCrudApi<Employee, EmployeeCreateData, EmployeeListParams>({
  endpoint: '/v1/ansatte'
})
