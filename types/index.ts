export interface Bill {
  id: string
  bill_code: string
  organizer_id: string
  organizer_phone?: string
  organizer_access_code?: string
  organizer_recovery_code?: string
  organizer_recovery_expires_at?: string
  receipt_image_url?: string
  receipt_analyzed: boolean
  ocr_subtotal?: number
  ocr_tax_amount?: number
  ocr_tip_amount?: number
  ocr_total?: number
  tax_percent: number
  tip_percent: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  bill_id: string
  name: string
  price: number
  quantity: number
  source: 'manual' | 'ocr'
  display_order?: number
  created_at: string
  updated_at: string
}

export interface Participant {
  id: string
  bill_id: string
  user_id?: string
  name: string
  phone_number: string
  invite_sent_at?: string
  joined_at?: string
  last_updated_at?: string
  has_responded: boolean
  created_at: string
}

export interface Claim {
  id: string
  item_id: string
  participant_id: string
  share_type: 'solo' | 'split_with_specific' | 'split_with_all'
  share_with_participant_ids?: string[]
  quantity_claimed?: number
  amount_owed: number
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  contact_name: string
  contact_phone: string
  times_billed_together: number
  last_billed_together: string
  created_at: string
}

export interface OCRResult {
  success: boolean
  data: {
    items: Array<{
      name: string
      price: number
      quantity: number
    }>
    subtotal: number
    tax: number
    tip: number
    total: number
    taxPercent: number
    tipPercent: number
    date?: string
    merchant?: string
  }
}

export interface BillWithDetails extends Bill {
  participants: Participant[]
  items: Item[]
  claims: Claim[]
}
