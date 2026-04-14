export class AuthError extends Error {
    status?: number;
    details?: unknown;

    constructor(message: string, opts?: { status?: number; details?: unknown }) {
        super(message);
        this.name = 'AuthError';
        this.status = opts?.status;
        this.details = opts?.details;
    }
}
