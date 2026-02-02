import { NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPhoneNumber, sendOrganizerRecoveryCode, validatePhoneNumber } from '@/lib/twilio'

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    const { billCode, organizerPhone } = await request.json()
    const normalizedBillCode = String(billCode || '').trim().toUpperCase()
    const normalizedPhone = organizerPhone
      ? formatPhoneNumber(String(organizerPhone))
      : ''

    if (!normalizedBillCode || !normalizedPhone || !validatePhoneNumber(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Valid bill code and phone are required.' },
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

    const recoveryCode = String(randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('bills')
      .update({
        organizer_recovery_code: recoveryCode,
        organizer_recovery_expires_at: expiresAt
      })
      .eq('id', bill.id)

    if (updateError) throw updateError

    const smsResult = await sendOrganizerRecoveryCode(
      normalizedPhone,
      normalizedBillCode,
      recoveryCode
    )

    if (!smsResult.success) {
      return NextResponse.json(
        { success: false, error: smsResult.error || 'Failed to send recovery SMS.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Organizer recovery request error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
