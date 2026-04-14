import type { AppRole, AuthSession, AuthServiceConfig, AuthTokens, LoginRequest } from './types';
import { getConfig, joinUrl } from './config';
import { AuthError } from './errors';
import { readJsonSafely } from './http';
import { decodeJwtPayload, isJwtExpired } from './jwt';
import { sessionStorage } from './storage';
import { normalizeTokens } from './tokens';

export type AuthService = {
    getApiBaseUrl(config?: AuthServiceConfig): string;

    getAccessToken(config?: AuthServiceConfig): string | null;
    getRefreshToken(config?: AuthServiceConfig): string | null;
    getUser(config?: AuthServiceConfig): AuthSession['user'] | null;

    setSession(session: AuthSession, config?: AuthServiceConfig): void;
    clearSession(config?: AuthServiceConfig): void;

    isLoggedIn(config?: AuthServiceConfig): boolean;
    getClaims(config?: AuthServiceConfig): Record<string, unknown> | null;
    getRole(config?: AuthServiceConfig): AppRole | null;

    getAuthorizationHeader(config?: AuthServiceConfig): Record<string, string>;

    login(request: LoginRequest, config?: AuthServiceConfig): Promise<AuthSession>;
    refreshAccessToken(config?: AuthServiceConfig): Promise<AuthTokens>;
    logout(config?: AuthServiceConfig): Promise<void>;

    authFetch(input: string, init?: RequestInit, config?: AuthServiceConfig): Promise<Response>;
};

const normalizeRole = (value: unknown): AppRole | null => {
    const v = String(value ?? '').trim().toLowerCase();
    if (!v) return null;
    if (v.includes('admin') || v.includes('super')) return 'admin';
    if (v.includes('dokter') || v.includes('doctor') || v.includes('physician')) return 'dokter';
    if (v.includes('analis') || v.includes('analyst')) return 'analis';
    return null;
};

export const createAuthService = (): AuthService => {
    const service: AuthService = {
        getApiBaseUrl(config?: AuthServiceConfig) {
            return getConfig(config).apiBaseUrl;
        },

        getAccessToken(config?: AuthServiceConfig) {
            return sessionStorage.getAccessToken(config);
        },

        getRefreshToken(config?: AuthServiceConfig) {
            return sessionStorage.getRefreshToken(config);
        },

        getUser(config?: AuthServiceConfig) {
            return sessionStorage.getUser(config);
        },

        setSession(session: AuthSession, config?: AuthServiceConfig) {
            sessionStorage.setSession(session, config);
        },

        clearSession(config?: AuthServiceConfig) {
            sessionStorage.clearSession(config);
        },

        isLoggedIn(config?: AuthServiceConfig) {
            const token = service.getAccessToken(config);
            if (!token) return false;
            return !isJwtExpired(token);
        },

        getClaims(config?: AuthServiceConfig) {
            const token = service.getAccessToken(config);
            if (!token) return null;
            return decodeJwtPayload(token);
        },

        getRole(config?: AuthServiceConfig): AppRole | null {
            const user = service.getUser(config);
            const fromUser =
                normalizeRole(user?.role) ||
                normalizeRole((user as any)?.user_role) ||
                normalizeRole((user as any)?.userType) ||
                normalizeRole((user as any)?.user_type) ||
                normalizeRole((user as any)?.type);
            if (fromUser) return fromUser;

            if ((user as any)?.is_superuser === true || (user as any)?.is_staff === true) return 'admin';

            const claims = service.getClaims(config);
            const fromClaims =
                normalizeRole(claims?.role) ||
                normalizeRole((claims as any)?.user_role) ||
                normalizeRole((claims as any)?.user_type) ||
                normalizeRole((claims as any)?.type);
            if (fromClaims) return fromClaims;

            const groups = (claims as any)?.groups;
            if (Array.isArray(groups)) {
                for (const g of groups) {
                    const mapped = normalizeRole(g);
                    if (mapped) return mapped;
                }
            }

            if ((claims as any)?.is_superuser === true || (claims as any)?.is_staff === true) return 'admin';
            return null;
        },

        getAuthorizationHeader(config?: AuthServiceConfig) {
            const cfg = getConfig(config);
            const token = service.getAccessToken(cfg);
            if (!token) return {};
            return { [cfg.authHeaderName]: `${cfg.authHeaderPrefix} ${token}` };
        },

        async login(request: LoginRequest, config?: AuthServiceConfig): Promise<AuthSession> {
            const cfg = getConfig(config);
            const url = joinUrl(cfg.apiBaseUrl, cfg.loginPath);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data = await readJsonSafely(response);
            if (!response.ok) {
                const message = (data && (data.detail || data.message)) || `Login gagal (HTTP ${response.status})`;
                throw new AuthError(String(message), { status: response.status, details: data });
            }

            const tokens = normalizeTokens(data);
            if (!tokens) {
                throw new AuthError('Response login tidak mengandung token yang dikenali.', {
                    status: response.status,
                    details: data,
                });
            }

            const user = (data?.user ?? data?.data?.user ?? undefined) as AuthSession['user'] | undefined;
            const session: AuthSession = { tokens, ...(user ? { user } : {}) };
            service.setSession(session, cfg);
            return session;
        },

        async refreshAccessToken(config?: AuthServiceConfig): Promise<AuthTokens> {
            const cfg = getConfig(config);
            const refreshToken = service.getRefreshToken(cfg);
            if (!refreshToken) {
                throw new AuthError('Tidak ada refresh token. Silakan login ulang.');
            }

            const url = joinUrl(cfg.apiBaseUrl, cfg.refreshPath);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            const data = await readJsonSafely(response);
            if (!response.ok) {
                const message =
                    (data && (data.detail || data.message)) ||
                    `Refresh token gagal (HTTP ${response.status})`;
                throw new AuthError(String(message), { status: response.status, details: data });
            }

            const tokens = normalizeTokens(data);
            if (!tokens) {
                throw new AuthError('Response refresh tidak mengandung token yang dikenali.', {
                    status: response.status,
                    details: data,
                });
            }

            // SimpleJWT biasanya hanya mengembalikan access baru
            const merged: AuthTokens = {
                accessToken: tokens.accessToken,
                refreshToken: service.getRefreshToken(cfg) ?? tokens.refreshToken,
            };

            service.setSession({ tokens: merged, user: service.getUser(cfg) ?? undefined }, cfg);
            return merged;
        },

        async logout(config?: AuthServiceConfig): Promise<void> {
            const cfg = getConfig(config);

            try {
                if (cfg.logoutPath) {
                    const url = joinUrl(cfg.apiBaseUrl, cfg.logoutPath);
                    await fetch(url, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            ...service.getAuthorizationHeader(cfg),
                        },
                    });
                }
            } finally {
                service.clearSession(cfg);
            }
        },

        async authFetch(input: string, init?: RequestInit, config?: AuthServiceConfig): Promise<Response> {
            const cfg = getConfig(config);
            const url = joinUrl(cfg.apiBaseUrl, input);

            const withAuth = (token: string | null): RequestInit => {
                const headers = new Headers(init?.headers || {});
                if (token) headers.set(cfg.authHeaderName, `${cfg.authHeaderPrefix} ${token}`);
                return { ...init, headers };
            };

            const accessToken = service.getAccessToken(cfg);
            const firstResponse = await fetch(url, withAuth(accessToken));
            if (firstResponse.status !== 401) return firstResponse;

            const refreshToken = service.getRefreshToken(cfg);
            if (!refreshToken) return firstResponse;

            try {
                const tokens = await service.refreshAccessToken(cfg);
                return fetch(url, withAuth(tokens.accessToken));
            } catch {
                service.clearSession(cfg);
                return firstResponse;
            }
        },
    };

    return service;
};
