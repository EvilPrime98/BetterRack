import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './download-dir-modal.module.css';
import { FolderIcon } from "@/icons/folder.icon";
import { SETTINGS_CONTEXT } from "@/context/settings.context";
import { DOWNLOAD_DIR_MODAL_CTX } from "@/context/download-dir-modal.context";
import { getDirectories } from "@/services/fs.service";

export function DownloadDirModal() {

    let $list: HTMLElement | null = null;
    let loading = false;

    const cancel = () => DOWNLOAD_DIR_MODAL_CTX.closeDownloadDirModal();

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel();
    }

    const renderMessage = (text: string) => {
        if (!$list) return;
        $list.replaceChildren(
            UltraComponent({ component: `<li class="${styles.empty}">${text}</li>` })
        );
    }

    const renderList = (dirs: string[]) => {

        if (!$list) return;

        const currentDefault = SETTINGS_CONTEXT.settings.get().downloadDir;

        if (dirs.length === 0) {
            renderMessage('No directories available. Set a download or library folder in Settings.');
            return;
        }

        $list.replaceChildren(
            ...dirs.map(dir => {
                const isDefault = dir === currentDefault;
                return UltraComponent({
                    component: `<li class="${styles.item}${isDefault ? ` ${styles.default}` : ''}"></li>`,
                    eventHandler: { click: () => DOWNLOAD_DIR_MODAL_CTX.confirmDownloadDir(dir) },
                    children: [
                        FolderIcon({ size: 14, color: isDefault ? '#34c3d1' : '#c7c7c7' }),
                        `<span>${dir}</span>`,
                        isDefault ? `<span class="${styles.badge}">default</span>` : ''
                    ]
                });
            })
        );
    }

    const loadAndRender = async () => {
        if (!$list || loading) return;
        loading = true;
        renderMessage('Loading…');
        try {
            const dirs = await getDirectories();
            if (!DOWNLOAD_DIR_MODAL_CTX.isVisible.get()) return;
            renderList(dirs);
        } catch (e) {
            renderMessage(e instanceof Error ? e.message : 'Failed to load directories.');
        } finally {
            loading = false;
        }
    }

    return UltraActivity({

        mode: {
            state: DOWNLOAD_DIR_MODAL_CTX.isVisible.get,
            subscriber: DOWNLOAD_DIR_MODAL_CTX.isVisible.subscribe
        },

        component: '<div></div>',

        className: [styles.overlay],

        onMount: [
            () => {
                document.addEventListener('keydown', onKeydown);
                return () => document.removeEventListener('keydown', onKeydown);
            }
        ],

        trigger: [{
            subscriber: DOWNLOAD_DIR_MODAL_CTX.isVisible.subscribe,
            triggerFunction: () => {
                if (DOWNLOAD_DIR_MODAL_CTX.isVisible.get()) loadAndRender();
            },
            defer: true
        }],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: cancel }
            }),

            UltraComponent({

                component: '<div></div>',

                attributes: {
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': 'Choose download directory'
                },

                className: [styles.modal],

                children: [

                    `<p class="${styles.title}">Download to: </p>`,

                    UltraComponent({
                        component: `<ul class="${styles.list}"></ul>`,
                        onMount: [
                            ($el) => {
                                $list = $el as HTMLElement;
                                if (DOWNLOAD_DIR_MODAL_CTX.isVisible.get()) loadAndRender();
                            }
                        ]
                    })

                ]
            })

        ]
    })

}
