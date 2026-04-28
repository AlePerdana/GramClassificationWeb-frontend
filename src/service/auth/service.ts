import axios from 'axios';
import type { AppRole, AuthSession, AuthServiceConfig, AuthTokens, LoginRequest } from './types';
import { getConfig, joinUrl } from './config';
import { AuthError } from './errors';
import { decodeJwtPayload, isJwtExpired } from './jwt';
import { sessionStorage } from './storage';
import { normalizeTokens } from './tokens';

export type AuthServiceApi = {
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

export const createAuthService = (): AuthServiceApi => {
    const toHeadersObject = (headers: HeadersInit | undefined): Record<string, string> => {
        const result: Record<string, string> = {};
        const h = new Headers(headers || undefined);
        h.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    };

    const requestJson = async <T = any>(opts: {
        url: string;
        method: string;
        headers?: Record<string, string>;
        data?: any;
    }) => {
        const response = await axios.request<T>({
            url: opts.url,
            method: opts.method as any,
            headers: opts.headers,
            data: opts.data,
            validateStatus: () => true,
        });
        return response;
    };

    const service: AuthServiceApi = {
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
            const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
            if (token) headers[cfg.authHeaderName] = `${cfg.authHeaderPrefix} ${token}`;
            return headers;
        },

        async login(request: LoginRequest, config?: AuthServiceConfig): Promise<AuthSession> {
            const cfg = getConfig(config);
            const url = joinUrl(cfg.apiBaseUrl, cfg.loginPath);

            const response = await requestJson({
                url,
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                data: request,
            });

            const data: any = response.data;
            if (response.status < 200 || response.status >= 300) {
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

            const response = await requestJson({
                url,
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                data: { refresh: refreshToken },
            });

            const data: any = response.data;
            if (response.status < 200 || response.status >= 300) {
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

                    await requestJson({
                        url,
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

            const makeAxiosCall = async (token: string | null) => {
                const headers = {
                    ...toHeadersObject(init?.headers),
                } as Record<string, string>;
                if (token) headers[cfg.authHeaderName] = `${cfg.authHeaderPrefix} ${token}`;

                const method = String(init?.method || 'GET').toUpperCase();
                const data = (init as any)?.body;

                return axios.request({
                    url,
                    method,
                    headers,
                    data,
                    validateStatus: () => true,
                });
            };

            const accessToken = service.getAccessToken(cfg);
            const first = await makeAxiosCall(accessToken);
            if (first.status !== 401) {
                const body =
                    first.data instanceof Blob
                        ? first.data
                        : typeof first.data === 'string'
                            ? first.data
                            : JSON.stringify(first.data);

                return new Response(body as any, {
                    status: first.status,
                    statusText: first.statusText,
                    headers: first.headers as any,
                });
            }

            const refreshToken = service.getRefreshToken(cfg);
            if (!refreshToken) {
                const body =
                    typeof first.data === 'string' ? first.data : JSON.stringify(first.data ?? {});
                return new Response(body, { status: first.status, statusText: first.statusText, headers: first.headers as any });
            }

            try {
                const tokens = await service.refreshAccessToken(cfg);
                const second = await makeAxiosCall(tokens.accessToken);
                const body =
                    second.data instanceof Blob
                        ? second.data
                        : typeof second.data === 'string'
                            ? second.data
                            : JSON.stringify(second.data);
                return new Response(body as any, {
                    status: second.status,
                    statusText: second.statusText,
                    headers: second.headers as any,
                });
            } catch {
                service.clearSession(cfg);
                const body =
                    typeof first.data === 'string' ? first.data : JSON.stringify(first.data ?? {});
                return new Response(body, { status: first.status, statusText: first.statusText, headers: first.headers as any });
            }
        },
    };

    return service;
};
