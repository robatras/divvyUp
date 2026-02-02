'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

type Step = 'request' | 'verify' | 'done'

export default function OrganizerRecoveryPage() {
  const [step, setStep] = useState<Step>('request')
  const [billCode, setBillCode] = useState('')
  const [organizerPhone, setOrganizerPhone] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [organizerAccessCode, setOrganizerAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatUSPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handleRequest = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/organizer/recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billCode,
          organizerPhone
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to send recovery code.')
      }

      setStep('verify')
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery code.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/organizer/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billCode,
          organizerPhone,
          recoveryCode
        })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to verify code.')
      }

      setOrganizerAccessCode(result.data.organizerAccessCode)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Failed to verify code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Organizer Recovery</h1>
        </div>

        <div className="glass-card rounded-3xl p-8 space-y-6">
          {step === 'request' && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send recovery code</h2>
                <p className="text-gray-600">
                  Enter your bill code and organizer phone to receive a 6-digit SMS code.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  className="input-field text-gray-900 text-lg tracking-widest uppercase"
                  placeholder="Bill code (e.g. ABC123)"
                  value={billCode}
                  onChange={(event) => setBillCode(event.target.value)}
                  maxLength={8}
                />
                <input
                  className="input-field text-gray-900 text-lg"
                  placeholder="Organizer phone (e.g. 415-555-1234)"
                  value={organizerPhone}
                  onChange={(event) => setOrganizerPhone(formatUSPhone(event.target.value))}
                  inputMode="numeric"
                  pattern="\\d{3}-\\d{3}-\\d{4}"
                  maxLength={12}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                onClick={handleRequest}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Send code
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify code</h2>
                <p className="text-gray-600">
                  We sent a 6-digit code to your phone. Enter it to unlock your organizer link.
                </p>
              </div>

              <input
                className="input-field text-gray-900 text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                maxLength={6}
              />

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                onClick={handleVerify}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Verify & continue
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle2 size={20} />
                Organizer access restored
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-600 mb-1">Organizer code (save this)</p>
                <p className="text-xl font-bold text-gray-900 tracking-widest">
                  {organizerAccessCode}
                </p>
              </div>

              <Link href={`/organizer/${organizerAccessCode}`}>
                <button className="btn-primary w-full">Open organizer view</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
