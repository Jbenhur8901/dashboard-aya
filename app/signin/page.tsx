'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Zap } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password.length < 6) {
      toast({
        title: 'Mot de passe trop court',
        description: 'Le mot de passe doit contenir au moins 6 caracteres',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Mots de passe differents',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    try {
      await signUp(email, password, {
        full_name: fullName,
      })
      toast({
        title: 'Compte cree avec succes',
        description: 'Bienvenue sur LE DASH',
      })
    } catch (error: any) {
      let errorMessage = 'Impossible de creer le compte'

      if (error.message?.includes('already registered')) {
        errorMessage = 'Cette adresse email est deja utilisee'
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: 'Erreur d\'inscription',
        description: errorMessage,
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background app-bg p-4">
      <Card className="w-full max-w-md surface">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Zap className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center font-display">
            Rejoignez LE DASH
          </CardTitle>
          <CardDescription className="text-center">
            Créez votre compte pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer un compte'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
