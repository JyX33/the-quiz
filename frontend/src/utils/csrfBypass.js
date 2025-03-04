// This is a temporary production fix for CSRF issues
// Add this to your src/utils/csrfBypass.js

// Store a static token for emergency use
let emergencyToken = null;

export const getEmergencyCsrfToken = () => {
  if (!emergencyToken) {
    // Generate a pseudo-random token if none exists
    emergencyToken = 'emergency-' + Math.random().toString(36).substring(2, 15);
  }
  return emergencyToken;
};