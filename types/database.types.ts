// Enums from database
export type ProductType =
  | 'NSIA INDIVIDUEL ACCIDENTS'
  | 'NSIA AUTO'
  | 'NSIA VOYAGE'
  | 'NSIA MULTIRISQUE HABITATION'

export type SouscriptionStatus =
  | 'en_cours'
  | 'valide'
  | 'expiree'
  | 'annulee'
  | 'en_attente'

export type PaymentMethod =
  | 'MTN_MOBILE_MONEY'
  | 'AIRTEL_MOBILE_MONEY'
  | 'PAY_ON_DELIVERY'
  | 'PAY_ON_AGENCY'

export type UserRole =
  | 'user'
  | 'admin'
  | 'admin_fin'
  | 'superadmin'

export type TransactionStatus =
  | 'en_cours'
  | 'valide'
  | 'expiree'
  | 'annulee'
  | 'en_attente'

export type ReductionType = 'pourcentage' | 'montant_fixe'

export interface Client {
  id: string
  whatsappnumber: string | null
  fullname: string | null
  dateofbirth: string | null
  address: string | null
  city: string | null
  profession: string | null
  status: string | null
  username: string | null
  created_at: string
  updated_at: string | null
}

export interface Souscription {
  id: string
  client_id: string | null
  producttype: string | null
  prime_ttc: number | null
  status: string | null
  codepromo: string | null
  source: string | null
  coverage_duration: string | null
  created_at: string
  updated_at: string | null

  // Relations
  client?: Client
  souscription_auto?: SouscriptionAuto
  souscription_voyage?: SouscriptionVoyage
  souscription_mrh?: SouscriptionMrh
  souscription_iac?: SouscriptionIac
}

export interface SouscriptionAuto {
  id: string
  souscription_id: string | null
  fullname: string | null
  immatriculation: string | null
  power: string | null
  seat_number: number | null
  fuel_type: string | null
  brand: string | null
  chassis_number: string | null
  phone: string | null
  model: string | null
  address: string | null
  profession: string | null
  prime_ttc: number | null
  coverage: string | null
  quotation: any
  documenturl: string | null
  created_at: string
  updated_at: string | null
}

export interface SouscriptionVoyage {
  id: string
  souscription_id: string | null
  full_name: string | null
  passport_number: string | null
  nationality: string | null
  date_of_birth: string | null
  place_of_birth: string | null
  sex: string | null
  profession: string | null
  issue_date: string | null
  expiry_date: string | null
  place_of_issue: string | null
  country_code: string | null
  type: string | null
  prime_ttc: string | null
  coverage: string | null
  documenturl: string | null
  status: string | null
  created_at: string
  updated_at: string | null
}

export interface SouscriptionMrh {
  id: string
  souscription_id: string | null
  fullname: string | null
  forfaitmrh: string | null
  typedocument: string | null
  documenturl: string | null
  status: string | null
  extracted_infos: any
  coverage: string | null
  created_at: string
  updated_at: string | null
}

export interface SouscriptionIac {
  id: string
  souscription_id: string | null
  fullname: string | null
  prime_ttc: string | null
  typedocument: string | null
  documenturl: string | null
  status: string | null
  extracted_infos: any
  coverage: string | null
  statutpro: string | null
  secteuractivite: string | null
  lieutravail: string | null
  created_at: string
  updated_at: string | null
}

export interface Transaction {
  id: string
  souscription_id: string | null
  reference: string | null
  amount: number | null
  payment_method: string | null
  status: string | null
  created_at: string
  updated_at: string | null

  // Relations
  souscription?: Souscription
}

export interface CodePromo {
  id: number
  code: string
  agent: string | null
  type_reduction: string | null
  valeur: number | null
  expiration: string | null
  actif: boolean | null
  updated_at: string | null
  created_at: string
}

export interface Document {
  id: string
  souscription_id: string | null
  document_url: string
  pdf_url: string | null
  type: string | null
  nom: string | null
  created_at: string | null
  updated_at: string | null

  // Relations
  souscription?: Souscription
}

// Types pour les stats du dashboard
export interface DashboardStats {
  total_souscriptions: number
  revenus_mois: number
  transactions_pending: number
  nouveaux_clients: number
}

export interface SouscriptionParType {
  producttype: ProductType
  count: number
}

export interface RevenuParMois {
  mois: string
  revenus: number
}
