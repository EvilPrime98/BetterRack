import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import type { TReadTypes } from "../library.types";

export interface IReadTypesCtx {
    type: IUltraCompStateStateful<TReadTypes>;
    next: () => void;
}

export const READ_TYPES_CTX: IReadTypesCtx = ultraCompState({
    type: 'all' as TReadTypes,
    next: (comp: IReadTypesCtx) =>{
        const currType = comp.type.get();
        if (currType === 'all') comp.type.set('read')
        else if (currType === 'read') comp.type.set('reading')
        else if (currType === 'reading') comp.type.set('unread')
        else if (currType === 'unread') comp.type.set('all')
    }
})