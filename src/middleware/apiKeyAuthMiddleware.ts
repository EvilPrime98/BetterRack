import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'crypto';

const HEADER_NAME = 'x-br-api-key';
const QUERY_PARAM_NAME = 'key';

function keysMatch(provided: string, required: string): boolean {
    const providedBuf = Buffer.from(provided);
    const requiredBuf = Buffer.from(required);
    if (providedBuf.length !== requiredBuf.length) return false;
    return timingSafeEqual(providedBuf, requiredBuf);
}

/**
 * Guard a route with BR_API_KEY when the operator sets it.
 * Accept the key from the x-br-api-key header, used by fetch calls.
 * Accept the key from the `key` query parameter, used by <img src> and EventSource URLs,
 * which cannot carry a custom header.
 * If BR_API_KEY is not set, the route stays open. This matches the current LAN-trust default.
 */
export function apiKeyAuth() {
    const requiredKey = process.env.BR_API_KEY;

    return createMiddleware(async (c, next) => {
        if (!requiredKey) return next();

        const providedKey = c.req.header(HEADER_NAME) ?? c.req.query(QUERY_PARAM_NAME);
        if (providedKey && keysMatch(providedKey, requiredKey)) return next();

        return c.text('Unauthorized', 401);
    });
}
