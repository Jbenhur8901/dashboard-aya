'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { addNotification } from '@/hooks/use-notifications'

export function SouscriptionToastListener() {
  const { toast } = useToast()

  useEffect(() => {
    const channel = supabase
      .channel('souscriptions-insert-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'souscriptions' },
        (payload) => {
          const productType = payload.new?.producttype || 'Produit inconnu'
          addNotification({
            title: 'Nouvelle souscription',
            description: `Produit: ${productType}`,
            createdAt: new Date().toISOString(),
            tone: 'success',
          })
          toast({
            title: 'Nouvelle souscription',
            description: `Produit: ${productType}`,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [toast])

  return null
}
