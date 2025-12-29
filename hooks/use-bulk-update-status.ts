import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

type TableName = 'souscriptions' | 'transactions'

interface BulkUpdateStatusParams {
  ids: string[]
  status: string
}

export function useBulkUpdateStatus(table: TableName) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ ids, status }: BulkUpdateStatusParams) => {
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [table] })
      toast({
        title: 'Statut mis à jour',
        description: `${variables.ids.length} élément(s) modifié(s) avec succès`,
      })
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      })
    },
  })
}
