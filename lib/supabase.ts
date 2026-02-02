import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Helper functions
export async function uploadReceipt(file: File, billId: string) {
  const fileName = `${billId}-${Date.now()}.${file.name.split('.').pop()}`
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file)

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

export function generateBillCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
