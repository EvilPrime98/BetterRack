import { useConfirmModalStore } from '@/stores/confirmModal.store';

function describeActiveDownloads(activeDownloads: number): string {
    const noun = activeDownloads === 1 ? 'download is' : 'downloads are';
    return `(${activeDownloads}) ${noun} still in progress. Closing BetterRack will cancel ${activeDownloads === 1 ? 'it' : 'them'}.`;
}

export function registerDesktopCloseGuard(): void {

    window.desktop?.onCloseRequested(async (activeDownloads) => {

        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Downloads in progress',
            message: describeActiveDownloads(activeDownloads),
            confirmLabel: 'Close anyway',
            cancelLabel: 'Keep open'
        });

        if (confirmed) window.desktop?.confirmClose();
        else window.desktop?.cancelClose();

    });

}
