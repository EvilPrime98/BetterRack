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

    const menuId = `dropdown-menu-${Math.random().toString(36).slice(2)}`;

    const [isOpen, setOpen, subsOpen] = ultraState(false);

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: Event) => {
        e.stopPropagation();
        setOpen(!isOpen());
    }

    const onTriggerKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
    }

    const onOpenChange = ($root: HTMLElement) => {
        $root.classList.toggle(styles.open, isOpen());
    }

    const onExpandedChange = ($button: HTMLElement) => {
        $button.setAttribute('aria-expanded', String(isOpen()));
    }

    const getTitle = () => LIBRARY_CONTEXT.groups.get()
        .map(g => g.entries).flat().find(e => e.uid === uid)?.name || '';

    const onTitleChange = ($span: HTMLElement) => {
        const title = getTitle();
        $span.textContent = title || 'Root';
        $span.setAttribute('title', title);
    }

    const onLabelChange = ($button: HTMLElement) => {
        $button.setAttribute('aria-label', `Sort options, currently ${getTitle() || 'Root'}`);
    }

    const onIndicatorChange = ($li: HTMLElement, matches: () => boolean) => {
        $li.setAttribute('aria-selected', String(matches()));
        const $indicator = $li.querySelector('span');
        if (!$indicator) return;
        $indicator.innerHTML = matches() ? ChevronDownIcon({ orientation: 'right' }) : '';
    }

    const onOptionKeyDown = (e: KeyboardEvent, onSelect: () => void) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
        }
    }

    return UltraComponent({

        component: '<div></div>',

        className: [styles.dropdown],

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
                component: '<button></button>',
                className: [styles.trigger],
                attributes: {
                    type: 'button',
                    'aria-haspopup': 'listbox',
                    'aria-controls': menuId
                },
                eventHandler: {
                    click: toggleMenu,
                    keydown: onTriggerKeyDown as EventListener
                },
                onMount: [onExpandedChange, onLabelChange],
                trigger: [
                    { subscriber: subsOpen, triggerFunction: onExpandedChange },
                    { subscriber: LIBRARY_CONTEXT.groups.subscribe, triggerFunction: onLabelChange }
                ],
                children: [

                    UltraComponent({
                        component: `<span class="${styles.label}"></span>`,
                        onMount: [onTitleChange],
                        trigger: [{
                            subscriber: LIBRARY_CONTEXT.groups.subscribe,
                            triggerFunction: onTitleChange
                        }]
                    }),

                    ChevronDownIcon({ size: 14 })

                ]
            }),

            UltraActivity({

                component: `<ul id="${menuId}" role="listbox" class="${styles.menu}"></ul>`,

                mode: {
                    state: isOpen,
                    subscriber: subsOpen
                },

                children: [

                    UltraComponent({
                        component: `<li class="${styles.option}" role="option" tabindex="0"><span></span>${FILTER_OPTIONS.nofilters}</li>`,
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
                            },
                            keydown: ((e: KeyboardEvent) => onOptionKeyDown(e, () => {
                                resetFilters();
                                setOpen(false);
                            })) as EventListener
                        }
                    }),

                    UltraComponent({
                        component: `<li class="${styles.option}" role="option" tabindex="0"><span></span>${FILTER_OPTIONS.byReleaseDate}</li>`,
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
                            },
                            keydown: ((e: KeyboardEvent) => onOptionKeyDown(e, () => {
                                filters.sortByReleaseDate.set(true);
                                setOpen(false);
                            })) as EventListener
                        }
                    })

                ]

            })

        ]

    })

}
