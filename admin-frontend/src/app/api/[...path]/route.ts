import { NextRequest } from 'next/server'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const target = `${API_BASE_URL}/${path}/${request.nextUrl.search}`
  const headers = new Headers(request.headers)

  headers.delete('host')

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
