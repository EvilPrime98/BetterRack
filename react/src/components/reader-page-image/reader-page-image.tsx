import { memo, useState } from 'react';
import styles from '../../pages/reader.page.module.css';
import { ImageGen } from '../image-generic/image-generic';
import { API_URL } from '../../services/library.service';
import { withAuthQuery } from '../../services/server-config.service';

export const ImageElement = memo(function ImageElement({
    uid,
    ind,
    index,
    total,
    active,
    onRatio
}: {
    uid: string;
    ind: number;
    index: number;
    total: number;
    active: boolean;
    onRatio: (ratio: number) => void;
}) {

    const [isLoaded, setIsLoaded] = useState(false);
    const [ratio, setRatio] = useState<number | null>(null);

    if (!active && isLoaded) setIsLoaded(false);

    const className = [
        styles.pageWrapper,
        isLoaded ? styles.loaded : '',
        active ? '' : styles.idle
    ].filter(Boolean).join(' ');

    return (
        <figure className={className} style={ratio ? { aspectRatio: ratio } : undefined}>
            {active ? (
                <ImageGen
                    src={withAuthQuery(`${API_URL}/read/${uid}/pages/${ind}`)}
                    alt={`${uid} — page ${index} of ${total}`}
                    loading="eager"
                    onLoad={(e) => {
                        const { naturalWidth, naturalHeight } = e.currentTarget;
                        if (naturalWidth > 0 && naturalHeight > 0) {
                            const measured = naturalWidth / naturalHeight;
                            setRatio(measured);
                            onRatio(measured);
                        }
                        setIsLoaded(true);
                    }}
                />
            ) : null}
        </figure>
    );

});
