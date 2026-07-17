import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import type { TComicsTypes } from "../library.types";

export interface IComicsTypeCtx {
    type: IUltraCompStateStateful<TComicsTypes>;
    next: () => void;
}

export const COMICS_TYPE_CTX: IComicsTypeCtx = ultraCompState({
    type: 'cover' as TComicsTypes,
    next: (comp: IComicsTypeCtx) =>{
        const currType = comp.type.get();
        if (currType === 'cover') comp.type.set('detail')
        else if (currType === 'detail') comp.type.set('cover')
    }
})