/**
 * Landing Page - Platform Version Selector
 *
 * A/B/C testing entry point allowing users to choose between:
 * - Version A: Rep Intel Platform (NEW - action-oriented)
 * - Version B: Sales Hub (existing - data exploration)
 * - Version C: Analytics Dashboard (existing - visualizations)
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'rv-platform-last-version'

interface VersionOption {
  id: 'rep-intel' | 'sales' | 'analytics'
  label: string
  title: string
  description: string
  features: string[]
  status: 'new' | 'current' | 'legacy'
  route: string
  icon: string
  color: string
}

const versions: VersionOption[] = [
  {
    id: 'rep-intel',
    label: 'VERSION A',
    title: 'Rep Intel Platform',
    description: 'Action-oriented intelligence for field reps. Every screen answers "What do I do next?"',
    features: [
      'Territory health score',
      'Priority dealer rankings',
      'Smart alerts & opportunities',
      'Pricing intelligence',
      'Aging inventory analysis'
    ],
    status: 'new',
    route: '/rep-intel',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: '#495737' // sage
  },
  {
    id: 'sales',
    label: 'VERSION B',
    title: 'Sales Hub',
    description: 'Comprehensive sales platform with dealer views, inventory data, and competitive analysis.',
    features: [
      'Territory dashboard',
      'Dealer directory & details',
      'Competitive intelligence',
      'Meeting preparation',
      'Product catalog'
    ],
    status: 'current',
    route: '/sales',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    color: '#a46807' // gold
  },
  {
    id: 'analytics',
    label: 'VERSION C',
    title: 'Analytics Dashboard',
    description: 'Data visualization and market analysis with interactive charts and cross-filtering.',
    features: [
      'Market share analysis',
      'Geographic distribution',
      'Price distribution',
      'Multiple chart libraries',
      'Mobile-optimized views'
    ],
    status: 'legacy',
    route: '/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: '#577d91' // steel
  }
]

export function LandingPage() {
  const navigate = useNavigate()
  const [lastUsed, setLastUsed] = useState<string | null>(null)
  const [rememberChoice, setRememberChoice] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setLastUsed(saved)
    }
  }, [])

  const handleVersionSelect = (version: VersionOption) => {
    if (rememberChoice) {
      localStorage.setItem(STORAGE_KEY, version.id)
    }
    navigate(version.route)
  }

  const getStatusBadge = (status: VersionOption['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-[#495737] text-white">
            New
          </span>
        )
      case 'current':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-[#a46807]/20 text-[#a46807]">
            Current
          </span>
        )
      case 'legacy':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-[#577d91]/20 text-[#577d91]">
            Legacy
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0]">
      {/* Header */}
      <header className="bg-[#181817] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          {/* Thor Logo placeholder */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#495737] to-[#577d91] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            RV Market Intelligence
          </h1>
          <p className="text-[#8c8a7e]">
            Select your experience
          </p>
        </div>
      </header>

      {/* Last Used Banner */}
      {lastUsed && (
        <div className="bg-[#495737]/10 border-b border-[#495737]/20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-2 text-sm">
            <svg className="w-4 h-4 text-[#495737]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[#595755]">
              Last used: <strong className="text-[#181817]">{versions.find(v => v.id === lastUsed)?.title}</strong>
            </span>
            <button
              onClick={() => {
                const lastVersion = versions.find(v => v.id === lastUsed)
                if (lastVersion) navigate(lastVersion.route)
              }}
              className="ml-2 px-3 py-1 rounded-lg bg-[#495737] text-white text-xs font-semibold hover:bg-[#3d4a2e] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Version Cards */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`
                relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300
                hover:shadow-xl hover:scale-[1.02] hover:border-[${version.color}]
                ${lastUsed === version.id ? 'border-[#495737] ring-2 ring-[#495737]/20' : 'border-[#d9d6cf]'}
              `}
            >
              {/* Header */}
              <div
                className="px-6 py-4 text-white"
                style={{ backgroundColor: version.color }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {version.label}
                  </span>
                  {getStatusBadge(version.status)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={version.icon} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold">{version.title}</h2>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-[#595755] text-sm mb-4 min-h-[48px]">
                  {version.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {version.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#181817]">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: version.color }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Launch Button */}
                <button
                  onClick={() => handleVersionSelect(version)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: version.color }}
                >
                  Launch
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>

              {/* Last Used Indicator */}
              {lastUsed === version.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 rounded-full bg-[#495737] ring-2 ring-white" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Remember Choice */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded border-[#d9d6cf] text-[#495737] focus:ring-[#495737]"
            />
            <span className="text-sm text-[#595755]">Remember my choice</span>
          </label>
          {lastUsed && (
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY)
                setLastUsed(null)
              }}
              className="text-sm text-[#8c8a7e] hover:text-[#595755] underline"
            >
              Clear preference
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d9d6cf] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-[#8c8a7e]">
          <p>RV Market Intelligence Platform</p>
          <p className="mt-1">Thor Industries Sales Tools</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
