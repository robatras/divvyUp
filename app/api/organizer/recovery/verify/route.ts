import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/twilio'

export async function POST(request: Request) {
  try {
    const { billCode, organizerPhone, recoveryCode } = await request.json()
    const normalizedBillCode = String(billCode || '').trim().toUpperCase()
    const normalizedPhone = organizerPhone
      ? formatPhoneNumber(String(organizerPhone))
      : ''
    const normalizedRecoveryCode = String(recoveryCode || '').trim()

    if (!normalizedBillCode || !normalizedPhone || !validatePhoneNumber(normalizedPhone) || !normalizedRecoveryCode) {
      return NextResponse.json(
        { success: false, error: 'Bill code, phone, and recovery code are required.' },
        { status: 400 }
      )
    }

    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .select('*')
      .eq('bill_code', normalizedBillCode)
      .single()

    if (billError || !bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found.' },
        { status: 404 }
      )
    }

    if (!bill.organizer_phone || bill.organizer_phone !== normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number does not match organizer.' },
        { status: 403 }
      )
    }

    if (!bill.organizer_recovery_code || bill.organizer_recovery_code !== normalizedRecoveryCode) {
      return NextResponse.json(
        { success: false, error: 'Recovery code is invalid.' },
        { status: 400 }
      )
    }

    if (bill.organizer_recovery_expires_at) {
      const expiresAt = new Date(bill.organizer_recovery_expires_at).getTime()
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        return NextResponse.json(
          { success: false, error: 'Recovery code has expired.' },
          { status: 400 }
        )
      }
    }

    const organizerAccessCode = bill.organizer_access_code || randomBytes(8).toString('hex').toUpperCase()

    const { error: clearError } = await supabaseAdmin
      .from('bills')
      .update({
        organizer_recovery_code: null,
        organizer_recovery_expires_at: null,
        organizer_access_code: organizerAccessCode
      })
      .eq('id', bill.id)

    if (clearError) throw clearError

    return NextResponse.json({
      success: true,
      data: {
        organizerAccessCode
      }
    })
  } catch (error: any) {
    console.error('Organizer recovery verify error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
