/**
 * Header Component
 *
 * Top navigation bar for the Sales Platform
 */

import { useSalesContext } from '../../context/SalesContext'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export function Header({ title, showBack = false, onBack }: HeaderProps) {
  const {
    theme,
    viewMode,
    sidebarOpen,
    setSidebarOpen,
    filterPanelOpen,
    setFilterPanelOpen,
    activeFilterCount
  } = useSalesContext()
  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  return (
    <header className={`
      sticky top-0 z-40
      ${isDark ? 'bg-[#181817]/95 border-b border-white/10' : 'bg-[#fffdfa]/95 border-b border-[#d9d6cf]'}
      backdrop-blur-md
    `}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Menu button (mobile) */}
          {isMobile && !showBack && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                p-2 -ml-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
              `}
            >
              <svg className={`w-6 h-6 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Back button */}
          {showBack && (
            <button
              onClick={onBack}
              className={`
                p-2 -ml-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
              `}
            >
              <svg className={`w-6 h-6 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Title */}
          {title && (
            <h1 className={`font-bold text-lg ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {title}
            </h1>
          )}

          {/* Logo (desktop when no title) */}
          {!title && !isMobile && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#495737] to-[#577d91] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Sales Hub
              </span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            className={`
              p-2 rounded-lg transition-colors
              ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
            `}
          >
            <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Filter button */}
          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`
              relative p-2 rounded-lg transition-colors
              ${filterPanelOpen
                ? 'bg-[#495737] text-white'
                : isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'
              }
            `}
          >
            <svg
              className={`w-5 h-5 ${filterPanelOpen ? 'text-white' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-[#a46807] text-white rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Theme toggle (desktop) */}
          {!isMobile && <ThemeToggle />}

          {/* Notifications */}
          <button
            className={`
              relative p-2 rounded-lg transition-colors
              ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
            `}
          >
            <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#a46807] rounded-full" />
          </button>

          {/* User avatar (mobile) */}
          {isMobile && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a46807] to-[#c4850d] flex items-center justify-center">
              <span className="text-white font-bold text-xs">JD</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
