import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

type TableName = 'souscriptions' | 'transactions'

export function useBulkDelete(table: TableName) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: [table] })
      toast({
        title: 'Suppression réussie',
        description: `${ids.length} élément(s) supprimé(s) avec succès`,
      })
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les éléments',
        variant: 'destructive',
      })
    },
  })
}
