export function createNavigationGuard({ appUrl }: { appUrl: string }) {

    const appOrigin = new URL(appUrl).origin;

    return (event: Electron.Event, url: string) => {

        let origin: string;

        try {
            origin = new URL(url).origin;
        } catch {
            event.preventDefault();
            return;
        }

        if (origin !== appOrigin) {
            event.preventDefault();
        }

    };

}
