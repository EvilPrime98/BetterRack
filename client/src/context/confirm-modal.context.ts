import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";

export interface IConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

let resolver: ((result: boolean) => void) | null = null;

export interface IConfirmModalCtx {
    isVisible: IUltraCompStateStateful<boolean>;
    title: IUltraCompStateStateful<string>;
    message: IUltraCompStateStateful<string>;
    confirmLabel: IUltraCompStateStateful<string>;
    cancelLabel: IUltraCompStateStateful<string>;
    /** Opens the confirm modal and resolves once the user picks confirm or cancel/dismiss. */
    confirmDialog: (options: IConfirmOptions) => Promise<boolean>;
    resolveConfirmDialog: (result: boolean) => void;
}

export const CONFIRM_MODAL_CTX: IConfirmModalCtx = ultraCompState({

    isVisible: false,
    title: 'Are you sure?' as string,
    message: '' as string,
    confirmLabel: 'Confirm' as string,
    cancelLabel: 'Cancel' as string,

    confirmDialog: (
        comp: IConfirmModalCtx,
        { title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: IConfirmOptions
    ): Promise<boolean> => {
        comp.title.set(title);
        comp.message.set(message);
        comp.confirmLabel.set(confirmLabel);
        comp.cancelLabel.set(cancelLabel);
        comp.isVisible.set(true);
        return new Promise<boolean>((resolve) => {
            resolver = resolve;
        });
    },

    resolveConfirmDialog: (comp: IConfirmModalCtx, result: boolean) => {
        comp.isVisible.set(false);
        resolver?.(result);
        resolver = null;
    }

});
