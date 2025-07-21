class TokenBlacklist {
    constructor() {
        this.blacklistedTokens = new Set();
        // Clean up expired tokens every hour
        setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
    }

    addToken(token) {
        this.blacklistedTokens.add(token);
    }

    isBlacklisted(token) {
        return this.blacklistedTokens.has(token);
    }

    cleanupExpiredTokens() {
        // This is a simple cleanup - in production, you'd want to decode tokens
        // and remove only expired ones, or use Redis with TTL
        const now = Math.floor(Date.now() / 1000);
        // For now, we'll keep it simple and rely on token expiration
    }
}

export const tokenBlacklist = new TokenBlacklist();