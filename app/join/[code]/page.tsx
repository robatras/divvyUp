'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { BillWithDetails } from '@/types'
import {
  calculateSplits,
  formatCurrency,
  getItemClaimers,
  getItemizedShares,
  getUnclaimedItems
} from '@/lib/utils'

export default function JoinBillPage() {
  const params = useParams()
  const codeParam = Array.isArray(params?.code) ? params.code[0] : params?.code
  const code = (codeParam || '').toString().toUpperCase()

  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedParticipantId, setSelectedParticipantId] = useState('')
  const [busyItemIds, setBusyItemIds] = useState<Record<string, boolean>>({})
  const [claimQuantities, setClaimQuantities] = useState<Record<string, number>>({})
  const [claimShareTypes, setClaimShareTypes] = useState<Record<string, 'solo' | 'split_with_specific' | 'split_with_all'>>({})
  const [claimShareWith, setClaimShareWith] = useState<Record<string, string[]>>({})
  const [showMyItems, setShowMyItems] = useState(false)

  const fetchBill = useCallback(async (silent = false) => {
    if (!code) return
    if (!silent) setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/bills?code=${encodeURIComponent(code)}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load bill')
      }

      setBill(result.data)
      if (result.data?.participants?.length) {
        setSelectedParticipantId((prev) => prev || result.data.participants[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bill')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [code])

  useEffect(() => {
    fetchBill(false)
  }, [fetchBill])

  useEffect(() => {
    if (!bill || !selectedParticipantId) return
    const nextShareTypes: Record<string, 'solo' | 'split_with_specific' | 'split_with_all'> = {}
    const nextShareWith: Record<string, string[]> = {}

    bill.items.forEach((item) => {
      const existingClaim = bill.claims.find(
        (claim) => claim.item_id === item.id && claim.participant_id === selectedParticipantId
      )
      nextShareTypes[item.id] = existingClaim?.share_type || 'solo'
      nextShareWith[item.id] = existingClaim?.share_with_participant_ids || []
    })

    setClaimShareTypes(nextShareTypes)
    setClaimShareWith(nextShareWith)
  }, [bill, selectedParticipantId])

  const selectedParticipant = bill?.participants.find(
    (participant) => participant.id === selectedParticipantId
  )

  const splits = useMemo(() => {
    if (!bill) return {}
    return calculateSplits(
      bill.items,
      bill.participants,
      bill.claims,
      bill.ocr_tax_amount || 0,
      bill.ocr_tip_amount || 0
    )
  }, [bill])

  const itemizedShares = useMemo(() => {
    if (!bill) return {}
    return getItemizedShares(bill.items, bill.participants, bill.claims)
  }, [bill])

  const billSubtotal = useMemo(() => {
    if (!bill) return 0
    return bill.items.reduce((sum, item) => sum + Number(item.price || 0), 0)
  }, [bill])

  const mySubtotal = selectedParticipant ? itemizedShares[selectedParticipant.id]?.subtotal || 0 : 0
  const myItems = selectedParticipant ? itemizedShares[selectedParticipant.id]?.items || [] : []
  const taxAmount = Number(bill?.ocr_tax_amount || 0)
  const tipAmount = Number(bill?.ocr_tip_amount || 0)
  const taxPercent = billSubtotal > 0 ? taxAmount / billSubtotal : 0
  const tipPercent = billSubtotal > 0 ? tipAmount / billSubtotal : 0
  const myTax = billSubtotal > 0 ? mySubtotal * taxPercent : 0
  const myTip = billSubtotal > 0 ? mySubtotal * tipPercent : 0
  const myTotal = mySubtotal + myTax + myTip
  const unclaimedItems = bill ? getUnclaimedItems(bill.items, bill.claims) : []

  const handleToggleClaim = async (itemId: string, quantityClaimed: number) => {
    if (!selectedParticipantId) return

    setBusyItemIds((prev) => ({ ...prev, [itemId]: true }))
    try {
      const shareType = claimShareTypes[itemId] || 'solo'
      const shareWithParticipantIds = claimShareWith[itemId] || []
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          participantId: selectedParticipantId,
          quantityClaimed,
          shareType,
          shareWithParticipantIds
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update claim')
      }

      await fetchBill(true)
    } catch (err: any) {
      setError(err.message || 'Failed to update claim')
    } finally {
      setBusyItemIds((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Join Bill</h1>
            <p className="text-white/70">Code: {code || '—'}</p>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-3xl p-10 flex items-center justify-center text-gray-700">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading bill...
          </div>
        ) : error ? (
          <div className="glass-card rounded-3xl p-8 text-center text-red-600">
            {error}
          </div>
        ) : bill ? (
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Select your name</h2>
              <select
                className="input-field text-gray-900"
                value={selectedParticipantId}
                onChange={(event) => setSelectedParticipantId(event.target.value)}
              >
                {bill.participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}{participant.plus_one_count > 0 ? ` (+${participant.plus_one_count})` : ''}
                  </option>
                ))}
              </select>

            </div>

            {bill.receipt_image_url ? (
              <div className="glass-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt</h3>
                <img
                  src={bill.receipt_image_url}
                  alt="Receipt"
                  className="w-full max-h-96 object-contain rounded-2xl border"
                />
              </div>
            ) : null}

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Claim your items</h3>
                  <p className="text-sm text-gray-500">Pick items you ordered below.</p>
                </div>
                <p className="text-sm text-gray-500">
                  {unclaimedItems.length} unclaimed
                </p>
              </div>

              <div className="space-y-4">
                {bill.items.map((item) => {
                  const claimers = getItemClaimers(item.id, bill.claims, bill.participants)
                  const claimedBySelected = bill.claims.some(
                    (claim) =>
                      claim.item_id === item.id && claim.participant_id === selectedParticipantId
                  )
                  const selectedClaim = bill.claims.find(
                    (claim) =>
                      claim.item_id === item.id && claim.participant_id === selectedParticipantId
                  )
                  const selectedClaimQuantity = selectedClaim?.quantity_claimed ?? 1
                  const claimedQuantity = bill.claims.reduce((sum, claim) => {
                    if (claim.item_id !== item.id) return sum
                    const qty = claim.quantity_claimed ?? 1
                    return sum + qty
                  }, 0)
                  const selectedQuantityForRemaining = claimedBySelected ? selectedClaimQuantity : 0
                  const remainingQuantity = Math.max((item.quantity || 1) - claimedQuantity + selectedQuantityForRemaining, 0)
                  const inputQuantity = claimQuantities[item.id] ?? selectedClaimQuantity
                  const splitWithAllClaim = bill.claims.find(
                    (claim) => claim.item_id === item.id && claim.share_type === 'split_with_all'
                  )
                  const splitWithAllByMe = splitWithAllClaim?.participant_id === selectedParticipantId
                  const splitWithAllLocked = !!splitWithAllClaim && !splitWithAllByMe
                  const splitWithAllName = splitWithAllClaim
                    ? bill.participants.find((participant) => participant.id === splitWithAllClaim.participant_id)?.name
                    : ''
                  const isFullyClaimed = remainingQuantity <= 0 && !claimedBySelected
                  const isLocked = isFullyClaimed || splitWithAllLocked
                  const shareType = splitWithAllClaim
                    ? 'split_with_all'
                    : claimShareTypes[item.id] || selectedClaim?.share_type || 'solo'
                  const shareWith = claimShareWith[item.id] || selectedClaim?.share_with_participant_ids || []
                  const otherParticipants = bill.participants.filter(
                    (participant) => participant.id !== selectedParticipantId
                  )
                  const missingSpecificShares = !splitWithAllLocked && shareType === 'split_with_specific' && shareWith.length === 0
                  const perItemPrice = Number(item.price) / (item.quantity || 1)

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isLocked ? 'bg-gray-100 border-gray-300 opacity-80' : 'border-gray-200 bg-white'}`}
                    >
                      <div>
                        <h4 className="text-gray-900 font-semibold">
                          {item.name}
                          {item.quantity > 1 ? ` x${item.quantity}` : ''}
                        </h4>
                        <p className="text-gray-500 text-sm">
                          {formatCurrency(perItemPrice)}
                          {item.quantity > 1 ? ' each' : ''}
                        </p>
                        {splitWithAllClaim ? (
                          <p className="text-sm text-blue-600 font-medium">
                            Split equally{splitWithAllName ? ` (set by ${splitWithAllName})` : ''}
                          </p>
                        ) : (
                          <p className="text-blue-600 text-sm font-medium">
                            {claimers.length
                              ? `Claimed by: ${claimers.map((claimer) => {
                                  const name = claimer?.name || 'Unknown'
                                  const plusOne = claimer?.plus_one_count > 0 ? ` +${claimer.plus_one_count}` : ''
                                  return `${name}${plusOne}`
                                }).join(', ')}`
                              : 'Unclaimed'}
                          </p>
                        )}
                        {isFullyClaimed ? (
                          <p className="mt-2 inline-flex items-center rounded-full bg-gray-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-800">
                            Fully claimed
                          </p>
                        ) : null}
                      </div>

                      {!isLocked || claimedBySelected ? (
                        <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[320px]">
                          {/* Quantity selector */}
                          {item.quantity > 1 && shareType !== 'split_with_all' && !splitWithAllLocked ? (
                            <div className="flex items-center gap-3">
                              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 min-w-[40px]">Qty</label>
                              <input
                                type="number"
                                min={1}
                                max={Math.max(remainingQuantity, 1)}
                                value={inputQuantity}
                                onChange={(event) => {
                                  const next = Math.max(1, Math.min(Number(event.target.value) || 1, Math.max(remainingQuantity, 1)))
                                  setClaimQuantities((prev) => ({ ...prev, [item.id]: next }))
                                }}
                                className="input-field text-gray-900 w-20 text-center font-semibold"
                              />
                              <span className="text-sm text-gray-500">of {item.quantity}</span>
                            </div>
                          ) : null}

                          {/* Split type selector */}
                          {!splitWithAllLocked ? (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Split Type</label>
                              <select
                                className="input-field text-gray-900 w-full font-medium"
                                value={shareType}
                                onChange={(event) => {
                                  const nextType = event.target.value as 'solo' | 'split_with_specific' | 'split_with_all'
                                  setClaimShareTypes((prev) => ({ ...prev, [item.id]: nextType }))
                                  if (nextType !== 'split_with_specific') {
                                    setClaimShareWith((prev) => ({ ...prev, [item.id]: [] }))
                                  }
                                }}
                              >
                                <option value="solo">Just me</option>
                                <option value="split_with_all" disabled={otherParticipants.length === 0}>
                                  Split with everyone
                                </option>
                                <option value="split_with_specific" disabled={otherParticipants.length === 0}>
                                  Split with specific people
                                </option>
                              </select>

                              {/* Split with specific people checkboxes */}
                              {shareType === 'split_with_specific' ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {otherParticipants.map((participant) => (
                                    <label
                                      key={participant.id}
                                      className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm cursor-pointer transition-all ${
                                        shareWith.includes(participant.id)
                                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                                        checked={shareWith.includes(participant.id)}
                                        onChange={(event) => {
                                          const next = event.target.checked
                                            ? [...shareWith, participant.id]
                                            : shareWith.filter((id) => id !== participant.id)
                                          setClaimShareWith((prev) => ({ ...prev, [item.id]: next }))
                                        }}
                                      />
                                      {participant.name}
                                    </label>
                                  ))}
                                </div>
                              ) : null}

                              {missingSpecificShares ? (
                                <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                  Pick at least one person to split with
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            {!isFullyClaimed && !splitWithAllLocked ? (
                              <button
                                className={`flex-1 ${claimedBySelected ? 'btn-secondary' : 'btn-primary'}`}
                                disabled={
                                  !selectedParticipantId ||
                                  !!busyItemIds[item.id] ||
                                  remainingQuantity <= 0 ||
                                  missingSpecificShares
                                }
                                onClick={() => handleToggleClaim(item.id, inputQuantity)}
                              >
                                {busyItemIds[item.id] ? (
                                  <span className="flex items-center gap-2 justify-center">
                                    <Loader2 className="animate-spin" size={16} />
                                    Saving
                                  </span>
                                ) : claimedBySelected ? (
                                  'Update Claim'
                                ) : (
                                  'Claim Item'
                                )}
                              </button>
                            ) : null}

                            {claimedBySelected && !splitWithAllLocked ? (
                              <button
                                className="btn-secondary px-4"
                                disabled={!selectedParticipantId || !!busyItemIds[item.id]}
                                onClick={() => handleToggleClaim(item.id, 0)}
                              >
                                Unclaim
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Your Share Summary */}
            {myTotal > 0 ? (
              <div className="glass-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Share</h3>
                <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="text-sm">Your subtotal</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(mySubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="text-sm">Your tax ({(taxPercent * 100).toFixed(2)}%)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(myTax)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="text-sm">Your tip ({(tipPercent * 100).toFixed(2)}%)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(myTip)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-green-100 px-3 py-2 text-green-800">
                      <span className="text-sm font-semibold">Your total</span>
                      <span className="font-bold">{formatCurrency(myTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Item Breakdown */}
                {myItems.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowMyItems((prev) => !prev)}
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        Item breakdown ({myItems.length})
                      </span>
                      <span className="text-xs font-semibold text-gray-500 px-2 py-1 rounded-full bg-white">
                        {showMyItems ? 'Hide' : 'Show'}
                      </span>
                    </button>
                    {showMyItems && (
                      <div className="mt-3 space-y-2 px-4">
                        {myItems.map((entry, index) => (
                          <div key={`${entry.item_id}-${index}`} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                            <span className="text-gray-700">{entry.name}</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(entry.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {myItems.length === 0 && myTotal > 0 && (
                  <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Note:</strong> You have a total because some items are automatically split equally among everyone.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Summary</h3>
              <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(billSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax ({(taxPercent * 100).toFixed(2)}%)</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tip ({(tipPercent * 100).toFixed(2)}%)</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(tipAmount)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-100 px-3 py-2 text-blue-800">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-bold">{formatCurrency(billSubtotal + taxAmount + tipAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
