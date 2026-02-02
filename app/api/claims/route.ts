import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { itemId, participantId, shareType, shareWithParticipantIds, quantityClaimed } = await request.json()

    if (!itemId || !participantId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normalizedQuantity = Number(quantityClaimed)
    const effectiveQuantity = Number.isFinite(normalizedQuantity) ? normalizedQuantity : 1
    const shouldUnclaim = Number.isFinite(normalizedQuantity) && normalizedQuantity <= 0

    const { data: item } = await supabaseAdmin
      .from('items')
      .select('id, quantity')
      .eq('id', itemId)
      .single()

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const itemQuantity = item.quantity || 1

    const { data: splitWithAllClaim } = await supabaseAdmin
      .from('claims')
      .select('id, participant_id')
      .eq('item_id', itemId)
      .eq('share_type', 'split_with_all')
      .maybeSingle()

    if (
      shareType !== 'split_with_all' &&
      splitWithAllClaim &&
      splitWithAllClaim.participant_id !== participantId
    ) {
      return NextResponse.json(
        { success: false, error: 'This item is already split equally by someone else.' },
        { status: 409 }
      )
    }

    // Check if claim already exists (toggle behavior)
    const { data: existingClaim } = await supabaseAdmin
      .from('claims')
      .select('*')
      .eq('item_id', itemId)
      .eq('participant_id', participantId)
      .single()

    if (existingClaim) {
      if (!shouldUnclaim && shareType !== 'split_with_all') {
        const { data: otherClaims } = await supabaseAdmin
          .from('claims')
          .select('quantity_claimed')
          .eq('item_id', itemId)
          .neq('id', existingClaim.id)

        const claimedByOthers = (otherClaims || []).reduce((sum, claim) => {
          const qty = claim.quantity_claimed ?? 1
          return sum + qty
        }, 0)

        if (effectiveQuantity > itemQuantity - claimedByOthers) {
          return NextResponse.json(
            { success: false, error: 'Not enough quantity remaining for this item.' },
            { status: 400 }
          )
        }
      }

      if (shouldUnclaim) {
        // Remove claim (unclaim)
        const { error: deleteError } = await supabaseAdmin
          .from('claims')
          .delete()
          .eq('id', existingClaim.id)

        if (deleteError) throw deleteError

        // Update participant response status
        await updateParticipantStatus(participantId)

        return NextResponse.json({
          success: true,
          action: 'unclaimed',
          claimId: existingClaim.id
        })
      }

      if (!shouldUnclaim && shareType === 'split_with_all') {
        const { data: claimsToClear } = await supabaseAdmin
          .from('claims')
          .select('id, participant_id')
          .eq('item_id', itemId)
          .neq('id', existingClaim.id)

        if (claimsToClear && claimsToClear.length > 0) {
          const idsToDelete = claimsToClear.map((claim) => claim.id)
          const participantIds = Array.from(
            new Set(claimsToClear.map((claim) => claim.participant_id))
          )

          const { error: deleteError } = await supabaseAdmin
            .from('claims')
            .delete()
            .in('id', idsToDelete)

          if (deleteError) throw deleteError

          for (const pid of participantIds) {
            await updateParticipantStatus(pid)
          }
        }
      }

      const { data: updatedClaim, error: updateError } = await supabaseAdmin
        .from('claims')
        .update({
          quantity_claimed: shareType === 'split_with_all'
            ? itemQuantity
            : effectiveQuantity || existingClaim.quantity_claimed || 1,
          share_type: shareType || existingClaim.share_type,
          share_with_participant_ids: shareType === 'split_with_all'
            ? []
            : shareWithParticipantIds || existingClaim.share_with_participant_ids || []
        })
        .eq('id', existingClaim.id)
        .select()
        .single()

      if (updateError) throw updateError

      await recalculateClaims(itemId)
      await updateParticipantStatus(participantId)

      return NextResponse.json({
        success: true,
        action: 'updated',
        data: updatedClaim
      })
    }

    // Create new claim
    if (!shouldUnclaim && shareType !== 'split_with_all') {
      const { data: existingClaimsForItem } = await supabaseAdmin
        .from('claims')
        .select('quantity_claimed')
        .eq('item_id', itemId)

      const claimedQuantity = (existingClaimsForItem || []).reduce((sum, claim) => {
        const qty = claim.quantity_claimed ?? 1
        return sum + qty
      }, 0)

      if (effectiveQuantity > itemQuantity - claimedQuantity) {
        return NextResponse.json(
          { success: false, error: 'Not enough quantity remaining for this item.' },
          { status: 400 }
        )
      }
    }

    if (!shouldUnclaim && shareType === 'split_with_all') {
      const { data: claimsToClear } = await supabaseAdmin
        .from('claims')
        .select('id, participant_id')
        .eq('item_id', itemId)

      if (claimsToClear && claimsToClear.length > 0) {
        const idsToDelete = claimsToClear.map((claim) => claim.id)
        const participantIds = Array.from(
          new Set(claimsToClear.map((claim) => claim.participant_id))
        )

        const { error: deleteError } = await supabaseAdmin
          .from('claims')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) throw deleteError

        for (const pid of participantIds) {
          await updateParticipantStatus(pid)
        }
      }
    }

    const { data: newClaim, error: insertError } = await supabaseAdmin
      .from('claims')
      .insert({
        item_id: itemId,
        participant_id: participantId,
        share_type: shareType || 'solo',
        share_with_participant_ids: shareType === 'split_with_all' ? [] : shareWithParticipantIds || [],
        quantity_claimed: shareType === 'split_with_all' ? itemQuantity : effectiveQuantity,
        amount_owed: 0 // Will be calculated
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Calculate amount owed
    await recalculateClaims(itemId)

    // Update participant response status
    await updateParticipantStatus(participantId)

    return NextResponse.json({
      success: true,
      action: 'claimed',
      data: newClaim
    })

  } catch (error: any) {
    console.error('Claim error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function recalculateClaims(itemId: string) {
  // Get item details
  const { data: item } = await supabaseAdmin
    .from('items')
    .select('*, bills!inner(*)')
    .eq('id', itemId)
    .single()

  if (!item) return

  const bill = (item as any).bills
  const { data: billItems } = await supabaseAdmin
    .from('items')
    .select('price, quantity')
    .eq('bill_id', bill.id)

  const subtotal = (billItems || []).reduce((sum, billItem) => {
    const itemPrice = parseFloat(billItem.price)
    return sum + itemPrice
  }, 0)
  const taxAmount = Number(bill.ocr_tax_amount) || 0
  const tipAmount = Number(bill.ocr_tip_amount) || 0
  const extrasTotal = taxAmount + tipAmount
  const multiplier = subtotal > 0 ? 1 + (extrasTotal / subtotal) : 1

  // Get all claims for this item
  const { data: claims } = await supabaseAdmin
    .from('claims')
    .select('*')
    .eq('item_id', itemId)

  if (!claims || claims.length === 0) return

  const itemPrice = parseFloat(item.price)
  const itemWithExtras = itemPrice * multiplier

  // Update each claim
  for (const claim of claims) {
    let amountOwed = 0

    if (claim.share_type === 'solo') {
      const claimQuantity = claim.quantity_claimed ?? 1
      const itemQuantity = item.quantity || 1
      amountOwed = itemWithExtras * (claimQuantity / itemQuantity)
    } else if (claim.share_type === 'split_with_all') {
      // Get participant count
      const { count } = await supabaseAdmin
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('bill_id', bill.id)

      amountOwed = itemWithExtras / (count || 1)
    } else if (claim.share_type === 'split_with_specific') {
      const shareCount = (claim.share_with_participant_ids?.length || 0) + 1
      amountOwed = itemWithExtras / shareCount
    }

    await supabaseAdmin
      .from('claims')
      .update({ amount_owed: Math.round(amountOwed * 100) / 100 })
      .eq('id', claim.id)
  }
}

async function updateParticipantStatus(participantId: string) {
  // Check if participant has any claims
  const { count } = await supabaseAdmin
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('participant_id', participantId)

  await supabaseAdmin
    .from('participants')
    .update({
      has_responded: (count || 0) > 0,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', participantId)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: 'Participant ID required' },
        { status: 400 }
      )
    }

    const { data: claims, error } = await supabaseAdmin
      .from('claims')
      .select('*, items(*)')
      .eq('participant_id', participantId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: claims
    })

  } catch (error: any) {
    console.error('Get claims error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
