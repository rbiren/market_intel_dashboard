/**
 * Sidebar Navigation Component
 *
 * Main navigation for the Sales Platform (desktop view)
 */

import { Link } from 'react-router-dom'
import { useSalesContext } from '../../context/SalesContext'
import type { PlatformView } from '../../context/SalesContext'
import type { ReactNode } from 'react'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  id: PlatformView
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    id: 'dealers',
    label: 'Dealers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    id: 'map',
    label: 'Territory Map',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
  },
  {
    id: 'competitive',
    label: 'Competitive Intel',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'products',
    label: 'Products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    id: 'meeting-prep',
    label: 'Meeting Prep',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
]

export function Sidebar() {
  const { theme, currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useSalesContext()
  const isDark = theme === 'dark'

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isDark ? 'bg-[#181817] border-r border-white/10' : 'bg-[#fffdfa] border-r border-[#d9d6cf]'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className={`
          px-6 py-5 border-b
          ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
        `}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#495737] to-[#577d91] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className={`font-bold text-lg ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Sales Hub
              </h1>
              <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                Thor Industries
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentView(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? isDark
                          ? 'bg-[#495737]/20 text-[#495737]'
                          : 'bg-[#495737]/10 text-[#495737]'
                        : isDark
                          ? 'text-[#8c8a7e] hover:bg-white/5 hover:text-[#fffdfa]'
                          : 'text-[#595755] hover:bg-[#f7f4f0] hover:text-[#181817]'
                      }
                      ${isActive ? 'font-semibold' : 'font-medium'}
                    `}
                  >
                    <span className={isActive ? 'text-[#495737]' : ''}>{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#495737]" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Divider */}
          <div className={`my-4 border-t ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`} />

          {/* External Links */}
          <p className={`px-4 mb-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            More Tools
          </p>
          <Link
            to="/analytics"
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg
              transition-all duration-200
              ${isDark
                ? 'text-[#8c8a7e] hover:bg-white/5 hover:text-[#fffdfa]'
                : 'text-[#595755] hover:bg-[#f7f4f0] hover:text-[#181817]'
              }
              font-medium
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics Dashboard</span>
            <svg className={`w-4 h-4 ml-auto ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </nav>

        {/* Footer */}
        <div className={`
          px-4 py-4 border-t
          ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
        `}>
          {/* Theme Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
            <ThemeToggle />
          </div>

          {/* User */}
          <div className={`
            flex items-center gap-3 p-3 rounded-lg
            ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}
          `}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a46807] to-[#c4850d] flex items-center justify-center">
              <span className="text-white font-bold text-sm">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                John Doe
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                Southeast Region
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
