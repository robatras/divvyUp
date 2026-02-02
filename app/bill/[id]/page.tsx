'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Copy, CheckCircle2 } from 'lucide-react'
import type { BillWithDetails } from '@/types'
import { calculateSplits, formatCurrency, formatDate, getUnclaimedItems } from '@/lib/utils'

export default function BillDetailsPage() {
  const params = useParams()
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id
  const billId = (idParam || '').toString()

  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchBill = useCallback(async () => {
    if (!billId) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/bills?id=${encodeURIComponent(billId)}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load bill')
      }

      setBill(result.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load bill')
    } finally {
      setLoading(false)
    }
  }, [billId])

  useEffect(() => {
    fetchBill()
  }, [fetchBill])

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

  const unclaimedItems = bill ? getUnclaimedItems(bill.items, bill.claims) : []

  const handleCopy = async () => {
    if (!bill) return
    const origin = window.location.origin
    const shareUrl = `${origin}/join/${bill.bill_code}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 8000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Bill Details</h1>
            <p className="text-white/70">Bill ID: {billId || '—'}</p>
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
            <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Bill code: {bill.bill_code}</h2>
                <p className="text-gray-600">Created {formatDate(bill.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                    Tax: {formatCurrency(bill.ocr_tax_amount || 0)}
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-700">
                    Tip: {formatCurrency(bill.ocr_tip_amount || 0)}
                  </div>
                  <div className="bg-blue-100 rounded-2xl px-4 py-3 text-blue-700 font-semibold">
                    {unclaimedItems.length} unclaimed
                  </div>
                </div>
              </div>

              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={18} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy join link
                  </>
                )}
              </button>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {bill.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="border border-gray-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 font-semibold">{participant.name}</p>
                      <p className="text-gray-500 text-sm">
                        {participant.has_responded ? 'Responded' : 'Pending'}
                      </p>
                    </div>
                    <p className="text-green-700 font-semibold mt-2">
                      {formatCurrency(splits[participant.id] || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
              <div className="space-y-4">
                {bill.items.map((item) => {
                  const perItemPrice = Number(item.price) / (item.quantity || 1)
                  const claimedCount = bill.claims.filter(
                    (claim) => claim.item_id === item.id
                  ).length

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between"
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
                      </div>
                      <p className="text-gray-600 text-sm">
                        {claimedCount > 0 ? `${claimedCount} claimed` : 'Unclaimed'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
