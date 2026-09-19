export const deriveStoreOrigin = (
    apiUrl: string
): string => {
    try {
        return new URL(apiUrl.trim()).origin;
    } catch {
        return '';
    }
};
