'use client'

import { Camera, Share2, DollarSign, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24 animate-slide-up">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary to-primary-dark rounded-3xl mb-8 shadow-2xl shadow-primary/30">
            <svg
              aria-label="DivvyUp logo"
              viewBox="0 0 64 64"
              className="w-12 h-12 md:w-14 md:h-14 text-white"
              role="img"
            >
              <rect x="14" y="10" width="36" height="44" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M18 20h28M18 30h20M18 40h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="44" cy="44" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M44 44 L44 34 A10 10 0 0 1 54 44 Z" fill="currentColor" />
            </svg>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Split Bills
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary-dark bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Instantly
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-white/80 mb-10 md:mb-12 leading-relaxed">
            Upload receipt. Invite friends. Done.<br />
            No math, no awkwardness, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/create" className="w-full sm:w-auto">
              <button className="btn-primary text-lg px-8 py-4 flex items-center gap-2 w-full justify-center group">
                Create New Bill
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/join" className="w-full sm:w-auto">
              <button className="btn-secondary text-lg px-8 py-4 w-full">
                Join Existing Bill
              </button>
            </Link>
          </div>
        </div>

        {/* How It Works Label */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/30" />
          <span className="text-white/60 text-sm font-medium uppercase tracking-widest">How it works</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/30" />
        </div>

        {/* Features - Bento Grid */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop: Horizontal layout with connecting line */}
          <div className="hidden md:block relative">
            {/* Connecting line */}
            <div className="absolute top-[72px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-emerald-500/50 via-sky-500/50 to-amber-500/50" />

            <div className="grid grid-cols-3 gap-6">
              <FeatureCard
                step={1}
                icon={<Camera size={32} />}
                title="Snap Receipt"
                description="Point your camera at any receipt. Our AI extracts every item, tax, and tip in seconds."
                gradient="from-emerald-400 to-teal-500"
                glowColor="emerald"
              />

              <FeatureCard
                step={2}
                icon={<Share2 size={32} />}
                title="Send Link"
                description="Share a single link with your group. Everyone picks their items—no app needed."
                gradient="from-sky-400 to-blue-500"
                glowColor="sky"
              />

              <FeatureCard
                step={3}
                icon={<DollarSign size={32} />}
                title="Auto‑Calculate"
                description="Watch totals update live. Tax and tip split fairly, down to the cent."
                gradient="from-amber-400 to-orange-500"
                glowColor="amber"
              />
            </div>
          </div>

          {/* Mobile: Vertical timeline */}
          <div className="md:hidden relative">
            {/* Vertical connecting line */}
            <div className="absolute left-8 top-20 bottom-20 w-0.5 bg-gradient-to-b from-emerald-500/50 via-sky-500/50 to-amber-500/50" />

            <div className="flex flex-col gap-6">
              <FeatureCardMobile
                step={1}
                icon={<Camera size={28} />}
                title="Snap Receipt"
                description="Point your camera at any receipt. Our AI extracts every item, tax, and tip in seconds."
                gradient="from-emerald-400 to-teal-500"
                glowColor="emerald"
              />

              <FeatureCardMobile
                step={2}
                icon={<Share2 size={28} />}
                title="Send Link"
                description="Share a single link with your group. Everyone picks their items—no app needed."
                gradient="from-sky-400 to-blue-500"
                glowColor="sky"
              />

              <FeatureCardMobile
                step={3}
                icon={<DollarSign size={28} />}
                title="Auto‑Calculate"
                description="Watch totals update live. Tax and tip split fairly, down to the cent."
                gradient="from-amber-400 to-orange-500"
                glowColor="amber"
              />
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16 md:mt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
            <Zap size={14} className="text-primary" />
            <p className="text-sm text-white/70">No signup required • Free forever • Privacy-first</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  step,
  icon,
  title,
  description,
  gradient,
  glowColor
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  glowColor: 'emerald' | 'sky' | 'amber'
}) {
  const glowColors = {
    emerald: 'group-hover:shadow-emerald-500/25',
    sky: 'group-hover:shadow-sky-500/25',
    amber: 'group-hover:shadow-amber-500/25'
  }

  return (
    <div className={`group relative`}>
      {/* Step number circle */}
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <span className="text-white text-xl font-bold">{step}</span>
      </div>

      {/* Card */}
      <div className={`relative pt-10 h-full overflow-hidden rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/10 p-6 transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.12] ${glowColors[glowColor]} hover:shadow-2xl`}>
        {/* Gradient accent line at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} text-white mb-5 shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
          {icon}
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-white/70 leading-relaxed">{description}</p>

        {/* Decorative corner gradient */}
        <div className={`absolute -bottom-12 -right-12 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-20`} />
      </div>
    </div>
  )
}

function FeatureCardMobile({
  step,
  icon,
  title,
  description,
  gradient,
  glowColor
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  glowColor: 'emerald' | 'sky' | 'amber'
}) {
  return (
    <div className="relative pl-20">
      {/* Step number circle - positioned on the timeline */}
      <div className={`absolute left-2 top-6 z-20 w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <span className="text-white text-lg font-bold">{step}</span>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/10 p-5">
        {/* Gradient accent line at left */}
        <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${gradient}`} />

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            {icon}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
