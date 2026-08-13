import { create } from 'zustand';
import { getStoredServerUrl, needsServerSetup, setServerUrl } from '../services/server-config.service';

export { getStoredServerUrl };

let resolver: (() => void) | null = null;

interface IServerModalStore {
    isVisible: boolean;
    isMandatory: boolean;
    error: string;
    /** Resolves immediately if no server setup is needed, otherwise opens the modal and waits for submit. */
    ensureServerConfigured: () => Promise<void>;
    openServerModal: () => void;
    closeServerModal: () => void;
    submitServer: (url: string) => void;
}

export const useServerModalStore = create<IServerModalStore>((set, get) => ({

    isVisible: false,
    isMandatory: false,
    error: '',

    ensureServerConfigured: (): Promise<void> => {
        if (!needsServerSetup()) return Promise.resolve();
        set({ error: '', isMandatory: true, isVisible: true });
        return new Promise<void>((resolve) => {
            resolver = resolve;
        });
    },

    openServerModal: () => {
        set({ error: '', isMandatory: false, isVisible: true });
    },

    closeServerModal: () => {
        if (get().isMandatory) return;
        set({ isVisible: false });
    },

    submitServer: (url) => {
        const trimmed = url.trim();
        if (!trimmed) {
            set({ error: 'Enter a server address.' });
            return;
        }
        setServerUrl(trimmed);
        set({ isVisible: false, isMandatory: false });
        resolver?.();
        resolver = null;
    }

}));
