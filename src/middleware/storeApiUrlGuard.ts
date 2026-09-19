import { createMiddleware } from 'hono/factory';
import { deriveStoreOrigin } from '#utils/store-origin';

type TApiUrlSource = { getAppSettings: () => { apiUrl: string } };

export function storeApiUrlGuard(prefsModel: TApiUrlSource) {
    return createMiddleware(async (c, next) => {
        const { apiUrl } = prefsModel.getAppSettings();
        if (!deriveStoreOrigin(apiUrl)) {
            return c.json(
                { error: true, message: 'Store API URL is not configured. Set it in Settings.' },
                409
            );
        }
        return next();
    });
}
