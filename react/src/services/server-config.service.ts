import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = 'br_server_url';

export function isAndroidPlatform(): boolean {
    return Capacitor.getPlatform() === 'android';
}

export function hasNativeFolderPicker(): boolean {
    return typeof window.desktop?.pickLibraryFolder === 'function';
}

export function getStoredServerUrl(): string {
    return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function needsServerSetup(): boolean {
    return isAndroidPlatform() && !getStoredServerUrl();
}

function normalizeServerUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
    return url.replace(/\/+$/, '');
}

export function setServerUrl(rawUrl: string): void {
    const normalized = normalizeServerUrl(rawUrl);
    localStorage.setItem(STORAGE_KEY, normalized);
    API_URL = normalized;
}

function resolveInitialApiUrl(): string {
    if (isAndroidPlatform()) return getStoredServerUrl();
    return import.meta.env.VITE_API_URL ?? '';
}

export let API_URL = resolveInitialApiUrl();
