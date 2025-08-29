// Configuration to choose between Replit Auth and Local Auth
export const isLocalDevelopment = !process.env.REPLIT_DOMAINS || process.env.NODE_ENV === 'development';

// Import and re-export the appropriate auth module
let authModule;

if (isLocalDevelopment) {
  authModule = await import('./localAuth');
} else {
  authModule = await import('./replitAuth');
}

export const { setupAuth, isAuthenticated, getSession } = authModule;