// Formatting utilities for charts

export function formatChartPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

export function formatChartNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatCompactValue(num: number | null | undefined, type?: 'count' | 'price' | 'value'): string {
  if (num === null || num === undefined) return 'N/A'

  if (type === 'count') {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Default: currency format
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

export function formatTooltipValue(value: number, dataKey: string): string {
  switch (dataKey) {
    case 'count':
      return formatChartNumber(value) + ' units'
    case 'total_value':
      return formatCompactValue(value)
    case 'avg_price':
    case 'min_price':
    case 'max_price':
      return formatChartPrice(value)
    default:
      return formatChartNumber(value)
  }
}

// Truncate long labels for chart axes
export function truncateLabel(label: string, maxLength: number = 15): string {
  if (label.length <= maxLength) return label
  return label.slice(0, maxLength - 2) + '...'
}
