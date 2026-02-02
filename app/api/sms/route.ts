import { NextResponse } from 'next/server'
import { sendBillInvite } from '@/lib/twilio'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { billId, billCode, organizerName, participants } = await request.json()

    if (!billCode || !participants || participants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const results = []

    // Send SMS to each participant
    for (const participant of participants) {
      const result = await sendBillInvite(
        participant.phone_number,
        billCode,
        organizerName || 'Someone'
      )

      results.push({
        participant_id: participant.id,
        phone: participant.phone_number,
        ...result
      })

      // Log SMS in database
      if (result.success) {
        await supabaseAdmin.from('sms_logs').insert({
          bill_id: billId,
          participant_id: participant.id,
          phone_number: participant.phone_number,
          message_body: `Bill invite from ${organizerName}`,
          status: 'sent',
          twilio_sid: result.sid
        })

        // Update participant invite_sent_at
        await supabaseAdmin
          .from('participants')
          .update({ invite_sent_at: new Date().toISOString() })
          .eq('id', participant.id)
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      data: {
        sent: successCount,
        failed: results.length - successCount,
        results
      }
    })

  } catch (error: any) {
    console.error('SMS error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
