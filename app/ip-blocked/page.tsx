'use client'

import { Shield } from 'lucide-react'

export default function IpBlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background app-bg p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Shield className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-muted-foreground">
          Cette adresse IP n&apos;est pas autorisée à accéder à LE DASH.
        </p>
      </div>
    </div>
  )
}
