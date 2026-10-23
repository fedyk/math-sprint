(() => {
    const status = document.getElementById('offline-status');
    const updateButton = document.getElementById('update-app');
    let registration;
    let reloadPending = false;
    let hadController = !!navigator.serviceWorker?.controller;
    const playing = () => typeof roundActive !== 'undefined' && roundActive;

    async function checkOffline() {
        const worker = navigator.serviceWorker.controller;
        if (!worker) return;
        const channel = new MessageChannel();
        const timeout = setTimeout(() => {
            status.textContent = 'Offline readiness could not be verified. Reopen online to retry.';
        }, 5000);
        channel.port1.onmessage = ({ data }) => {
            clearTimeout(timeout);
            status.textContent = data.ready ? 'Ready for offline use' : 'Offline files are incomplete. Reopen online to retry.';
            channel.port1.close();
        };
        worker.postMessage({ type: 'CHECK_OFFLINE' }, [channel.port2]);
    }
    function refreshUpdate() {
        updateButton.classList.toggle('hidden', !registration?.waiting || playing());
        if (reloadPending && !playing()) location.reload();
    }
    updateButton.addEventListener('click', () => {
        if (playing() || !registration?.waiting) return;
        updateButton.disabled = true;
        registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    });
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        status.textContent = 'Offline play requires a supported browser and HTTPS (or localhost).';
        return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) reloadPending = true;
        hadController = true;
        checkOffline();
        refreshUpdate();
    });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
        registration = reg;
        checkOffline();
        refreshUpdate();
        reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            worker?.addEventListener('statechange', () => {
                refreshUpdate();
                if (worker.state === 'redundant') status.textContent = 'Offline download failed. Reopen online to retry.';
            });
        });
        setInterval(refreshUpdate, 500);
    }).catch(() => {
        status.textContent = 'Offline setup failed. Reopen online to retry.';
    });
    window.addEventListener('online', () => { checkOffline(); registration?.update().catch(() => {}); });
})();
