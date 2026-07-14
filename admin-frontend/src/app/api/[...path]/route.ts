import { NextRequest } from 'next/server'

const HOP_BY_HOP_HEADERS = [
  'connection',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

const API_BASE_URL = (
  process.env.DJANGO_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  const target = `${API_BASE_URL}/${path}/${request.nextUrl.search}`
  const headers = new Headers(request.headers)

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header)
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  })

  const responseHeaders = new Headers(response.headers)
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
