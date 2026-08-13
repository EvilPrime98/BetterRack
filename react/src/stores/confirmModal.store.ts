import { create } from 'zustand';

export interface IConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

let resolver: ((result: boolean) => void) | null = null;

interface IConfirmModalStore {
    isVisible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    /** Opens the confirm modal and resolves once the user picks confirm or cancel/dismiss. */
    confirmDialog: (options: IConfirmOptions) => Promise<boolean>;
    resolveConfirmDialog: (result: boolean) => void;
}

export const useConfirmModalStore = create<IConfirmModalStore>((set) => ({

    isVisible: false,
    title: 'Are you sure?',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',

    confirmDialog: ({ title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) => {
        set({ title, message, confirmLabel, cancelLabel, isVisible: true });
        return new Promise<boolean>((resolve) => {
            resolver = resolve;
        });
    },

    resolveConfirmDialog: (result) => {
        set({ isVisible: false });
        resolver?.(result);
        resolver = null;
    }

}));
