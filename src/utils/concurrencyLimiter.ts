export const createConcurrencyLimiter = (limit: number) => {

    let running = 0;
    const queue: (() => void)[] = [];

    const acquire = (): Promise<() => void> => {

        const release = () => {
            running--;
            queue.shift()?.();
        };

        if (running < limit) {
            running++;
            return Promise.resolve(release);
        }

        return new Promise(resolve => queue.push(() => {
            running++;
            resolve(release);
        }));

    };

    return { acquire };

};
