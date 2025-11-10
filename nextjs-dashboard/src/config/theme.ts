/**
 * Theme Configuration System
 *
 * This file defines the branding and theming for the owner dashboard.
 * Each owner can have their own customized theme while maintaining
 * the same layout and functionality.
 */

export interface ThemeConfig {
  // Branding
  brandName: string;
  brandSubtitle: string;
  logoUrl?: string;
  faviconUrl?: string;

  // Colors
  colors: {
    primary: string;        // Main brand color
    primaryDark: string;    // Darker shade for hover states
    primaryLight: string;   // Lighter shade for backgrounds
    accent: string;         // Accent color
    background: string;     // Main background
    surface: string;        // Card/surface background
    text: string;           // Primary text
    textSecondary: string;  // Secondary text
  };

  // UI Customization
  ui: {
    sidebarStyle: 'dark' | 'light' | 'branded';
    borderRadius: 'sharp' | 'rounded' | 'pill';
    showLogo: boolean;
    showCompanyName: boolean;
  };

  // Features
  features: {
    hvacMaintenance: boolean;
    photoAnalysis: boolean;
    reportFiltering: boolean;
    notifications: boolean;
  };

  // Contact
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

/**
 * Default Theme - CheckMyRental Master Template
 */
export const defaultTheme: ThemeConfig = {
  brandName: 'CheckMyRental',
  brandSubtitle: 'Owner Portal',

  colors: {
    primary: '#3b82f6',      // rgb(59, 130, 246) - Professional blue
    primaryDark: '#2563eb',  // rgb(37, 99, 235) - Darker blue
    primaryLight: 'rgba(59,130,246,0.1)', // Light blue background
    accent: '#8b5cf6',       // Purple-500 - Accent color
    background: 'rgb(10,10,10)',
    surface: 'rgba(255,255,255,0.05)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
  },

  ui: {
    sidebarStyle: 'dark',
    borderRadius: 'rounded',
    showLogo: true,
    showCompanyName: true,
  },

  features: {
    hvacMaintenance: true,
    photoAnalysis: true,
    reportFiltering: true,
    notifications: true,
  },

  contact: {
    email: 'support@checkmyrental.com',
  },
};

/**
 * Example Custom Theme - ABC Property Management
 */
export const exampleCustomTheme: ThemeConfig = {
  brandName: 'ABC Properties',
  brandSubtitle: 'Inspection Dashboard',

  colors: {
    primary: '#10b981',      // Green-500
    primaryDark: '#059669',  // Green-600
    primaryLight: '#d1fae5', // Green-100
    accent: '#8b5cf6',       // Purple-500
    background: 'rgb(10,10,10)',
    surface: 'rgba(255,255,255,0.05)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
  },

  ui: {
    sidebarStyle: 'dark',
    borderRadius: 'rounded',
    showLogo: true,
    showCompanyName: true,
  },

  features: {
    hvacMaintenance: true,
    photoAnalysis: true,
    reportFiltering: true,
    notifications: false,
  },
};

/**
 * Theme presets that owners can choose from
 */
export const themePresets = {
  default: defaultTheme,
  green: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#d1fae5',
    },
  },
  blue: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      primaryLight: '#dbeafe',
    },
  },
  purple: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      primaryLight: '#ede9fe',
    },
  },
  orange: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fed7aa',
    },
  },
};

/**
 * Get theme for a specific owner
 * In production, this would fetch from backend API
 */
export async function getOwnerTheme(ownerId?: string): Promise<ThemeConfig> {
  // TODO: Fetch from backend API
  // const response = await fetch(`/api/owners/${ownerId}/theme`);
  // return response.json();

  // For now, return default theme
  return defaultTheme;
}

/**
 * Apply theme to CSS variables
 */
export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;

  // Apply color variables
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-primary-dark', theme.colors.primaryDark);
  root.style.setProperty('--color-primary-light', theme.colors.primaryLight);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-surface', theme.colors.surface);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);

  // Apply border radius
  const radiusMap = {
    sharp: '0px',
    rounded: '0.5rem',
    pill: '1rem',
  };
  root.style.setProperty('--border-radius', radiusMap[theme.ui.borderRadius]);
}
