import { Platform } from "react-native";

/**
 * Modern Academic Portal — Centralized Design System
 * 
 * Theme: University ERP / Academic Management Platform
 * Feeling: Professional, institutional, trustworthy — NOT startup/fintech/gamified.
 * 
 * Color philosophy:
 *   Primary green evokes academic nature, growth, and knowledge.
 *   Warm cream background softens the institutional feel.
 *   All colors are calibrated for WCAG AA contrast on white surfaces.
 */

// ─── 1. COLORS ────────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  background: "#FAF7F0",      // Warm cream — main screen background
  backgroundAlt: "#F3EFE4",   // Slightly darker cream — subtle variation
  surface: "#FFFFFF",         // Card / input surface

  // Brand Greens
  primary: "#2D6A4F",         // Primary green — buttons, headings, accents
  primaryDark: "#1E4D38",     // Darker shade for pressed states
  primaryLight: "#D8EDE5",    // Tinted green for subtle backgrounds (badges, highlights)
  secondary: "#3D8B6A",       // Secondary green — sub-accents

  // Borders
  border: "#D4C9A8",          // Default border — warm parchment
  borderSubtle: "#EDE8DA",    // Hairline separators inside cards

  // Text
  text: "#2C2416",            // Primary text — near-black warm
  textSecondary: "#7A6E5A",   // Secondary / metadata text
  textInverse: "#FFFFFF",     // Text on dark surfaces

  // Semantic
  success: "#2D6A4F",         // Same as primary green
  successLight: "#D8EDE5",    // Light success background
  warning: "#C17F24",         // Amber warning
  warningLight: "#FDF3E3",    // Light warning background
  error: "#B03A2E",           // Error red
  errorLight: "#FDECEA",      // Light error background
  info: "#2A5F8B",            // Informational blue
  infoLight: "#E8F1F9",       // Light info background

  // Decorative
  headerOverlay: "rgba(45, 106, 79, 0.92)", // Translucent green for hero sections
};

// ─── 2. TYPOGRAPHY ────────────────────────────────────────────────────────────
export const FONTS = {
  heading: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }),
  body: "System",             // Resolves to San Francisco (iOS) / Roboto (Android)
};

export const TYPOGRAPHY = {
  // Font families (backward-compat with existing screens)
  heading: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    color: COLORS.text,
  },
  body: {
    fontFamily: FONTS.body,
    color: COLORS.text,
  },

  // Font size scale
  sizes: {
    screenTitle: 24,     // Screen / page title
    sectionTitle: 18,    // Section headers within a screen
    cardMetric: 28,      // Large high-impact numbers on stat cards
    cardMetricSm: 20,    // Smaller stat number on narrow cards
    body: 14,            // Standard body copy
    bodyLg: 15,          // Slightly larger body (detail screens)
    label: 13,           // Form labels, card labels
    metadata: 12,        // Timestamps, secondary metadata
    micro: 11,           // Badge text, pills
  },

  // Font weight aliases
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
};

// ─── 3. SPACING ───────────────────────────────────────────────────────────────
export const SPACING = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 28,         // Gap between major sections
};

// ─── 4. RADIUS ────────────────────────────────────────────────────────────────
export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 10,              // Inputs, standard buttons
  lg: 14,              // Card radius
  xl: 16,              // Modals, bottom sheets
  xxl: 20,             // Status pills
  full: 9999,          // Fully round avatar (Radius = Infinity)
};

// ─── 5. SHADOWS ───────────────────────────────────────────────────────────────
export const SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  xs: {
    shadowColor: "#2C2416",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: "#2C2416",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#2C2416",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#2C2416",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

// ─── 6. BADGES ────────────────────────────────────────────────────────────────
export const BADGES = {
  success: {
    backgroundColor: COLORS.successLight,
    color: COLORS.success,
    borderColor: "rgba(45, 106, 79, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  danger: {
    backgroundColor: COLORS.errorLight,
    color: COLORS.error,
    borderColor: "rgba(176, 58, 46, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warning: {
    backgroundColor: COLORS.warningLight,
    color: COLORS.warning,
    borderColor: "rgba(193, 127, 36, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  info: {
    backgroundColor: COLORS.infoLight,
    color: COLORS.info,
    borderColor: "rgba(42, 95, 139, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  neutral: {
    backgroundColor: "#EDECE8",
    color: COLORS.textSecondary,
    borderColor: "rgba(122, 110, 90, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
};

// ─── 7. BUTTON_VARIANTS ───────────────────────────────────────────────────────
export const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: "row",
    gap: 8,
  },
  danger: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: "transparent",
    borderRadius: RADIUS.md,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 8,
  },
};

// ─── BACKWARD COMPATIBILITY LAYOUT & STYLE MAPPINGS ───────────────────────────
export const LAYOUT = {
  cardRadius: RADIUS.lg,
  inputRadius: RADIUS.md,
  buttonRadius: RADIUS.md,
  chipRadius: RADIUS.xxl,
  modalRadius: RADIUS.xl,
  avatarRadius: RADIUS.full,
  buttonHeight: 50,
  inputHeight: 52,
  tabBarHeight: 64,
  spacing: SPACING,
  screenPadding: 20,
  cardPadding: 18,
  cardGap: 16,
  sectionGap: 24,
};

export const COMPONENT_STYLES = {
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    ...SHADOWS.sm,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    alignItems: "center",
    ...SHADOWS.xs,
  },
  primaryButton: BUTTON_VARIANTS.primary,
  secondaryButton: BUTTON_VARIANTS.secondary,
  dangerButton: BUTTON_VARIANTS.danger,
  screenHeader: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 20,
    paddingBottom: 16,
  },
};

export const STATUS = {
  present: {
    label: "Present",
    color: COLORS.success,
    backgroundColor: COLORS.successLight,
    iconName: "CheckCircle",
  },
  absent: {
    label: "Absent",
    color: COLORS.error,
    backgroundColor: COLORS.errorLight,
    iconName: "XCircle",
  },
  late: {
    label: "Late",
    color: COLORS.warning,
    backgroundColor: COLORS.warningLight,
    iconName: "Clock",
  },
  active: {
    label: "Active",
    color: COLORS.success,
    backgroundColor: COLORS.successLight,
    iconName: "CheckCircle",
  },
  inactive: {
    label: "Inactive",
    color: COLORS.textSecondary,
    backgroundColor: "#EDECE8",
    iconName: "XCircle",
  },
  archived: {
    label: "Archived",
    color: COLORS.warning,
    backgroundColor: COLORS.warningLight,
    iconName: "Archive",
  },
};

export function getStatusStyle(status) {
  return STATUS[status?.toLowerCase()] || STATUS.inactive;
}

export const NAVIGATOR_STYLE = {
  headerStyle: {
    backgroundColor: COLORS.primary,
  },
  headerTintColor: COLORS.textInverse,
  headerTitleStyle: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    fontSize: 17,
  },
  headerTitleAlign: "center",
  contentStyle: {
    backgroundColor: COLORS.background,
  },
};
