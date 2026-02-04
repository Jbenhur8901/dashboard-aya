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

export default function MfaSetupPage() {
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [verifyCode, setVerifyCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    enrollMfa()
  }, [])

  const enrollMfa = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'LE DASH Authenticator',
      })

      if (error) throw error

      if (data) {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de configurer MFA',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndEnableMfa = async () => {
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

      // Mark MFA as enabled for user
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
        title: 'MFA active',
        description: 'L\'authentification a deux facteurs est maintenant activee',
      })

      router.push('/')
    } catch (error: any) {
      toast({
        title: 'Erreur de verification',
        description: error.message || 'Code incorrect. Veuillez reessayer.',
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
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
            Configuration MFA
          </CardTitle>
          <CardDescription className="text-center">
            L&apos;authentification à deux facteurs est obligatoire pour sécuriser votre compte LE DASH
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Génération du QR code...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    1. Scannez ce QR code avec votre application d&apos;authentification
                    (Google Authenticator, Authy, etc.)
                  </p>
                  {qrCode && (
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="QR Code MFA"
                        className="w-48 h-48 border rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>

                {secret && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Ou entrez cette clé manuellement :
                    </p>
                    <code className="text-sm font-mono break-all">{secret}</code>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  2. Entrez le code à 6 chiffres affiché dans votre application
                </p>
                <div className="space-y-2">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                    disabled={isVerifying}
                  />
                </div>
                <Button
                  onClick={verifyAndEnableMfa}
                  className="w-full"
                  disabled={isVerifying || verifyCode.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    'Activer MFA'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
