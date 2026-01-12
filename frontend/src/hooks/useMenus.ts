import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { menusApi, MenuListParams, MenuListResponse, WeeklyMenuPlan, MenuPrintData } from '@/lib/api/menus'
import { Menu } from '@/types/models'

export function useMenusList(
  params?: MenuListParams,
  options?: UseQueryOptions<MenuListResponse>
) {
  return useQuery<MenuListResponse>({
    queryKey: ['menus', 'list', params],
    queryFn: () => menusApi.list(params),
    ...options
  })
}

export function useMenu(
  id: number,
  options?: UseQueryOptions<Menu>
) {
  return useQuery<Menu>({
    queryKey: ['menus', id],
    queryFn: () => menusApi.get(id),
    enabled: !!id,
    ...options
  })
}

export function useCreateMenu(
  options?: UseMutationOptions<Menu, Error, Omit<Menu, 'menyid'>>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Menu, Error, Omit<Menu, 'menyid'>>({
    mutationFn: menusApi.create,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useUpdateMenu(
  options?: UseMutationOptions<Menu, Error, { id: number; data: Partial<Menu> }>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Menu, Error, { id: number; data: Partial<Menu> }>({
    mutationFn: ({ id, data }) => menusApi.update(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus', variables.id] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useDeleteMenu(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, number>({
    mutationFn: menusApi.delete,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useWeeklyMenuPlans(
  startWeek: number,
  numberOfWeeks: number,
  year: number,
  options?: UseQueryOptions<WeeklyMenuPlan[]>
) {
  return useQuery<WeeklyMenuPlan[]>({
    queryKey: ['menus', 'weekly', startWeek, numberOfWeeks, year],
    queryFn: () => menusApi.getWeeklyPlans(startWeek, numberOfWeeks, year),
    ...options
  })
}

export function useGenerateMenuOrderForm(
  options?: UseMutationOptions<MenuPrintData, Error, { customerId: number; startWeek: number; numberOfWeeks?: number }>
) {
  return useMutation<MenuPrintData, Error, { customerId: number; startWeek: number; numberOfWeeks?: number }>({
    mutationFn: ({ customerId, startWeek, numberOfWeeks = 4 }) => 
      menusApi.generateMenuOrderForm(customerId, startWeek, numberOfWeeks),
    ...options
  })
}

export function useCreateOrderFromMenuForm(
  options?: UseMutationOptions<any, Error, MenuPrintData>
) {
  const queryClient = useQueryClient()
  
  return useMutation<any, Error, MenuPrintData>({
    mutationFn: menusApi.createOrderFromMenuForm,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}