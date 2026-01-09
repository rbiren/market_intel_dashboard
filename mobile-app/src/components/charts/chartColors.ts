// Color palette for RV types
export const RV_TYPE_COLORS: Record<string, string> = {
  'TRAVEL TRAILER': '#3B82F6',   // blue-500
  'FIFTH WHEEL': '#8B5CF6',      // violet-500
  'CLASS C': '#10B981',          // emerald-500
  'CLASS A': '#F59E0B',          // amber-500
  'CLASS B': '#EF4444',          // red-500
  'OTHER': '#6B7280',            // gray-500
  'CAMPING TRAILER': '#14B8A6',  // teal-500
  'PARK MODEL': '#EC4899',       // pink-500
}

// Condition colors
export const CONDITION_COLORS: Record<string, string> = {
  'NEW': '#22C55E',    // green-500
  'USED': '#F97316',   // orange-500
}

// Sequential palette for bar charts (blue gradient)
export const SEQUENTIAL_COLORS = [
  '#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA',
  '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#F8FAFC'
]

// State colors (geographic - warm to cool)
export const STATE_COLORS = [
  '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E',
  '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#EF4444'
]

// Get color for RV type with fallback
export function getRvTypeColor(rvType: string, index: number = 0): string {
  return RV_TYPE_COLORS[rvType] || SEQUENTIAL_COLORS[index % SEQUENTIAL_COLORS.length]
}

// Get color for condition
export function getConditionColor(condition: string): string {
  return CONDITION_COLORS[condition] || '#6B7280'
}
