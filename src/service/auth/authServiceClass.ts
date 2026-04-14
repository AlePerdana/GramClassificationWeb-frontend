import type { AuthSession, AuthServiceConfig, AuthTokens, LoginRequest } from './types';
import type { AuthServiceApi } from './service';
import { createAuthService } from './service';

/**
 * Class-style auth service (mirip pola `ModelService`).
 *
 * Catatan:
 * - Metode-metodenya delegate ke implementasi modular `createAuthService()`.
 * - Session/token tetap disimpan di localStorage (global), sehingga instance baru pun tetap "melihat" session yang sama.
 */
export class AuthService {
    private readonly api: AuthServiceApi;

    constructor(api?: AuthServiceApi) {
        this.api = api ?? createAuthService();
    }

    getApiBaseUrl(config?: AuthServiceConfig) {
        return this.api.getApiBaseUrl(config);
    }

    getAccessToken(config?: AuthServiceConfig) {
        return this.api.getAccessToken(config);
    }

    getRefreshToken(config?: AuthServiceConfig) {
        return this.api.getRefreshToken(config);
    }

    getUser(config?: AuthServiceConfig) {
        return this.api.getUser(config);
    }

    setSession(session: AuthSession, config?: AuthServiceConfig) {
        return this.api.setSession(session, config);
    }

    clearSession(config?: AuthServiceConfig) {
        return this.api.clearSession(config);
    }

    isLoggedIn(config?: AuthServiceConfig) {
        return this.api.isLoggedIn(config);
    }

    getClaims(config?: AuthServiceConfig) {
        return this.api.getClaims(config);
    }

    getRole(config?: AuthServiceConfig) {
        return this.api.getRole(config);
    }

    getAuthorizationHeader(config?: AuthServiceConfig) {
        return this.api.getAuthorizationHeader(config);
    }

    login(request: LoginRequest, config?: AuthServiceConfig): Promise<AuthSession> {
        return this.api.login(request, config);
    }

    refreshAccessToken(config?: AuthServiceConfig): Promise<AuthTokens> {
        return this.api.refreshAccessToken(config);
    }

    logout(config?: AuthServiceConfig): Promise<void> {
        return this.api.logout(config);
    }

    authFetch(input: string, init?: RequestInit, config?: AuthServiceConfig): Promise<Response> {
        return this.api.authFetch(input, init, config);
    }
}
