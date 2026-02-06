'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

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
