import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin, generateBillCode } from '@/lib/supabase'
import type { Bill, Item, Participant } from '@/types'
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/twilio'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      items, 
      participants, 
      taxAmount,
      tipAmount,
      receiptImageUrl,
      ocrData,
      organizerPhone
    } = body

    // Generate unique bill code
    const billCode = generateBillCode()
    const organizerAccessCode = randomBytes(8).toString('hex').toUpperCase()
    const parsedTaxAmount = Number(taxAmount ?? ocrData?.tax ?? 0)
    const parsedTipAmount = Number(tipAmount ?? ocrData?.tip ?? 0)
    const safeTaxAmount = Number.isFinite(parsedTaxAmount) ? parsedTaxAmount : 0
    const safeTipAmount = Number.isFinite(parsedTipAmount) ? parsedTipAmount : 0
    const normalizedOrganizerPhone = organizerPhone
      ? formatPhoneNumber(String(organizerPhone))
      : ''

    if (!normalizedOrganizerPhone || !validatePhoneNumber(normalizedOrganizerPhone)) {
      return NextResponse.json(
        { success: false, error: 'Organizer phone number is required for recovery.' },
        { status: 400 }
      )
    }

    // Create bill
    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .insert({
        bill_code: billCode,
        tax_percent: 0,
        tip_percent: 0,
        receipt_image_url: receiptImageUrl,
        receipt_analyzed: !!ocrData,
        ocr_subtotal: ocrData?.subtotal,
        ocr_tax_amount: safeTaxAmount,
        ocr_tip_amount: safeTipAmount,
        ocr_total: ocrData?.total,
        organizer_phone: normalizedOrganizerPhone,
        organizer_access_code: organizerAccessCode,
        status: 'active'
      })
      .select()
      .single()

    if (billError) throw billError

    // Create items
    const itemsToInsert = items.map((item: any, index: number) => ({
      bill_id: bill.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      source: ocrData ? 'ocr' : 'manual',
      display_order: index
    }))

    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .insert(itemsToInsert)
      .select()

    if (itemsError) throw itemsError

    // Create participants
    const participantsToInsert = participants.map((p: any, index: number) => ({
      bill_id: bill.id,
      name: p.name,
      phone_number: p.phone || `UNSET-${billCode}-${index + 1}`,
      plus_one_count: p.plusOneCount || 0,
      has_responded: false
    }))

    const { data: createdParticipants, error: participantsError } = await supabaseAdmin
      .from('participants')
      .insert(participantsToInsert)
      .select()

    if (participantsError) throw participantsError

    // Save contacts for autocomplete (if organizer_id exists)
    if (bill.organizer_id) {
      const contactsToInsert = participants
        .filter((p: any) => p.phone)
        .map((p: any) => ({
          user_id: bill.organizer_id,
          contact_name: p.name,
          contact_phone: p.phone
        }))

      if (contactsToInsert.length) {
        await supabaseAdmin
          .from('contacts')
          .upsert(contactsToInsert, {
            onConflict: 'user_id,contact_phone',
            ignoreDuplicates: false
          })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bill,
        items: createdItems,
        participants: createdParticipants,
        organizerAccessCode
      }
    })

  } catch (error: any) {
    console.error('Create bill error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const billId = searchParams.get('id')
    const billCode = searchParams.get('code')
    const organizerCode = searchParams.get('organizerCode')

    if (!billId && !billCode && !organizerCode) {
      return NextResponse.json(
        { success: false, error: 'Bill ID, code, or organizer code required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from('bills')
      .select(`
        *,
        items (*),
        participants (*)
      `)

    if (billId) {
      query = query.eq('id', billId)
    } else if (billCode) {
      query = query.eq('bill_code', billCode)
    } else if (organizerCode) {
      query = query.eq('organizer_access_code', organizerCode)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      )
    }

    const itemIds = (data.items || []).map((item: any) => item.id)
    const { data: claims, error: claimsError } = itemIds.length
      ? await supabaseAdmin
          .from('claims')
          .select('*')
          .in('item_id', itemIds)
      : { data: [], error: null }

    if (claimsError) throw claimsError

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        claims: claims || []
      }
    })

  } catch (error: any) {
    console.error('Get bill error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
