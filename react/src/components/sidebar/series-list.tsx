import type { ILibraryGroup } from "@/library.types";
import { useCallback, useState } from "react";
import { SideBarElement } from "./sider-bar-element";

const SERIES_PAGE_SIZE = 50;

export function SeriesList({ 
    groups, 
    isHidden 
}: { 
    groups: ILibraryGroup[]; 
    isHidden: boolean 
}) {

    const [count, setCount] = useState(SERIES_PAGE_SIZE);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some(e => e.isIntersecting)) return;
                setCount(c => c + SERIES_PAGE_SIZE);
                observer.unobserve(node);
                observer.observe(node);
            },
            { rootMargin: '300px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <>
            {!isHidden && groups.slice(0, count).map(group => (
                <SideBarElement
                    key={group.uid}
                    item={{ uid: group.uid, did: true, name: group.name, path: group.path, parentId: '', createdAt: 0 }}
                />
            ))}
            {!isHidden && count < groups.length && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
    );

}
