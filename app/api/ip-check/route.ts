import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  if (process.env.IP_WHITELIST_ENFORCE !== 'true') {
    return NextResponse.json({ allowed: true })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ allowed: false })
  }

  const ipHeader = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = ipHeader.split(',')[0].trim()

  if (!ip) {
    return NextResponse.json({ allowed: false })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.rpc('is_ip_allowed', { ip })

  if (error) {
    return NextResponse.json({ allowed: false })
  }

  return NextResponse.json({ allowed: !!data })
}
