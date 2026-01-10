/**
 * Mobile Bottom Navigation Component
 *
 * Fixed bottom navigation for mobile view
 */

import { useSalesContext } from '../../context/SalesContext'
import type { PlatformView } from '../../context/SalesContext'

interface NavItem {
  id: PlatformView
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    id: 'dealers',
    label: 'Dealers',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    id: 'map',
    label: 'Map',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'competitive',
    label: 'Intel',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'products',
    label: 'Products',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  }
]

export function MobileNav() {
  const { theme, currentView, setCurrentView } = useSalesContext()
  const isDark = theme === 'dark'

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0 z-50
      ${isDark ? 'bg-[#181817] border-t border-white/10' : 'bg-[#fffdfa] border-t border-[#d9d6cf]'}
      safe-area-inset-bottom
    `}>
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                flex flex-col items-center justify-center
                min-w-[64px] py-2 px-3 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'text-[#495737]'
                  : isDark
                    ? 'text-[#8c8a7e]'
                    : 'text-[#595755]'
                }
              `}
            >
              <span className={`
                transition-transform duration-200
                ${isActive ? 'scale-110' : ''}
              `}>
                {item.icon}
              </span>
              <span className={`
                text-[10px] mt-1 font-medium
                ${isActive ? 'font-semibold' : ''}
              `}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#495737]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
