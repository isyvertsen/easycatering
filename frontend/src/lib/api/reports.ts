/**
 * Reports API client for generating and downloading reports
 */
import { api } from '../api'

export const reportsApi = {
  /**
   * Download order confirmation PDF
   *
   * @param ordreId - Order ID
   */
  downloadOrderConfirmation: async (ordreId: number): Promise<void> => {
    try {
      const response = await api.get(
        `/v1/report-generator/ordre-bekreftelse/${ordreId}`,
        { responseType: 'blob' }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ordre_${ordreId}.pdf`)
      document.body.appendChild(link)
      link.click()

      // Cleanup
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download order confirmation:', error)
      throw error
    }
  },

  /**
   * Download delivery note PDF
   *
   * @param ordreId - Order ID
   */
  downloadDeliveryNote: async (ordreId: number): Promise<void> => {
    try {
      const response = await api.get(
        `/v1/report-generator/leveringsseddel/${ordreId}`,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `leveringsseddel_${ordreId}.pdf`)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download delivery note:', error)
      throw error
    }
  },

  /**
   * Download customer list as Excel
   *
   * @param limit - Maximum number of customers to export (default: 1000)
   */
  downloadCustomerListExcel: async (limit: number = 1000): Promise<void> => {
    try {
      const response = await api.get(
        `/v1/report-generator/kundeliste-excel?limit=${limit}`,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'kundeliste.xlsx')
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download customer list:', error)
      throw error
    }
  },

  /**
   * Download pick list PDF for warehouse
   *
   * @param ordreId - Order ID
   */
  downloadPickList: async (ordreId: number): Promise<void> => {
    try {
      const response = await api.get(
        `/v1/report-generator/plukkliste/${ordreId}`,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `plukkliste_${ordreId}.pdf`)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download pick list:', error)
      throw error
    }
  },

  /**
   * Download batch pick list PDF for multiple orders
   *
   * @param orderIds - Array of order IDs
   */
  downloadBatchPickList: async (orderIds: number[]): Promise<void> => {
    try {
      const response = await api.post(
        '/v1/report-generator/plukkliste-batch',
        { order_ids: orderIds },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      // Create filename based on order IDs
      const idsStr = orderIds.slice(0, 5).join('_')
      const suffix = orderIds.length > 5 ? `_og_${orderIds.length - 5}_flere` : ''
      link.setAttribute('download', `plukkliste_${idsStr}${suffix}.pdf`)

      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download batch pick list:', error)
      throw error
    }
  },

  /**
   * Download batch delivery notes PDF for multiple orders
   *
   * @param orderIds - Array of order IDs
   */
  downloadBatchDeliveryNote: async (orderIds: number[]): Promise<void> => {
    try {
      const response = await api.post(
        '/v1/report-generator/pakkseddel-batch',
        { order_ids: orderIds },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      // Create filename based on order IDs
      const idsStr = orderIds.slice(0, 5).join('_')
      const suffix = orderIds.length > 5 ? `_og_${orderIds.length - 5}_flere` : ''
      link.setAttribute('download', `pakksedler_${idsStr}${suffix}.pdf`)

      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download batch delivery notes:', error)
      throw error
    }
  },
}
