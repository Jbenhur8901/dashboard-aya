'use client'

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './use-auth'

interface AuditLogEntry {
  action: string
  table_name?: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
}

export function useAuditLog() {
  const { user } = useAuth()

  const logMutation = useMutation({
    mutationFn: async (entry: AuditLogEntry) => {
      // Note: This requires the audit_logs table to exist in the database
      // The actual logging will be done via RLS policies or database triggers
      // This hook is a client-side helper for manual logging
      const { error } = await supabase.from('audit_logs').insert([
        {
          user_id: user?.id,
          action: entry.action,
          table_name: entry.table_name,
          record_id: entry.record_id,
          old_values: entry.old_values,
          new_values: entry.new_values,
          metadata: entry.metadata,
        },
      ])

      if (error) {
        // Silently fail - audit logging should not break the app
        console.error('Audit log error:', error)
      }
    },
  })

  const log = (entry: AuditLogEntry) => {
    logMutation.mutate(entry)
  }

  return { log, isLogging: logMutation.isPending }
}

// Predefined audit actions
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_MFA_SETUP: 'user.mfa_setup',
  USER_MFA_VERIFY: 'user.mfa_verify',

  // Souscription actions
  SOUSCRIPTION_CREATE: 'souscription.create',
  SOUSCRIPTION_UPDATE: 'souscription.update',
  SOUSCRIPTION_DELETE: 'souscription.delete',
  SOUSCRIPTION_STATUS_CHANGE: 'souscription.status_change',

  // Transaction actions
  TRANSACTION_CREATE: 'transaction.create',
  TRANSACTION_UPDATE: 'transaction.update',
  TRANSACTION_DELETE: 'transaction.delete',
  TRANSACTION_PAY: 'transaction.pay',

  // Code agent actions
  CODE_AGENT_CREATE: 'code_agent.create',
  CODE_AGENT_UPDATE: 'code_agent.update',
  CODE_AGENT_DELETE: 'code_agent.delete',

  // Admin actions
  ADMIN_USER_APPROVE: 'admin.user_approve',
  ADMIN_USER_DISABLE: 'admin.user_disable',
  ADMIN_USER_MFA_RESET: 'admin.user_mfa_reset',
  ADMIN_USER_ROLE_UPDATE: 'admin.user_role_update',
  ADMIN_IP_WHITELIST_ADD: 'admin.ip_whitelist_add',
  ADMIN_IP_WHITELIST_REMOVE: 'admin.ip_whitelist_remove',
}
