import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuditLog, AUDIT_ACTIONS } from '@/hooks/use-audit-log'

type TableName = 'souscriptions' | 'transactions'

interface BulkUpdateStatusParams {
  ids: string[]
  status: string
}

export function useBulkUpdateStatus(table: TableName) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { log } = useAuditLog()

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
      log({
        action:
          table === 'souscriptions'
            ? AUDIT_ACTIONS.SOUSCRIPTION_STATUS_CHANGE
            : AUDIT_ACTIONS.TRANSACTION_UPDATE,
        table_name: table,
        metadata: { ids: variables.ids, status: variables.status, bulk: true },
      })
      toast({
        title: 'Statut mis à jour',
        description: `${variables.ids.length} élément(s) modifié(s) avec succès`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      })
    },
  })
}
