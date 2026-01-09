/**
 * Thor Industries Brand Style Guide
 *
 * Based on thorindustries.com design system
 *
 * Design Philosophy: Outdoor adventure brand with earthy palette,
 * modern minimalism, and accessibility-focused hierarchy.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const THOR_COLORS = {
  // Primary Colors
  primary: {
    charcoal: '#181817',      // Primary background, text
    offWhite: '#fffdfa',      // Contrast text, light backgrounds
    black: '#000000',         // Footer, high contrast
  },

  // Secondary/Accent Colors
  accent: {
    sage: '#495737',          // Primary accent buttons
    gold: '#a46807',          // Action buttons, accent elements
    steelBlue: '#577d91',     // Secondary/info buttons
  },

  // Neutral Colors
  neutral: {
    lightBeige: '#f7f4f0',    // Background sections
    mediumGray: '#8c8a7e',    // Muted text
    borderGray: '#d9d6cf',    // Dividers, borders
    warmGray: '#595755',      // Secondary text
    darkCard: '#2a2928',      // Dark button backgrounds
  },

  // Semantic Colors (using Thor palette)
  semantic: {
    success: '#495737',       // Sage green for success states
    warning: '#a46807',       // Gold for warnings
    info: '#577d91',          // Steel blue for info
    error: '#8b4049',         // Muted red (complementary to palette)
  },

  // Chart-specific colors (Thor-inspired gradient)
  chart: [
    '#495737',  // Sage
    '#a46807',  // Gold
    '#577d91',  // Steel Blue
    '#8c8a7e',  // Medium Gray
    '#6b7a5e',  // Darker Sage
    '#c4850d',  // Lighter Gold
    '#4a6673',  // Darker Steel Blue
    '#181817',  // Charcoal
  ],

  // RV Type specific colors (Thor-branded)
  rvTypes: {
    'TRAVEL TRAILER': { main: '#495737', glow: 'rgba(73, 87, 55, 0.5)' },
    'FIFTH WHEEL': { main: '#a46807', glow: 'rgba(164, 104, 7, 0.5)' },
    'CLASS C': { main: '#577d91', glow: 'rgba(87, 125, 145, 0.5)' },
    'CLASS A': { main: '#8c8a7e', glow: 'rgba(140, 138, 126, 0.5)' },
    'CLASS B': { main: '#6b7a5e', glow: 'rgba(107, 122, 94, 0.5)' },
    'OTHER': { main: '#595755', glow: 'rgba(89, 87, 85, 0.5)' },
    'CAMPING TRAILER': { main: '#c4850d', glow: 'rgba(196, 133, 13, 0.5)' },
    'PARK MODEL': { main: '#4a6673', glow: 'rgba(74, 102, 115, 0.5)' },
  },
} as const

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const THOR_TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    heading: "'Montserrat', sans-serif",
    body: "'Open Sans', sans-serif",
    display: "'PalmCanyonDrive', cursive", // Specialty use only
  },

  // Font Weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extraBold: 800,
  },

  // Font Sizes (rem)
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// =============================================================================
// SPACING & LAYOUT
// =============================================================================

export const THOR_SPACING = {
  // Component Padding
  padding: {
    mobile: '3rem',
    tablet: '4rem',
    desktop: '6rem',
  },

  // Border Radius
  borderRadius: {
    sm: '0.375rem',     // 6px
    md: '0.5rem',       // 8px
    lg: '0.75rem',      // 12px
    xl: '1rem',         // 16px
    '2xl': '1.5rem',    // 24px
    full: '9999px',
  },

  // Gaps
  gap: {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
} as const

// =============================================================================
// EFFECTS & TRANSITIONS
// =============================================================================

export const THOR_EFFECTS = {
  // Box Shadows
  shadow: {
    sm: '0 1px 2px rgba(24, 24, 23, 0.05)',
    md: '0 4px 6px -1px rgba(24, 24, 23, 0.1)',
    lg: '0 10px 15px -3px rgba(24, 24, 23, 0.1)',
    xl: '0 20px 25px -5px rgba(24, 24, 23, 0.1)',
  },

  // Transitions
  transition: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  // Gradient Overlays
  gradients: {
    masthead: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 35%, transparent)',
    cardHover: 'linear-gradient(135deg, rgba(73, 87, 55, 0.1) 0%, transparent 100%)',
    accentLine: 'linear-gradient(90deg, #495737, #a46807, #577d91)',
  },
} as const

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const THOR_COMPONENTS = {
  // Button Styles
  button: {
    primary: {
      background: THOR_COLORS.neutral.darkCard,
      color: THOR_COLORS.primary.offWhite,
      hover: THOR_COLORS.primary.charcoal,
    },
    sage: {
      background: THOR_COLORS.accent.sage,
      color: THOR_COLORS.primary.offWhite,
      hover: '#3d4a2e',
    },
    gold: {
      background: THOR_COLORS.accent.gold,
      color: THOR_COLORS.primary.offWhite,
      hover: '#8a5806',
    },
    steelBlue: {
      background: THOR_COLORS.accent.steelBlue,
      color: THOR_COLORS.primary.offWhite,
      hover: '#4a6b7c',
    },
    transparent: {
      background: 'transparent',
      color: THOR_COLORS.primary.charcoal,
      border: THOR_COLORS.neutral.borderGray,
    },
  },

  // Card Styles
  card: {
    background: THOR_COLORS.primary.offWhite,
    border: `1px solid ${THOR_COLORS.neutral.borderGray}`,
    borderRadius: THOR_SPACING.borderRadius.lg,
    shadow: THOR_EFFECTS.shadow.sm,
  },

  // Input Styles
  input: {
    background: THOR_COLORS.primary.offWhite,
    border: THOR_COLORS.neutral.borderGray,
    focus: THOR_COLORS.accent.sage,
    placeholder: THOR_COLORS.neutral.mediumGray,
  },
} as const

// =============================================================================
// DARK MODE VARIANT (Premium Analytics)
// =============================================================================

export const THOR_DARK = {
  // Background shades
  bgDark: '#181817',
  bgCard: '#232322',
  bgHover: '#2d2d2b',

  // Text
  textPrimary: THOR_COLORS.primary.offWhite,
  textSecondary: THOR_COLORS.neutral.mediumGray,
  textMuted: THOR_COLORS.neutral.warmGray,

  // Borders
  border: 'rgba(217, 214, 207, 0.15)',
  borderLight: 'rgba(217, 214, 207, 0.25)',

  // Glow effects
  glow: {
    sage: 'rgba(73, 87, 55, 0.4)',
    gold: 'rgba(164, 104, 7, 0.4)',
    steelBlue: 'rgba(87, 125, 145, 0.4)',
  },
} as const

// =============================================================================
// CHART THEMING
// =============================================================================

export const THOR_CHART_THEME = {
  // Tooltip styling
  tooltip: {
    background: 'rgba(24, 24, 23, 0.95)',
    border: THOR_COLORS.neutral.borderGray,
    borderRadius: THOR_SPACING.borderRadius.lg,
    textColor: THOR_COLORS.primary.offWhite,
    labelColor: THOR_COLORS.neutral.mediumGray,
  },

  // Axis styling
  axis: {
    lineColor: THOR_COLORS.neutral.borderGray,
    labelColor: THOR_COLORS.neutral.warmGray,
    splitLineColor: 'rgba(217, 214, 207, 0.3)',
  },

  // Legend styling
  legend: {
    textColor: THOR_COLORS.neutral.warmGray,
    itemSize: 12,
  },
} as const

// =============================================================================
// CSS CUSTOM PROPERTIES (for use in CSS/Tailwind)
// =============================================================================

export const CSS_VARIABLES = `
  :root {
    /* Primary */
    --thor-charcoal: #181817;
    --thor-off-white: #fffdfa;
    --thor-black: #000000;

    /* Accent */
    --thor-sage: #495737;
    --thor-gold: #a46807;
    --thor-steel-blue: #577d91;

    /* Neutral */
    --thor-light-beige: #f7f4f0;
    --thor-medium-gray: #8c8a7e;
    --thor-border-gray: #d9d6cf;
    --thor-warm-gray: #595755;
    --thor-dark-card: #2a2928;

    /* Typography */
    --font-heading: 'Montserrat', sans-serif;
    --font-body: 'Open Sans', sans-serif;

    /* Spacing */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
  }
`

// Export default theme object
export const THOR_THEME = {
  colors: THOR_COLORS,
  typography: THOR_TYPOGRAPHY,
  spacing: THOR_SPACING,
  effects: THOR_EFFECTS,
  components: THOR_COMPONENTS,
  dark: THOR_DARK,
  chart: THOR_CHART_THEME,
} as const

export default THOR_THEME
