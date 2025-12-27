'use client'

import Link from 'next/link'
import { Bell, Moon, Sun, User, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const { data: profile } = useUserProfile()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt!',
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

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex-1">
        <h2 className="text-lg font-semibold">Tableau de bord</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Profile">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || 'Mon Compte'}
                  </p>
                  {isSuperAdmin && (
                    <Badge variant="destructive" className="ml-2">
                      <Shield className="mr-1 h-3 w-3" />
                      Super Admin
                    </Badge>
                  )}
                  {isAdmin && !isSuperAdmin && (
                    <Badge variant="default" className="ml-2">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
                {user?.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                )}
                {profile?.fonction && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile.fonction}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
