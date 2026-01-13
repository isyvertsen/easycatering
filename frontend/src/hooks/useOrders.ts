import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { ordersApi, OrderListParams, OrderListResponse, OrderCreateData, OrderLineCreateData } from '@/lib/api/orders'
import { Order, OrderLine } from '@/types/models'

// Order hooks
export function useOrdersList(
  params?: OrderListParams,
  options?: Omit<UseQueryOptions<OrderListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrderListResponse>({
    queryKey: ['orders', 'list', params],
    queryFn: () => ordersApi.list(params),
    ...options
  })
}

export function useOrder(
  id: number,
  options?: UseQueryOptions<Order>
) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
    ...options
  })
}

export function useCreateOrder(
  options?: UseMutationOptions<Order, Error, OrderCreateData>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Order, Error, OrderCreateData>({
    mutationFn: ordersApi.create,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useUpdateOrder(
  options?: UseMutationOptions<Order, Error, { id: number; data: Partial<OrderCreateData> }>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Order, Error, { id: number; data: Partial<OrderCreateData> }>({
    mutationFn: ({ id, data }) => ordersApi.update(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useCancelOrder(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, number>({
    mutationFn: ordersApi.cancel,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

// Order line hooks
export function useOrderLines(
  orderId: number,
  options?: UseQueryOptions<OrderLine[]>
) {
  return useQuery<OrderLine[]>({
    queryKey: ['orders', orderId, 'lines'],
    queryFn: () => ordersApi.getOrderLines(orderId),
    enabled: !!orderId,
    ...options
  })
}

export function useAddOrderLine(
  options?: UseMutationOptions<OrderLine, Error, { orderId: number; data: OrderLineCreateData }>
) {
  const queryClient = useQueryClient()
  
  return useMutation<OrderLine, Error, { orderId: number; data: OrderLineCreateData }>({
    mutationFn: ({ orderId, data }) => ordersApi.addOrderLine(orderId, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'lines'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useUpdateOrderLine(
  options?: UseMutationOptions<OrderLine, Error, { orderId: number; lineId: number; data: Partial<OrderLineCreateData> }>
) {
  const queryClient = useQueryClient()
  
  return useMutation<OrderLine, Error, { orderId: number; lineId: number; data: Partial<OrderLineCreateData> }>({
    mutationFn: ({ orderId, lineId, data }) => ordersApi.updateOrderLine(orderId, lineId, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'lines'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export function useDeleteOrderLine(
  options?: UseMutationOptions<void, Error, { orderId: number; lineId: number }>
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { orderId: number; lineId: number }>({
    mutationFn: ({ orderId, lineId }) => ordersApi.deleteOrderLine(orderId, lineId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId, 'lines'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

// Duplicate order hook
export function useDuplicateOrder(
  options?: UseMutationOptions<Order, Error, number>
) {
  const queryClient = useQueryClient()

  return useMutation<Order, Error, number>({
    mutationFn: ordersApi.duplicate,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

// Update order status hook
export function useUpdateOrderStatus(
  options?: UseMutationOptions<{ message: string }, Error, { id: number; statusId: number }>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, Error, { id: number; statusId: number }>({
    mutationFn: ({ id, statusId }) => ordersApi.updateStatus(id, statusId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

// Batch update order status hook
export function useBatchUpdateOrderStatus(
  options?: UseMutationOptions<{ message: string; updated_count: number }, Error, { orderIds: number[]; statusId: number }>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; updated_count: number }, Error, { orderIds: number[]; statusId: number }>({
    mutationFn: ({ orderIds, statusId }) => ordersApi.batchUpdateStatus(orderIds, statusId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}