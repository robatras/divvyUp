'use client'

import { useState } from 'react'
import { Sparkles, Camera, Share2, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20 animate-slide-up">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-primary-dark rounded-3xl mb-8 shadow-2xl">
            <svg
              aria-label="DivvyUp logo"
              viewBox="0 0 64 64"
              className="w-14 h-14 text-white"
              role="img"
            >
              <rect x="14" y="10" width="36" height="44" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M18 20h28M18 30h20M18 40h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <circle cx="44" cy="44" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M44 44 L44 34 A10 10 0 0 1 54 44 Z" fill="currentColor" />
            </svg>
          </div>

          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            Split Bills
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed">
            Upload receipt. Invite friends. Done.<br />
            No math, no awkwardness, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <button className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                Create New Bill
                <ArrowRight size={20} />
              </button>
            </Link>
            
            <Link href="/join">
              <button className="btn-secondary text-lg px-8 py-4">
                Join Existing Bill
              </button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Camera size={32} />}
            title="Snap Receipt"
            description="AI extracts items, tax, and tip automatically"
            color="from-green-400 to-green-600"
          />
          
          <FeatureCard
            icon={<Share2 size={32} />}
            title="Send Link"
            description="Friends get text with sharable link"
            color="from-blue-400 to-blue-600"
          />
          
          <FeatureCard
            icon={<DollarSign size={32} />}
            title="Auto-Calculate"
            description="Everyone picks items, we handle the math"
            color="from-purple-400 to-purple-600"
          />
        </div>

        {/* Social Proof */}
        <div className="text-center mt-20 text-white/60">
          <p className="text-sm">No signup required • Free forever • Privacy-first</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="glass-card rounded-3xl p-8 hover:scale-105 transition-transform duration-200">
      <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${color} rounded-2xl mb-6 text-white shadow-lg`}>
        {icon}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
