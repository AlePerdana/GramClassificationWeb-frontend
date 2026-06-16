import { sessionStorage } from './storage';

/**
 * Handle 401/unauthorized response from non-React service code.
 * Clears session and forces a full-page redirect to login.
 */
export const handleUnauthorized = (): void => {
    sessionStorage.clearSession();
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};
