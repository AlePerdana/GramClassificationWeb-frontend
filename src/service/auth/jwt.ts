export const decodeJwtPayload = (jwt: string): Record<string, unknown> | null => {
    const parts = String(jwt || '').split('.');
    if (parts.length !== 3) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
};

export const getJwtExpiryMs = (jwt: string): number | null => {
    const payload = decodeJwtPayload(jwt);
    const exp = payload?.exp;
    if (typeof exp !== 'number') return null;
    return exp * 1000;
};

export const isJwtExpired = (jwt: string, skewMs = 30_000): boolean => {
    const expMs = getJwtExpiryMs(jwt);
    if (!expMs) return false;
    return Date.now() + skewMs >= expMs;
};
