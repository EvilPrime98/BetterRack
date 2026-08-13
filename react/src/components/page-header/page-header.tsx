import { DropdownOptions } from '@/components/dropdown/dropdown-options';
import { ItemCounter } from '@/components/item-counter/item-counter';
import { StateFilter } from '@/components/state-filter/state-filter';
import { LayoutSelector } from '@/components/layout/layout-selector';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { BRButton } from '@/components/br-button/br-button';
import { FolderIcon } from '@/icons/folder.icon';
import styles from './page-header.module.css';
import type { ILibraryResponseItem, ILibraryFilters } from '@/library.types';
import { useNewFolderModalContext } from '@/context/NewFolderModalContext';

export function PageHeader({
    uid,
    items,
    filters,
    setFilters,
    resetFilters,
    showNewFolder = false
}: {
    uid?: string;
    items: ILibraryResponseItem[];
    filters: ILibraryFilters;
    setFilters: (updates: Partial<ILibraryFilters>) => void;
    resetFilters: () => void;
    showNewFolder?: boolean;
}) {

    const { openNewFolderModal } = useNewFolderModalContext();

    return (
        <header className={styles.pageHeader}>

            {uid ? <Breadcrumbs uid={uid} /> : null}

            <div className={styles.filtersRow}>

                <div className={styles.left}>
                    <DropdownOptions filters={filters} setFilters={setFilters} resetFilters={resetFilters} />
                    <ItemCounter items={items} />
                </div>

                <div className={styles.right}>
                    <StateFilter />
                    <LayoutSelector />
                    {showNewFolder ? (
                        <>
                            <span className={styles.divider} aria-hidden="true" />
                            {/* TODO: BRButton currently only renders its `text` prop, not `children`,
                                so this FolderIcon isn't visible yet — passed through so it works
                                once BRButton grows children support. */}
                            <BRButton
                                text="New Folder"
                                variant="secondary"
                                className={styles.newFolderButton}
                                onClick={() => openNewFolderModal(uid)}
                            >
                                <FolderIcon size={14} />
                            </BRButton>
                        </>
                    ) : null}
                </div>

            </div>

        </header>
    );

}
