import type { AuthTokens } from './types';

export const normalizeTokens = (payload: any): AuthTokens | null => {
    if (!payload) return null;

    // Django SimpleJWT: { access, refresh }
    const access = payload.access ?? payload.access_token ?? payload.token ?? payload.jwt;
    const refresh = payload.refresh ?? payload.refresh_token;

    if (typeof access === 'string' && access.length > 0) {
        return {
            accessToken: access,
            ...(typeof refresh === 'string' && refresh.length > 0 ? { refreshToken: refresh } : {}),
        };
    }
    return null;
};
