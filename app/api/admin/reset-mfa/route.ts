import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing service role config' }, { status: 500 })
  }

  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    const { data: factors, error: listError } = await supabase.auth.admin.mfa.listFactors({ userId })
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const deletions = await Promise.all(
      (factors?.factors || []).map((factor: { id: string }) =>
        supabase.auth.admin.mfa.deleteFactor({ userId, id: factor.id })
      )
    )

    const failed = deletions.find((r: { error: { message?: string } | null }) => r.error)
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
