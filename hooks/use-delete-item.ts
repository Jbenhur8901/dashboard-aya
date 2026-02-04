import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuditLog, AUDIT_ACTIONS } from '@/hooks/use-audit-log'

type TableName = 'souscriptions' | 'transactions'

export function useDeleteItem(table: TableName) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { log } = useAuditLog()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [table] })
      log({
        action:
          table === 'souscriptions'
            ? AUDIT_ACTIONS.SOUSCRIPTION_DELETE
            : AUDIT_ACTIONS.TRANSACTION_DELETE,
        table_name: table,
        record_id: id,
      })
      toast({
        title: 'Suppression réussie',
        description: 'L\'élément a été supprimé avec succès',
      })
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'élément',
        variant: 'destructive',
      })
    },
  })
}
