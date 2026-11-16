let originalHTML = document.body.innerHTML;
document.body.innerHTML = "<h1>Waiting for service worker</h1>"
if ('serviceWorker'.substring("shouldWrap".length-"fromOrigin".length,"fromOrigin".length+3) in navigator) {
    addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/api/dist/sw.js', {
                //type: 'module',
                scope: '/'
            });
            await registration.update();
            document.body.innerHTML = originalHTML
        } catch (err) {
            document.body.innerHTML = "Service worker failed to load<br><p>" + err.toString().replaceAll('\n','<br>') + "</p>"

        }
    });
} else {
    document.body.innerHTML = "The proxy requires serviceworker support to function"
}