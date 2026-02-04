'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Zap, Loader2 } from 'lucide-react'

export default function MfaVerifyPage() {
  const [verifyCode, setVerifyCode] = useState('')
  const [factorId, setFactorId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkMfaFactors()
  }, [])

  const checkMfaFactors = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error) throw error

      // Find verified TOTP factor
      const totpFactor = data.totp.find(factor => factor.status === 'verified')

      if (!totpFactor) {
        // No MFA configured, redirect to setup
        router.push('/mfa/setup')
        return
      }

      setFactorId(totpFactor.id)
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les facteurs MFA',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyMfa = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: 'Code invalide',
        description: 'Veuillez entrer un code a 6 chiffres',
        variant: 'destructive',
      })
      return
    }

    setIsVerifying(true)
    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError) throw challengeError

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      })

      if (verifyError) throw verifyError

      // Mark MFA verified for user
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        await supabase
          .from('users')
          .update({
            mfa_enabled: true,
            mfa_verified_at: new Date().toISOString(),
          })
          .eq('id', userData.user.id)
      }

      toast({
        title: 'Verification reussie',
        description: 'Bienvenue sur LE DASH',
      })

      router.push('/')
    } catch (error: any) {
      toast({
        title: 'Erreur de verification',
        description: error.message || 'Code incorrect. Veuillez reessayer.',
        variant: 'destructive',
      })
      setVerifyCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verifyCode.length === 6) {
      verifyMfa()
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
            Vérification MFA
          </CardTitle>
          <CardDescription className="text-center">
            Entrez le code de votre application d&apos;authentification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code à 6 chiffres</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={handleKeyPress}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  disabled={isVerifying}
                  autoFocus
                />
              </div>
              <Button
                onClick={verifyMfa}
                className="w-full"
                disabled={isVerifying || verifyCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Ouvrez votre application d&apos;authentification et entrez le code affiché pour LE DASH
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
