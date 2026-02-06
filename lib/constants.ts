import { ProductType, SouscriptionStatus, PaymentMethod } from '@/types/database.types'

// Product Type Mappings
export const PRODUCT_COLORS: Record<ProductType, string> = {
  'NSIA AUTO': '#10B981',
  'NSIA VOYAGE': '#3B82F6',
  'NSIA MULTIRISQUE HABITATION': '#8B5CF6',
  'NSIA INDIVIDUEL ACCIDENTS': '#F59E0B',
}

export const PRODUCT_LABELS: Record<ProductType, string> = {
  'NSIA AUTO': 'Auto',
  'NSIA VOYAGE': 'Voyage',
  'NSIA MULTIRISQUE HABITATION': 'MRH',
  'NSIA INDIVIDUEL ACCIDENTS': 'IAC',
}

export const PRODUCT_FULL_LABELS: Record<ProductType, string> = {
  'NSIA AUTO': 'Assurance Automobile',
  'NSIA VOYAGE': 'Assurance Voyage',
  'NSIA MULTIRISQUE HABITATION': 'Multirisque Habitation',
  'NSIA INDIVIDUEL ACCIDENTS': 'Individuelle Accidents',
}

// Status Mappings
export const STATUS_VARIANTS: Record<SouscriptionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  en_cours: 'default',
  valide: 'success',
  expirée: 'secondary',
  annulée: 'destructive',
  en_attente: 'warning',
}

export const STATUS_LABELS: Record<SouscriptionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expirée: 'Expirée',
  annulée: 'Annulée',
  en_attente: 'En attente',
}

// Payment Method Mappings
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOBILE_MONEY: 'MTN Mobile Money',
  AIRTEL_MOBILE_MONEY: 'Airtel Money',
  PAY_ON_DELIVERY: 'Paiement à la livraison',
  PAY_ON_AGENCY: 'Paiement en agence',
}

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  MTN_MOBILE_MONEY: '📱',
  AIRTEL_MOBILE_MONEY: '📱',
  PAY_ON_DELIVERY: '🚚',
  PAY_ON_AGENCY: '🏢',
}
