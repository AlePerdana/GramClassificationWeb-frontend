import { createAuthService } from './service';

export type { AuthService } from './service';

export type { AuthTokens, AuthUser, AuthSession, LoginRequest, AuthServiceConfig } from './types';
export type { AppRole } from './types';
export { AuthError } from './errors';

// Default singleton instance (mirrors old `authService.ts` behavior)
export const authService = createAuthService();
export default authService;
