import { UltraComponent } from "ultra-light-js";
import styles from './read-bard.module.css';

export function ReadBar({
    readPercentage
}:{
    readPercentage: number //1-100
}){

    const bgColor = (readPercentage === 100)
    ? '#13a629'
    : '#34c3d1'

    return UltraComponent({
        
        component: '<div></div>',

        className: [styles.readBar],
        
        children: [
            UltraComponent({
                component: '<div></div>',
                styles: {
                    width: `${readPercentage}%`,
                    backgroundColor: bgColor
                },
                className: [styles.fillIn]
            })
        ],

        
    })

}