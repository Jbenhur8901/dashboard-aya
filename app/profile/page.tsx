'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile } from '@/hooks/use-user-profile'
import { Shield, Mail, User, Briefcase, Building, Phone } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useUserProfile()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="title-display">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles
        </p>
      </div>

      {/* Profile Overview */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
          <CardDescription>
            Vos informations d'identification sur la plateforme LE DASH
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Badge */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-muted-foreground">Rôle</Label>
              <div className="mt-2">
                {profile?.role === 'superadmin' && (
                  <Badge variant="destructive" className="text-sm">
                    <Shield className="mr-1 h-4 w-4" />
                    Super Admin
                  </Badge>
                )}
                {profile?.role === 'admin' && (
                  <Badge variant="default" className="text-sm">
                    <Shield className="mr-1 h-4 w-4" />
                    Admin
                  </Badge>
                )}
                {profile?.role === 'user' && (
                  <Badge variant="secondary" className="text-sm">
                    <User className="mr-1 h-4 w-4" />
                    Utilisateur
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-muted-foreground">Statut</Label>
              <div className="mt-2">
                {profile?.approved && !profile?.disabled ? (
                  <Badge variant="default" className="text-sm">Actif</Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm">Inactif</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 mr-2" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">
                <User className="inline h-4 w-4 mr-2" />
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                value={profile?.username || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullname">Nom complet</Label>
              <Input
                id="fullname"
                value={profile?.full_name || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname">Prénom</Label>
              <Input
                id="lastname"
                value={profile?.last_name || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fonction">
                <Briefcase className="inline h-4 w-4 mr-2" />
                Fonction
              </Label>
              <Input
                id="fonction"
                value={profile?.fonction || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departement">
                <Building className="inline h-4 w-4 mr-2" />
                Département
              </Label>
              <Input
                id="departement"
                value={profile?.departement || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="inline h-4 w-4 mr-2" />
                Téléphone
              </Label>
              <Input
                id="phone"
                value={profile?.phone || 'N/A'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date de création</p>
              <p className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Dernière modification</p>
              <p className="font-medium">
                {profile?.updated_at
                  ? new Date(profile.updated_at).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Pour modifier vos informations personnelles, veuillez contacter un administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
