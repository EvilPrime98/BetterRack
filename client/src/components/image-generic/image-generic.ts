import { UltraComponent } from "ultra-light-js"

export function ImageGen({
    src
}:{
    src: string
}){

    return UltraComponent({
        component: '<img/>',
        attributes: {
            src: src,
            loading: 'lazy',
            decoding: 'async'
        }
    })

}