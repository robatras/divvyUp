'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function JoinBillEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (!normalized) {
      setError('Enter your bill code to continue.')
      return
    }

    setError('')
    router.push(`/join/${normalized}`)
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
          <h1 className="text-3xl font-bold">Join a Bill</h1>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Enter your code</h2>
          <p className="text-gray-600 mb-6">
            Use the 6-character code from your invite to join and claim items.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="input-field text-gray-900 text-lg tracking-widest uppercase"
              placeholder="ABC123"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={8}
              aria-label="Bill code"
            />

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              Continue
              <ArrowRight size={18} />
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
