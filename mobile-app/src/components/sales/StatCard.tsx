/**
 * Stat Card Component
 *
 * Displays a key metric with label, value, and optional trend/change
 */

import React from 'react'
import { useSalesContext } from '../../context/SalesContext'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  color?: 'sage' | 'gold' | 'steel' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  subValue,
  change,
  changeLabel,
  icon,
  color = 'neutral',
  size = 'md',
  onClick
}: StatCardProps) {
  const { theme } = useSalesContext()

  const colorClasses = {
    sage: {
      light: 'border-l-[#495737] bg-gradient-to-br from-[#495737]/5 to-transparent',
      dark: 'border-l-[#495737] bg-gradient-to-br from-[#495737]/20 to-transparent',
      iconBg: 'bg-[#495737]/10',
      iconColor: 'text-[#495737]'
    },
    gold: {
      light: 'border-l-[#a46807] bg-gradient-to-br from-[#a46807]/5 to-transparent',
      dark: 'border-l-[#a46807] bg-gradient-to-br from-[#a46807]/20 to-transparent',
      iconBg: 'bg-[#a46807]/10',
      iconColor: 'text-[#a46807]'
    },
    steel: {
      light: 'border-l-[#577d91] bg-gradient-to-br from-[#577d91]/5 to-transparent',
      dark: 'border-l-[#577d91] bg-gradient-to-br from-[#577d91]/20 to-transparent',
      iconBg: 'bg-[#577d91]/10',
      iconColor: 'text-[#577d91]'
    },
    neutral: {
      light: 'border-l-[#8c8a7e] bg-gradient-to-br from-[#8c8a7e]/5 to-transparent',
      dark: 'border-l-[#8c8a7e] bg-gradient-to-br from-[#8c8a7e]/20 to-transparent',
      iconBg: 'bg-[#8c8a7e]/10',
      iconColor: 'text-[#8c8a7e]'
    }
  }

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  const colors = colorClasses[color]
  const isDark = theme === 'dark'

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border-l-4 transition-all duration-200
        ${sizeClasses[size]}
        ${isDark ? colors.dark : colors.light}
        ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]/50'}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''}
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <p className={`
            text-xs font-semibold uppercase tracking-wider mb-1
            ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}
          `}>
            {label}
          </p>

          {/* Value */}
          <p className={`
            font-bold tracking-tight
            ${valueSizeClasses[size]}
            ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}
          `}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>

          {/* Sub-value */}
          {subValue && (
            <p className={`
              text-sm mt-0.5
              ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}
            `}>
              {subValue}
            </p>
          )}

          {/* Change indicator */}
          {change !== undefined && (
            <div className={`
              flex items-center gap-1 mt-2 text-sm font-medium
              ${change > 0 ? 'text-[#495737]' : change < 0 ? 'text-red-500' : 'text-[#8c8a7e]'}
            `}>
              {change > 0 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : change < 0 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              <span>{Math.abs(change)}%</span>
              {changeLabel && <span className="text-[#8c8a7e] font-normal">{changeLabel}</span>}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`
            p-2 rounded-lg
            ${colors.iconBg}
          `}>
            <div className={colors.iconColor}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
