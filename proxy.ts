import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isBypass =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/ip-check') ||
    pathname.startsWith('/ip-blocked') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'

  if (isBypass) {
    return NextResponse.next()
  }

  if (process.env.IP_WHITELIST_ENFORCE !== 'true') {
    return NextResponse.next()
  }

  try {
    const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const ip = ipHeader.split(',')[0].trim()

    if (!ip) {
      return NextResponse.rewrite(new URL('/ip-blocked', req.url))
    }

    const checkUrl = new URL('/api/ip-check', req.url)
    const res = await fetch(checkUrl.toString(), {
      headers: {
        'x-forwarded-for': ip,
      },
    })

    if (!res.ok) {
      return NextResponse.rewrite(new URL('/ip-blocked', req.url))
    }

    const data = await res.json()
    if (!data.allowed) {
      return NextResponse.rewrite(new URL('/ip-blocked', req.url))
    }
  } catch {
    return NextResponse.rewrite(new URL('/ip-blocked', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
