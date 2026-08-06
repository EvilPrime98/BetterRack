import { UltraComponent, UltraActivity, ultraState } from "ultra-light-js";
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from "../../icons/chevron.icon";
import { FILTER_OPTIONS, type ILibraryFilters, type TFilterOptions } from "../../library.types";
import { USER_PREF } from "../../context/user-pref-cache.context";

export function DropdownOptions({
    filters,
    resetFilters
}: {
    filters: ILibraryFilters;
    resetFilters: () => void;
}) {

    const [isOpen, setOpen, subsOpen] = ultraState(false);

    const [selected, setSelected, subsSelected] = ultraState<TFilterOptions>(
        filters.sortByReleaseDate.get()
            ? FILTER_OPTIONS.byReleaseDate
            : FILTER_OPTIONS.nofilters
    );

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: Event) => {
        e.stopPropagation();
        setOpen(!isOpen());
    }

    const onOpenChange = ($root: HTMLElement) => {
        $root.classList.toggle(styles.open, isOpen());
    }

    subsSelected(() => {
        USER_PREF.setPref({ filter: selected() })
    })

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
                component: `<span class="${styles.label}">${selected()}</span>`,
                trigger: [{
                    subscriber: subsSelected,
                    triggerFunction: ($span: HTMLElement) => {
                        $span.textContent = selected();
                    }
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
                        component: `<li class="${styles.option}">${FILTER_OPTIONS.nofilters}</li>`,
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                resetFilters();
                                setSelected(FILTER_OPTIONS.nofilters);
                                setOpen(false);
                            }
                        }
                    }),

                    UltraComponent({
                        component: `<li class="${styles.option}">${FILTER_OPTIONS.byReleaseDate}</li>`,
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                filters.sortByReleaseDate.set(true);
                                setSelected(FILTER_OPTIONS.byReleaseDate);
                                setOpen(false);
                            }
                        }
                    })

                ]

            })

        ]

    })

}