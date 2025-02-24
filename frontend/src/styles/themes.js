const baseTheme = {
  // Common properties
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  
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
  },
  text: {
    primary: '#2c3e50',
    secondary: '#546e7a',
    accent: '#0070dd',
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
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0bec5',
    accent: '#d4af37',
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
