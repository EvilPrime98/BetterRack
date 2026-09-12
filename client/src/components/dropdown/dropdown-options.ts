import { UltraComponent, UltraActivity, ultraState } from "ultra-light-js";
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from "../../icons/chevron.icon";
import { FILTER_OPTIONS, type ILibraryFilters } from "../../library.types";
import { LIBRARY_CONTEXT } from "../../context/library.context";

export function DropdownOptions({
    uid,
    filters,
    resetFilters
}: {
    uid?: string;
    filters: ILibraryFilters;
    resetFilters: () => void;
}) {

    const [isOpen, setOpen, subsOpen] = ultraState(false);

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: Event) => {
        e.stopPropagation();
        setOpen(!isOpen());
    }

    const onOpenChange = ($root: HTMLElement) => {
        $root.classList.toggle(styles.open, isOpen());
    }

    const getTitle = () => LIBRARY_CONTEXT.groups.get()
        .map(g => g.entries).flat().find(e => e.uid === uid)?.name || '';

    const onTitleChange = ($span: HTMLElement) => {
        const title = getTitle();
        $span.textContent = title || 'Root';
        $span.setAttribute('title', title);
    }

    const onIndicatorChange = ($li: HTMLElement, matches: () => boolean) => {
        const $indicator = $li.querySelector('span');
        if (!$indicator) return;
        $indicator.innerHTML = matches() ? ChevronDownIcon({ orientation: 'right' }) : '';
    }

    return UltraComponent({

        component: '<div></div>',

        className: [styles.dropdown],

        eventHandler: {
            click: toggleMenu
        },

        onMount: [
            onOpenChange,
            () => {
                document.addEventListener('click', closeMenu);
                return () => document.removeEventListener('click', closeMenu);
            }
        ],

        trigger: [{
            subscriber: subsOpen,
            triggerFunction: onOpenChange
        }],

        children: [

            UltraComponent({
                component: `<span class="${styles.label}"></span>`,
                onMount: [onTitleChange],
                trigger: [{
                    subscriber: LIBRARY_CONTEXT.groups.subscribe,
                    triggerFunction: onTitleChange
                }]
            }),

            ChevronDownIcon({ size: 14 }),

            UltraActivity({

                component: `<ul class="${styles.menu}"></ul>`,

                mode: {
                    state: isOpen,
                    subscriber: subsOpen
                },

                children: [

                    UltraComponent({
                        component: `<li class="${styles.option}"><span></span>${FILTER_OPTIONS.nofilters}</li>`,
                        onMount: [
                            ($li: HTMLElement) => onIndicatorChange($li, () => !filters.sortByReleaseDate.get())
                        ],
                        trigger: [{
                            subscriber: filters.sortByReleaseDate.subscribe,
                            triggerFunction: ($li: HTMLElement) => onIndicatorChange($li, () => !filters.sortByReleaseDate.get())
                        }],
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                resetFilters();
                                setOpen(false);
                            }
                        }
                    }),

                    UltraComponent({
                        component: `<li class="${styles.option}"><span></span>${FILTER_OPTIONS.byReleaseDate}</li>`,
                        onMount: [
                            ($li: HTMLElement) => onIndicatorChange($li, () => filters.sortByReleaseDate.get())
                        ],
                        trigger: [{
                            subscriber: filters.sortByReleaseDate.subscribe,
                            triggerFunction: ($li: HTMLElement) => onIndicatorChange($li, () => filters.sortByReleaseDate.get())
                        }],
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                filters.sortByReleaseDate.set(true);
                                setOpen(false);
                            }
                        }
                    })

                ]

            })

        ]

    })

}
