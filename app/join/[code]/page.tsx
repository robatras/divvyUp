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

  const baseSplits = useMemo(() => {
    if (!bill) return {}
    const base: Record<string, number> = {}
    bill.participants.forEach((participant) => {
      base[participant.id] = 0
    })

    bill.claims.forEach((claim) => {
      const item = bill.items.find((candidate) => candidate.id === claim.item_id)
      if (!item) return

      const itemPrice = Number(item.price)

      if (claim.share_type === 'solo') {
        const claimQuantity = claim.quantity_claimed ?? 1
        const itemQuantity = item.quantity || 1
        base[claim.participant_id] += itemPrice * (claimQuantity / itemQuantity)
      } else if (claim.share_type === 'split_with_all') {
        const perPerson = itemPrice / bill.participants.length
        bill.participants.forEach((participant) => {
          base[participant.id] += perPerson
        })
      } else if (claim.share_type === 'split_with_specific') {
        const shareWith = claim.share_with_participant_ids || []
        const totalSharers = shareWith.length + 1
        const perPerson = itemPrice / totalSharers

        base[claim.participant_id] += perPerson
        shareWith.forEach((pid: string) => {
          base[pid] += perPerson
        })
      }
    })

    Object.keys(base).forEach((key) => {
      base[key] = Math.round(base[key] * 100) / 100
    })

    return base
  }, [bill])

  const itemizedShares = useMemo(() => {
    if (!bill) return {}
    return getItemizedShares(bill.items, bill.participants, bill.claims)
  }, [bill])

  const billSubtotal = useMemo(() => {
    if (!bill) return 0
    return bill.items.reduce((sum, item) => sum + Number(item.price || 0), 0)
  }, [bill])

  const mySubtotal = selectedParticipant ? baseSplits[selectedParticipant.id] || 0 : 0
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
                    {participant.name}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Claim your items</h3>
                <p className="text-sm text-gray-500">
                  {unclaimedItems.length} unclaimed
                </p>
              </div>

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Your subtotal: {formatCurrency(mySubtotal)}
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Your tax ({(taxPercent * 100).toFixed(2)}%): {formatCurrency(myTax)}
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Your tip ({(tipPercent * 100).toFixed(2)}%): {formatCurrency(myTip)}
                </div>
                <div className="bg-green-100 rounded-2xl px-4 py-3 text-green-700 font-semibold">
                  Your total: {formatCurrency(myTotal)}
                </div>
              </div>

              {myItems.length ? (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-900"
                    onClick={() => setShowMyItems((prev) => !prev)}
                  >
                    Your items
                    <span className="text-gray-500">{showMyItems ? 'Hide' : 'Show'}</span>
                  </button>
                  {showMyItems ? (
                    <div className="mt-3 space-y-2">
                      {myItems.map((entry, index) => (
                        <div key={`${entry.item_id}-${index}`} className="flex items-center justify-between text-sm text-gray-700">
                          <span>{entry.name}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(entry.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

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
                  const isFullyClaimed = remainingQuantity <= 0 && !claimedBySelected
                  const inputQuantity = claimQuantities[item.id] ?? selectedClaimQuantity
                  const splitWithAllClaim = bill.claims.find(
                    (claim) => claim.item_id === item.id && claim.share_type === 'split_with_all'
                  )
                  const splitWithAllByMe = splitWithAllClaim?.participant_id === selectedParticipantId
                  const splitWithAllLocked = !!splitWithAllClaim && !splitWithAllByMe
                  const splitWithAllName = splitWithAllClaim
                    ? bill.participants.find((participant) => participant.id === splitWithAllClaim.participant_id)?.name
                    : ''
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
                      className={`border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isFullyClaimed || splitWithAllLocked ? 'bg-gray-50 opacity-70' : ''}`}
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
                        {splitWithAllClaim ? null : (
                          <p className="text-gray-500 text-sm">
                            {claimers.length
                              ? `Claimed by: ${claimers.map((claimer) => claimer?.name).join(', ')}`
                              : 'Unclaimed'}
                          </p>
                        )}
                        {isFullyClaimed ? (
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Fully claimed
                          </p>
                        ) : null}
                        {splitWithAllClaim ? (
                          <p className="text-sm text-blue-600 font-medium">
                            Split equally{splitWithAllName ? ` (set by ${splitWithAllName})` : ''}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {item.quantity > 1 && shareType !== 'split_with_all' && !splitWithAllLocked ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Qty</span>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(remainingQuantity, 1)}
                              value={inputQuantity}
                              onChange={(event) => {
                                const next = Math.max(1, Math.min(Number(event.target.value) || 1, Math.max(remainingQuantity, 1)))
                                setClaimQuantities((prev) => ({ ...prev, [item.id]: next }))
                              }}
                              className="input-field text-gray-900 w-20"
                            />
                          </div>
                        ) : null}


                        <div className="flex flex-col gap-2">
                          <label className="text-xs uppercase tracking-wide text-gray-500">Split</label>
                          <select
                            className="input-field text-gray-900 w-full sm:w-60"
                            value={shareType}
                            onChange={(event) => {
                              const nextType = event.target.value as 'solo' | 'split_with_specific' | 'split_with_all'
                              setClaimShareTypes((prev) => ({ ...prev, [item.id]: nextType }))
                              if (nextType !== 'split_with_specific') {
                                setClaimShareWith((prev) => ({ ...prev, [item.id]: [] }))
                              }
                            }}
                            disabled={splitWithAllLocked}
                          >
                            <option value="solo">Just me</option>
                            <option value="split_with_all" disabled={otherParticipants.length === 0}>
                              Split with everyone
                            </option>
                            <option value="split_with_specific" disabled={otherParticipants.length === 0}>
                              Split with specific people
                            </option>
                          </select>

                          {shareType === 'split_with_specific' && !splitWithAllLocked ? (
                            <div className="flex flex-wrap gap-2">
                              {otherParticipants.map((participant) => (
                                <label
                                  key={participant.id}
                                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
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
                            <p className="text-xs text-red-500">Pick at least one person to split with.</p>
                          ) : null}
                        </div>

                        <button
                          className={claimedBySelected ? 'btn-secondary' : 'btn-primary'}
                          disabled={
                            !selectedParticipantId ||
                            !!busyItemIds[item.id] ||
                            remainingQuantity <= 0 ||
                            missingSpecificShares ||
                            splitWithAllLocked
                          }
                          onClick={() => handleToggleClaim(item.id, inputQuantity)}
                        >
                          {busyItemIds[item.id] ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={16} />
                              Saving
                            </span>
                          ) : splitWithAllLocked ? (
                            'Split equally'
                          ) : claimedBySelected ? (
                            'Update claim'
                          ) : (
                            'Claim'
                          )}
                        </button>

                        {claimedBySelected && !splitWithAllLocked ? (
                          <button
                            className="btn-secondary"
                            disabled={!selectedParticipantId || !!busyItemIds[item.id]}
                            onClick={() => handleToggleClaim(item.id, 0)}
                          >
                            Unclaim
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill summary</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Subtotal: {formatCurrency(billSubtotal)}
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Tax ({(taxPercent * 100).toFixed(2)}%): {formatCurrency(taxAmount)}
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                  Tip ({(tipPercent * 100).toFixed(2)}%): {formatCurrency(tipAmount)}
                </div>
                <div className="bg-blue-100 rounded-2xl px-4 py-3 text-blue-700 font-semibold">
                  Total: {formatCurrency(billSubtotal + taxAmount + tipAmount)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
