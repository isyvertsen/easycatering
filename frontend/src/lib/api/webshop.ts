import { apiClient } from '@/lib/api-client'
import { Product, Order, OrderLine } from '@/types/models'

/**
 * Webshop API Client
 *
 * Dette er frontend-klienten for webshop-APIet.
 * Backend må implementere følgende endepunkter:
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Query parameters for listing webshop products
 *
 * Backend endpoint: GET /api/v1/webshop/produkter
 * Filtrerer produkter hvor webshop=true og utgatt=false
 */
export interface WebshopProductListParams {
  /** Selected customer ID (for users with multiple customers) */
  kundeid?: number
  /** Søketekst - søker i produktnavn, visningsnavn, beskrivelse */
  search?: string
  /** Kategori-ID for filtrering */
  kategori_id?: number
  /** Side-nummer (starter på 1) */
  page?: number
  /** Antall produkter per side (default: 20) */
  page_size?: number
  /** Sorteringsfeltet (default: 'produktnavn') */
  sort_by?: 'produktnavn' | 'pris' | 'visningsnavn'
  /** Sorteringsretning (default: 'asc') */
  sort_order?: 'asc' | 'desc'
  /**
   * Aktiver smart sortering (default: true)
   * - Produkter sorteres etter bestillingsfrekvens siste 4 uker
   * - Deretter etter kategori-rekkefølge fra systeminnstillinger
   * - Til slutt alfabetisk
   */
  smart_sort?: boolean
}

/**
 * Response structure for product listing
 */
export interface WebshopProductListResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Single cart item (client-side only)
 */
export interface CartItem {
  produktid: number
  produktnavn: string
  visningsnavn?: string
  pris: number
  antall: number
  bilde?: string
}

/**
 * Data for creating a webshop order
 *
 * Backend endpoint: POST /api/v1/webshop/ordre
 * - Oppretter ordre med ordrestatusid=1 (Ny - venter på godkjenning)
 * - Knytter til innlogget bruker automatisk
 * - Sender e-postbekreftelse med 14-dagers token
 */
export interface WebshopOrderCreateData {
  /** Liste over produkter og antall */
  ordrelinjer: {
    produktid: number
    antall: number
    /** Pris per enhet (hentes fra produkt hvis ikke angitt) */
    pris?: number
  }[]
  /** Ønsket leveringsdato (ISO format: YYYY-MM-DD) */
  leveringsdato?: string
  /** Ekstra informasjon/kommentar til ordren */
  informasjon?: string
  /** Leveringsadresse (hvis avvikende fra brukerens adresse) */
  leveringsadresse?: string
}

/**
 * Response after creating an order
 */
export interface WebshopOrderCreateResponse {
  ordre: Order
  message: string
  /** Token for e-postlenke (gyldig i 14 dager) */
  email_token?: string
}

/**
 * Query parameters for listing user's orders
 *
 * Backend endpoint: GET /api/v1/webshop/mine-ordre
 * Henter ordrer for innlogget bruker
 */
export interface WebshopMyOrdersParams {
  /** Selected customer ID (for users with multiple customers) */
  kundeid?: number
  /** Side-nummer */
  page?: number
  /** Antall ordre per side */
  page_size?: number
  /** Filtrer etter ordrestatus (1=Ny, 2=Under behandling, 3=Godkjent) */
  ordrestatusid?: number
  /** Søk i ordrenummer eller informasjon */
  search?: string
}

/**
 * Response structure for user's orders
 */
export interface WebshopMyOrdersResponse {
  items: Order[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Query parameters for admin approval list
 *
 * Backend endpoint: GET /api/v1/webshop/ordre/godkjenning
 * Kun tilgjengelig for admin-rolle
 * Henter alle ordrer med ordrestatusid=1 (Ny)
 */
export interface WebshopApprovalListParams {
  /** Side-nummer */
  page?: number
  /** Antall ordre per side */
  page_size?: number
  /** Søk i kundenavn eller ordrenummer */
  search?: string
  /** Fra-dato for filtrering (ISO format) */
  fra_dato?: string
  /** Til-dato for filtrering (ISO format) */
  til_dato?: string
}

/**
 * Response structure for approval list
 */
export interface WebshopApprovalListResponse {
  items: Order[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Response when getting order by token
 *
 * Backend endpoint: GET /api/v1/webshop/ordre/token/:token
 * Validerer token (maks 14 dager gammel)
 * Ingen autentisering påkrevd
 */
export interface WebshopOrderByTokenResponse {
  ordre: Order
  ordrelinjer: OrderLine[]
  /** Er token utløpt? */
  token_utlopt: boolean
  /** Når utløper token (ISO format) */
  token_utloper: string
}

/**
 * Default delivery date response
 *
 * Backend endpoint: GET /api/v1/webshop/default-leveringsdato
 */
export interface DefaultDeliveryDateResponse {
  leveringsdato: string | null
  leveringsdag: number | null
  ukedag_navn: string | null
  message?: string
}

/**
 * Draft order line for auto-save
 */
export interface DraftOrderLine {
  produktid: number
  antall: number
  pris?: number
}

/**
 * Draft order response
 */
export interface DraftOrder {
  ordreid: number
  kundeid?: number
  kundenavn?: string
  ordredato?: string
  ordrestatusid: number
  ordrelinjer: OrderLine[]
  total_sum: number
}

// ============================================================================
// API CLIENT FUNCTIONS
// ============================================================================

/**
 * Webshop API client
 *
 * VIKTIG FOR BACKEND-UTVIKLERE:
 * Alle endepunkter må implementeres i backend med følgende baseURL:
 * /api/v1/webshop
 *
 * Autentisering:
 * - Alle endepunkter krever autentisering UNNTATT /ordre/token/:token
 * - Bruk JWT token fra Authorization header
 * - rolle="bruker" for webshop-tilgang
 * - rolle="admin" for godkjenningsendepunkter
 */
/**
 * Customer info for webshop access
 */
export interface WebshopKundeInfo {
  kundeid: number
  kunde_navn: string
  kundegruppe_navn?: string
  has_webshop_access: boolean
}

/**
 * Response for webshop access check
 */
export interface WebshopAccessResponse {
  has_access: boolean
  kunde_navn?: string
  kundegruppe_navn?: string
  kundeid?: number  // Active customer ID
  message?: string
  available_kunder?: WebshopKundeInfo[]  // All linked customers (when user has multiple)
}

export const webshopApi = {
  // ==========================================================================
  // TILGANGSKONTROLL
  // ==========================================================================

  /**
   * Sjekk om bruker har webshop-tilgang
   *
   * Backend endpoint: GET /api/v1/webshop/tilgang
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  checkAccess: async (kundeid?: number): Promise<WebshopAccessResponse> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/tilgang?${queryString}` : '/v1/webshop/tilgang'
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Hent standard leveringsdato basert på kundens foretrukne leveringsdag
   *
   * Backend endpoint: GET /api/v1/webshop/default-leveringsdato
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  getDefaultDeliveryDate: async (kundeid?: number): Promise<DefaultDeliveryDateResponse> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/default-leveringsdato?${queryString}` : '/v1/webshop/default-leveringsdato'
    const response = await apiClient.get(url)
    return response.data
  },

  // ==========================================================================
  // PRODUKTER (Tilgjengelig for rolle="bruker")
  // ==========================================================================

  /**
   * Hent produkter for webshop
   *
   * Backend endpoint: GET /api/v1/webshop/produkter
   *
   * Forventet backend-respons:
   * {
   *   "items": [
   *     {
   *       "produktid": 1,
   *       "produktnavn": "Melk",
   *       "visningsnavn": "Tine Helmelk 1L",
   *       "pris": 25.90,
   *       "beskrivelse": "Fersk helmelk",
   *       "webshop": true,
   *       "utgatt": false,
   *       "bilde": "url_til_bilde"
   *     }
   *   ],
   *   "total": 100,
   *   "page": 1,
   *   "page_size": 20,
   *   "total_pages": 5
   * }
   *
   * Filtrering:
   * - Kun produkter hvor webshop=true
   * - Kun produkter hvor utgatt=false
   * - Støtte søk i produktnavn, visningsnavn, beskrivelse
   * - Støtte kategori-filtrering
   * - Støtte sortering
   */
  getProducts: async (params?: WebshopProductListParams): Promise<WebshopProductListResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.kundeid) queryParams.append('kundeid', params.kundeid.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.kategori_id) queryParams.append('kategori_id', params.kategori_id.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order)
    // smart_sort is true by default on backend, only pass if explicitly false
    if (params?.smart_sort === false) queryParams.append('smart_sort', 'false')

    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/produkter?${queryString}` : '/v1/webshop/produkter'

    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Hent enkelt produkt for webshop
   *
   * Backend endpoint: GET /api/v1/webshop/produkter/:id
   *
   * Forventet backend-respons: Product objekt (må ha webshop=true)
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  getProduct: async (id: number, kundeid?: number): Promise<Product> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/produkter/${id}?${queryString}` : `/v1/webshop/produkter/${id}`
    const response = await apiClient.get(url)
    return response.data
  },

  // ==========================================================================
  // ORDRE (Tilgjengelig for rolle="bruker")
  // ==========================================================================

  /**
   * Opprett ny webshop-ordre
   *
   * Backend endpoint: POST /api/v1/webshop/ordre
   *
   * Forventet backend-logikk:
   * 1. Hent bruker-ID fra JWT token
   * 2. Valider at alle produkter har webshop=true
   * 3. Opprett ordre med ordrestatusid=1 (Ny)
   * 4. Opprett ordrelinjer
   * 5. Generer 14-dagers token
   * 6. Send e-postbekreftelse med lenke: /webshop/ordre/{token}
   *
   * Forventet backend-respons:
   * {
   *   "ordre": { ordre-objekt },
   *   "message": "Ordre opprettet. E-postbekreftelse sendt.",
   *   "email_token": "token_string"
   * }
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  createOrder: async (data: WebshopOrderCreateData, kundeid?: number): Promise<WebshopOrderCreateResponse> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/ordre?${queryString}` : '/v1/webshop/ordre'
    const response = await apiClient.post(url, data)
    return response.data
  },

  /**
   * Hent mine ordrer
   *
   * Backend endpoint: GET /api/v1/webshop/mine-ordre
   *
   * Forventet backend-logikk:
   * 1. Hent bruker-ID fra JWT token
   * 2. Returner kun ordrer som tilhører brukeren
   * 3. Støtte filtrering etter status
   *
   * Forventet backend-respons:
   * {
   *   "items": [ordre-objekter],
   *   "total": 10,
   *   "page": 1,
   *   "page_size": 20,
   *   "total_pages": 1
   * }
   */
  getMyOrders: async (params?: WebshopMyOrdersParams): Promise<WebshopMyOrdersResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.kundeid) queryParams.append('kundeid', params.kundeid.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.ordrestatusid) queryParams.append('ordrestatusid', params.ordrestatusid.toString())
    if (params?.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/mine-ordre?${queryString}` : '/v1/webshop/mine-ordre'

    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Hent enkelt ordre
   *
   * Backend endpoint: GET /api/v1/webshop/ordre/:id
   *
   * Forventet backend-logikk:
   * 1. Hent bruker-ID fra JWT token
   * 2. Valider at ordren tilhører brukeren (eller bruker er admin)
   * 3. Returner ordre med ordrelinjer
   */
  getOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/v1/webshop/ordre/${id}`)
    return response.data
  },

  /**
   * Hent ordrelinjer for en ordre
   *
   * Backend endpoint: GET /api/v1/webshop/ordre/:id/linjer
   */
  getOrderLines: async (orderId: number): Promise<OrderLine[]> => {
    const response = await apiClient.get(`/v1/webshop/ordre/${orderId}/linjer`)
    return response.data
  },

  // ==========================================================================
  // TOKEN-BASERT VISNING (Ingen autentisering påkrevd)
  // ==========================================================================

  /**
   * Hent ordre via e-post token
   *
   * Backend endpoint: GET /api/v1/webshop/ordre/token/:token
   *
   * VIKTIG: Dette endepunktet skal IKKE kreve autentisering!
   *
   * Forventet backend-logikk:
   * 1. Finn ordre basert på token
   * 2. Sjekk at token ikke er utløpt (maks 14 dager siden opprettelse)
   * 3. Returner ordre med ordrelinjer
   * 4. Returner også token-status og utløpsdato
   *
   * Forventet backend-respons:
   * {
   *   "ordre": { ordre-objekt },
   *   "ordrelinjer": [ordrelinjer],
   *   "token_utlopt": false,
   *   "token_utloper": "2026-01-24T10:00:00"
   * }
   */
  getOrderByToken: async (token: string): Promise<WebshopOrderByTokenResponse> => {
    const response = await apiClient.get(`/v1/webshop/ordre/token/${token}`)
    return response.data
  },

  // ==========================================================================
  // ADMIN GODKJENNING (Kun rolle="admin")
  // ==========================================================================

  /**
   * Hent ordrer som venter på godkjenning
   *
   * Backend endpoint: GET /api/v1/webshop/ordre/godkjenning
   *
   * Forventet backend-logikk:
   * 1. Sjekk at bruker har rolle="admin"
   * 2. Returner alle ordrer med ordrestatusid=1 (Ny)
   * 3. Støtte søk og dato-filtrering
   *
   * Forventet backend-respons:
   * {
   *   "items": [ordre-objekter med ordrestatusid=1],
   *   "total": 5,
   *   "page": 1,
   *   "page_size": 20,
   *   "total_pages": 1
   * }
   */
  getOrdersForApproval: async (params?: WebshopApprovalListParams): Promise<WebshopApprovalListResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.fra_dato) queryParams.append('fra_dato', params.fra_dato)
    if (params?.til_dato) queryParams.append('til_dato', params.til_dato)

    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/ordre/godkjenning?${queryString}` : '/v1/webshop/ordre/godkjenning'

    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Godkjenn ordre (sett ordrestatusid)
   *
   * Backend endpoint: PATCH /api/v1/webshop/ordre/:id/status
   *
   * Forventet backend-logikk:
   * 1. Sjekk at bruker har rolle="admin"
   * 2. Oppdater ordrestatusid
   * 3. Logg endringen (valgfritt)
   *
   * Status-verdier:
   * - 1 = Ny (venter på godkjenning)
   * - 2 = Under behandling
   * - 3 = Godkjent
   *
   * Request body:
   * {
   *   "ordrestatusid": 3
   * }
   */
  approveOrder: async (id: number, statusId: number): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/v1/webshop/ordre/${id}/status`, {
      ordrestatusid: statusId
    })
    return response.data
  },

  /**
   * Batch-godkjenning av flere ordrer
   *
   * Backend endpoint: POST /api/v1/webshop/ordre/godkjenning/batch
   *
   * Forventet backend-logikk:
   * 1. Sjekk at bruker har rolle="admin"
   * 2. Oppdater ordrestatusid for alle angitte ordre-IDer
   * 3. Returner antall oppdaterte ordrer
   *
   * Request body:
   * {
   *   "ordre_ids": [1, 2, 3],
   *   "ordrestatusid": 3
   * }
   *
   * Forventet backend-respons:
   * {
   *   "message": "3 ordrer godkjent",
   *   "updated_count": 3
   * }
   */
  batchApproveOrders: async (
    orderIds: number[],
    statusId: number
  ): Promise<{ message: string; updated_count: number }> => {
    const response = await apiClient.post('/v1/webshop/ordre/godkjenning/batch', {
      ordre_ids: orderIds,
      ordrestatusid: statusId
    })
    return response.data
  },

  // ==========================================================================
  // DRAFT ORDERS (Auto-save)
  // ==========================================================================

  /**
   * Get current draft order
   *
   * Backend endpoint: GET /api/v1/webshop/draft-ordre
   * Returns the draft order (status 10) with all lines, or null if none exists
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  getDraftOrder: async (kundeid?: number): Promise<DraftOrder | null> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/draft-ordre?${queryString}` : '/v1/webshop/draft-ordre'
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Create or update draft order
   *
   * Backend endpoint: PUT /api/v1/webshop/draft-ordre
   * Creates a new draft order or updates existing one with the provided lines
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  updateDraftOrder: async (ordrelinjer: DraftOrderLine[], kundeid?: number): Promise<DraftOrder> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/draft-ordre?${queryString}` : '/v1/webshop/draft-ordre'
    const response = await apiClient.put(url, {
      ordrelinjer
    })
    return response.data
  },

  /**
   * Delete draft order
   *
   * Backend endpoint: DELETE /api/v1/webshop/draft-ordre/:id
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  deleteDraftOrder: async (orderId: number, kundeid?: number): Promise<{ message: string }> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/webshop/draft-ordre/${orderId}?${queryString}` : `/v1/webshop/draft-ordre/${orderId}`
    const response = await apiClient.delete(url)
    return response.data
  },

  /**
   * Submit draft order (status 10 -> 15)
   *
   * Backend endpoint: POST /api/v1/webshop/draft-ordre/:id/submit
   * @param kundeid Optional selected customer ID (for users with multiple customers)
   */
  submitDraftOrder: async (
    orderId: number,
    leveringsdato?: string,
    informasjon?: string,
    kundeid?: number
  ): Promise<WebshopOrderCreateResponse> => {
    const queryParams = new URLSearchParams()
    if (kundeid) queryParams.append('kundeid', kundeid.toString())
    if (leveringsdato) queryParams.append('leveringsdato', leveringsdato)
    if (informasjon) queryParams.append('informasjon', informasjon)

    const queryString = queryParams.toString()
    const url = queryString
      ? `/v1/webshop/draft-ordre/${orderId}/submit?${queryString}`
      : `/v1/webshop/draft-ordre/${orderId}/submit`

    const response = await apiClient.post(url)
    return response.data
  },

  /**
   * Reopen an order for editing
   *
   * Backend endpoint: POST /api/v1/webshop/ordre/:id/reopen
   * Sets order status back to 10 (Startet) so user can add/remove items
   */
  reopenOrder: async (id: number): Promise<{ message: string; ordrestatusid: number }> => {
    const response = await apiClient.post(`/v1/webshop/ordre/${id}/reopen`)
    return response.data
  },

  /**
   * Cancel own order before approval
   *
   * Backend endpoint: POST /api/v1/webshop/ordre/:id/kanseller-min-ordre
   * Only works for orders with status 15 (Bestilt)
   */
  cancelMyOrder: async (id: number): Promise<{ message: string; ordrestatusid: number }> => {
    const response = await apiClient.post(`/v1/webshop/ordre/${id}/kanseller-min-ordre`)
    return response.data
  }
}
