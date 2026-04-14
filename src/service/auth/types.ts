export type AuthTokens = {
    accessToken: string;
    refreshToken?: string;
};

export type AppRole = 'admin' | 'dokter' | 'analis';

export type AuthUser = {
    id?: string | number;
    username?: string;
    role?: string;
    [key: string]: unknown;
};

export type AuthSession = {
    tokens: AuthTokens;
    user?: AuthUser;
};

export type LoginRequest = {
    username: string;
    password: string;
};

export type AuthServiceConfig = {
    /**
     * Base URL untuk API (tanpa trailing slash).
     * Default: `VITE_API_BASE_URL` atau `http://localhost:8000/api`
     */
    apiBaseUrl?: string;
    /**
     * Endpoint login relatif terhadap apiBaseUrl.
     * Default cocok untuk Django SimpleJWT: `/token/`
     */
    loginPath?: string;
    /**
     * Endpoint refresh token relatif terhadap apiBaseUrl.
     * Default: `/token/refresh/`
     */
    refreshPath?: string;
    /**
     * Endpoint logout relatif terhadap apiBaseUrl (opsional).
     * Kalau tidak disediakan, logout hanya clear session di client.
     */
    logoutPath?: string;
    /**
     * Nama header Authorization.
     * Default: `Authorization`
     */
    authHeaderName?: string;
    /**
     * Prefix token untuk header Authorization.
     * Default: `Bearer`
     */
    authHeaderPrefix?: string;
    /**
     * Storage key prefix.
     * Default: `auth.`
     */
    storageKeyPrefix?: string;
};
