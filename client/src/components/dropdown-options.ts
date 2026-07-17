import { UltraComponent, UltraActivity, ultraState } from "ultra-light-js";
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from "../icons/chevron.icon";
import type { ILibraryFilters } from "../library.types";

const OPTIONS = {
    nofilters: 'Alphabetically',
    byCreation: 'Creation Date'
} as const;

type TOptions = typeof OPTIONS[keyof typeof OPTIONS];

export function DropdownOptions({
    filters
}:{
    filters: ILibraryFilters
}) {

    const [isOpen, setOpen, subsOpen] = ultraState(false);
    const [selected, setSelected, subsSelected] = ultraState<TOptions>(OPTIONS.nofilters);

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: Event) => {
        e.stopPropagation();
        setOpen(!isOpen());
    }

    const onLabelChange = ($span: HTMLElement) => {
        $span.textContent = selected();
    }

    const onOpenChange = ($root: HTMLElement) => {
        $root.classList.toggle(styles.open, isOpen());
    }

    const sortByCreation = () => {
        filters.sortByCreation.set(
            !filters.sortByCreation.get()
        )
    }

    const sortByAlphabetically = () => {
        filters.sortAlphabetically.set(
            !filters.sortAlphabetically.get()
        )
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
                component: `<span class="${styles.label}">${selected()}</span>`,
                trigger: [{
                    subscriber: subsSelected,
                    triggerFunction: onLabelChange
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
                        component: `<li class="${styles.option}">${OPTIONS.nofilters}</li>`,
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                sortByAlphabetically();
                                setSelected(OPTIONS.nofilters);
                                setOpen(false);
                            }
                        }
                    }),

                    UltraComponent({
                        component: `<li class="${styles.option}">${OPTIONS.byCreation}</li>`,
                        eventHandler: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                sortByCreation();
                                setSelected(OPTIONS.byCreation);
                                setOpen(false);
                            }
                        }
                    })

                ]

            })

        ]

    })

}