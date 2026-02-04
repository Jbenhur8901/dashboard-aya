import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuditLog, AUDIT_ACTIONS } from '@/hooks/use-audit-log'

type TableName = 'souscriptions' | 'transactions'

export function useBulkDelete(table: TableName) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { log } = useAuditLog()

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
      log({
        action:
          table === 'souscriptions'
            ? AUDIT_ACTIONS.SOUSCRIPTION_DELETE
            : AUDIT_ACTIONS.TRANSACTION_DELETE,
        table_name: table,
        metadata: { ids, bulk: true },
      })
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
