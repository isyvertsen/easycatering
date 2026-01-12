import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyToBackend(request, proxy, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyToBackend(request, proxy, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyToBackend(request, proxy, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyToBackend(request, proxy, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyToBackend(request, proxy, 'PATCH')
}

async function proxyToBackend(
  request: NextRequest,
  proxyPath: string[],
  method: string
) {
  try {
    // Construct backend URL
    const path = proxyPath.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`

    // Get request body for POST/PUT/PATCH
    let body: string | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      body = await request.text()
    }

    // Forward headers (excluding host, connection, etc.)
    const headers = new Headers()
    const forwardHeaders = ['authorization', 'content-type', 'accept']
    forwardHeaders.forEach(header => {
      const value = request.headers.get(header)
      if (value) {
        headers.set(header, value)
      }
    })

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    })

    // Get response body
    const responseBody = await response.text()

    // Forward response with same status and headers
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 500 }
    )
  }
}
