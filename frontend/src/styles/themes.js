const baseTheme = {
  // Common properties
  borderRadius: '8px',
  transition: 'all 0.3s ease',
  
  // Shadows
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 8px 16px rgba(0, 0, 0, 0.1)'
  },
  
  // Spacing scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    heading: {
      weight: 600,
      lineHeight: 1.2,
    },
    body: {
      weight: 400,
      lineHeight: 1.5,
    },
  },
  
  // Animations
  animation: {
    buttonHover: 'transform 0.2s ease, box-shadow 0.2s ease',
    pageTransition: 'opacity 0.3s ease, transform 0.3s ease',
    modalTransition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const allianceTheme = {
  ...baseTheme,
  primary: '#0070dd',
  secondary: '#ffd700',
  accent: '#ffffff',
  background: {
    main: '#f8f9fa',
    paper: '#ffffff',
    accent: '#e3f2fd',
    primary: '#ffffff',
    secondary: '#f8f9fa',
    error: '#ffebee',
    info: '#e3f2fd',
    success: '#e8f5e9',
    default: '#f5f5f5'
  },
  text: {
    primary: '#2c3e50',
    secondary: '#546e7a',
    accent: '#0070dd',
    highlight: '#0070dd',
    info: '#0288d1',
    success: '#388e3c',
    default: '#757575'
  },
  border: {
    light: '#e0e0e0',
    medium: '#bdbdbd',
    dark: '#9e9e9e'
  },
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  input: {
    background: '#ffffff',
    border: '#e0e0e0',
    focusBorder: '#0070dd',
    placeholder: '#90a4ae',
  },
  button: {
    hoverBg: '#0063c4',
    activeBg: '#005bb7',
  },
};

export const hordeTheme = {
  ...baseTheme,
  primary: '#8b0000',
  secondary: '#2c1810',
  accent: '#d4af37',
  background: {
    main: '#1a1a1a',
    paper: '#242424',
    accent: '#2c1810',
    primary: '#242424',
    secondary: '#1a1a1a',
    error: '#311b1b',
    info: '#1a2a38',
    success: '#1b2e1e',
    default: '#121212'
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0bec5',
    accent: '#d4af37',
    highlight: '#d4af37',
    info: '#64b5f6',
    success: '#81c784',
    default: '#9e9e9e'
  },
  border: {
    light: '#424242',
    medium: '#616161',
    dark: '#757575'
  },
  success: '#43a047',
  error: '#d32f2f',
  warning: '#f57c00',
  input: {
    background: '#242424',
    border: '#424242',
    focusBorder: '#d4af37',
    placeholder: '#757575',
  },
  button: {
    hoverBg: '#a00000',
    activeBg: '#b71c1c',
  },
};
