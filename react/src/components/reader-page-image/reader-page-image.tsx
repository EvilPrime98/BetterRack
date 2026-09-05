import { useState } from 'react';
import styles from '../../pages/reader.page.module.css';
import { ImageGen } from '../image-generic/image-generic';
import { API_URL } from '../../services/library.service';
import { withAuthQuery } from '../../services/server-config.service';

export function ImageElement({
    uid,
    ind,
    index,
    total,
    eager
}: {
    uid: string;
    ind: number;
    index: number;
    total: number;
    eager?: boolean;
}) {

    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <figure className={[styles.pageWrapper, isLoaded ? styles.loaded : ''].filter(Boolean).join(' ')}>
            <ImageGen
                src={withAuthQuery(`${API_URL}/read/${uid}/pages/${ind}`)}
                alt={`${uid} — page ${index} of ${total}`}
                loading={(eager || index <= 2) ? 'eager' : 'lazy'}
                onLoad={() => setIsLoaded(true)}
            />
        </figure>
    );

}
