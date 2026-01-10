/**
 * Theme Toggle Component
 *
 * Beautiful toggle switch for light/dark mode with smooth animations
 */

import { useSalesContext } from '../../context/SalesContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useSalesContext()

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-7 rounded-full transition-all duration-300 ease-out
        ${theme === 'dark'
          ? 'bg-gradient-to-r from-[#495737] to-[#577d91]'
          : 'bg-gradient-to-r from-[#a46807] to-[#c4850d]'
        }
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${theme === 'dark' ? 'focus:ring-[#577d91]' : 'focus:ring-[#a46807]'}
        shadow-inner
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Track decoration */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5">
        {/* Sun icon */}
        <svg
          className={`w-4 h-4 transition-opacity duration-200 ${theme === 'dark' ? 'opacity-40' : 'opacity-100'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
        {/* Moon icon */}
        <svg
          className={`w-4 h-4 transition-opacity duration-200 ${theme === 'dark' ? 'opacity-100' : 'opacity-40'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>

      {/* Thumb */}
      <span
        className={`
          absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg
          transform transition-transform duration-300 ease-out
          ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'}
          flex items-center justify-center
        `}
      >
        {theme === 'dark' ? (
          <svg className="w-3.5 h-3.5 text-[#181817]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[#a46807]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  )
}

export default ThemeToggle
