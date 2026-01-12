import { apiClient } from '@/lib/api-client'
import { Menu, Product } from '@/types/models'

export interface MenuListParams {
  skip?: number
  limit?: number
  menygruppe?: number
  search?: string
}

export interface MenuListResponse {
  items: Menu[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface WeeklyMenuPlan {
  weekNumber: number
  year: number
  items: WeeklyMenuItem[]
}

export interface WeeklyMenuItem {
  produktid: number
  produkt: Product
  displayOrder: number
  defaultQuantity?: number
}

export interface MenuOrderItem {
  produktid: number
  produktnavn: string
  leverandorsproduktnr?: string
  enhet?: string
  displayOrder: number
  quantity: number
}

export interface MenuPrintData {
  customerName: string
  customerId: number
  weeks: {
    weekNumber: number
    year: number
    items: MenuOrderItem[]
  }[]
}

export const menusApi = {
  list: async (params?: MenuListParams): Promise<MenuListResponse> => {
    const queryParams = new URLSearchParams()
    
    const skip = params?.skip || 0
    const limit = params?.limit || 20
    
    queryParams.append('skip', skip.toString())
    queryParams.append('limit', limit.toString())
    
    if (params?.menygruppe) {
      queryParams.append('menygruppe', params.menygruppe.toString())
    }
    
    if (params?.search) {
      queryParams.append('sok', params.search)
    }
    
    const response = await apiClient.get(`/v1/meny/?${queryParams}`)
    const items = response.data as Menu[]
    
    const total = items.length
    const page = Math.floor(skip / limit) + 1
    const total_pages = Math.ceil(total / limit)
    
    return {
      items,
      total,
      page,
      page_size: limit,
      total_pages
    }
  },

  get: async (id: number): Promise<Menu> => {
    const response = await apiClient.get(`/v1/meny/${id}`)
    return response.data
  },

  create: async (data: Omit<Menu, 'menyid'>): Promise<Menu> => {
    const response = await apiClient.post('/v1/meny/', data)
    return response.data
  },

  update: async (id: number, data: Partial<Menu>): Promise<Menu> => {
    const response = await apiClient.put(`/v1/meny/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/meny/${id}`)
  },

  // Get weekly menu plan for multiple weeks
  getWeeklyPlans: async (startWeek: number, numberOfWeeks: number, year: number): Promise<WeeklyMenuPlan[]> => {
    // This would need a backend endpoint to fetch menu items for specific weeks
    // For now, returning mock data structure
    const plans: WeeklyMenuPlan[] = []
    
    for (let i = 0; i < numberOfWeeks; i++) {
      plans.push({
        weekNumber: startWeek + i,
        year,
        items: [] // Would be populated from backend
      })
    }
    
    return plans
  },

  // Generate print-ready menu order form
  generateMenuOrderForm: async (customerId: number, startWeek: number, numberOfWeeks: number = 4): Promise<MenuPrintData> => {
    // Fetch customer data and weekly menus
    const [customer, products] = await Promise.all([
      apiClient.get(`/v1/kunder/${customerId}`),
      apiClient.get('/v1/produkter/?limit=1000&aktiv=true')
    ])

    const currentYear = new Date().getFullYear()
    const weeks = []

    // Create menu for each week
    for (let i = 0; i < numberOfWeeks; i++) {
      const weekNumber = startWeek + i
      
      // Sort products by produktid for consistent ordering
      const sortedProducts = products.data.sort((a: any, b: any) => a.produktid - b.produktid)
      
      weeks.push({
        weekNumber,
        year: currentYear,
        items: sortedProducts.map((product: any, index: number) => ({
          produktid: product.produktid,
          produktnavn: product.produktnavn,
          leverandorsproduktnr: product.leverandorsproduktnr,
          enhet: product.enhet,
          displayOrder: index + 1,
          quantity: 0 // To be filled by customer
        }))
      })
    }

    return {
      customerName: customer.data.kundenavn,
      customerId: customer.data.kundeid,
      weeks
    }
  },

  // Create order from filled menu form
  createOrderFromMenuForm: async (menuData: MenuPrintData): Promise<any> => {
    const orders = []
    
    for (const week of menuData.weeks) {
      // Calculate delivery date based on week number
      const deliveryDate = getDateFromWeekNumber(week.weekNumber, week.year)
      
      // Filter items with quantity > 0
      const orderItems = week.items.filter(item => item.quantity > 0)
      
      if (orderItems.length > 0) {
        const orderData = {
          kundeid: menuData.customerId,
          kundenavn: menuData.customerName,
          ordredato: new Date().toISOString(),
          leveringsdato: deliveryDate.toISOString(),
          ordredetaljer: orderItems.map(item => ({
            produktid: item.produktid,
            antall: item.quantity,
            unik: Date.now() + Math.random() // Generate unique identifier
          }))
        }
        
        const response = await apiClient.post('/v1/ordrer/', orderData)
        orders.push(response.data)
      }
    }
    
    return orders
  }
}

// Helper function to get date from week number
function getDateFromWeekNumber(week: number, year: number): Date {
  const date = new Date(year, 0, 1)
  const dayOfWeek = date.getDay()
  const daysToAdd = (week - 1) * 7 - dayOfWeek + 1 // Monday of the week
  date.setDate(date.getDate() + daysToAdd)
  return date
}