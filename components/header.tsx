'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, User, LogOut, Shield, Search, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'

export function Header() {
  const { user, signOut } = useAuth()
  const { data: profile } = useUserProfile()
  const { toast } = useToast()
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()
  const audioContextRef = useRef<AudioContext | null>(null)
  const previousNotificationIdRef = useRef<string | null>(null)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt !',
      })
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de se déconnecter',
        variant: 'destructive',
      })
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isSuperAdmin = profile?.role === 'superadmin'

  const toneIcon: Record<'success' | 'warning' | 'info', any> = {
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
  }

  const formatNotificationTime = (isoDate: string) => {
    const created = new Date(isoDate).getTime()
    const now = Date.now()
    const diffMin = Math.max(1, Math.floor((now - created) / 60000))
    if (diffMin < 60) return `il y a ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `il y a ${diffHours} h`
    const diffDays = Math.floor(diffHours / 24)
    return `il y a ${diffDays} j`
  }

  const ensureAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      audioContextRef.current = new Ctx()
    }
    return audioContextRef.current
  }, [])

  useEffect(() => {
    const unlock = async () => {
      const context = ensureAudioContext()
      if (!context) return
      if (context.state !== 'running') {
        try {
          await context.resume()
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [ensureAudioContext])

  const playNotificationAlarm = useCallback(() => {
    const context = ensureAudioContext()
    if (!context || context.state !== 'running') return

    const now = context.currentTime
    const beep = (start: number, frequency: number) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(frequency, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.45, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.23)
    }

    beep(now, 1040)
    beep(now + 0.2, 820)
  }, [ensureAudioContext])

  useEffect(() => {
    const latestId = notifications[0]?.id || null
    if (!latestId) return

    if (previousNotificationIdRef.current === null) {
      previousNotificationIdRef.current = latestId
      return
    }

    if (previousNotificationIdRef.current !== latestId) {
      playNotificationAlarm()
      previousNotificationIdRef.current = latestId
    }
  }, [notifications, playNotificationAlarm])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/70 backdrop-blur px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && markAllAsRead()}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                >
                  Tout marquer comme lu
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto border-t">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Aucune notification</div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors',
                      !item.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsRead(item.id)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border',
                        item.tone === 'success' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                        item.tone === 'warning' && 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                        item.tone === 'info' && 'bg-sky-500/10 text-sky-700 border-sky-500/20'
                      )}
                    >
                      {(() => {
                        const Icon = toneIcon[item.tone]
                        return <Icon className="h-4 w-4" />
                      })()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatNotificationTime(item.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <span>{notifications.length} notification(s)</span>
              <Link href="/notifications" className="font-medium text-foreground hover:underline">
                Ouvrir
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 h-10 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name?.split(' ')[0] || 'Compte'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {profile?.full_name || 'Mon Compte'}
                    </p>
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600">
                        <Shield className="h-2.5 w-2.5" />
                        Super
                      </span>
                    )}
                    {isAdmin && !isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-700">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Mon Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
