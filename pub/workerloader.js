let originalHTML = document.body.innerHTML;
document.body.innerHTML = "<h1>Waiting for service worker</h1>"
if (!window.isSecureContext) {
    document.body.innerHTML = `
    <div style="color: red; display: flex; align-items: baseline">
      <h1>WARNING!</h1>
      <p>PROXY IS NOT ON SECURE CONTEXT</p>
    </div>
  `;
} else if (navigator.serviceWorker) {
    addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/api/dist/sw.js', {
                //type: 'module',
                scope: '/'
            });
            await registration.update();
            document.body.innerHTML = originalHTML
        } catch (err) {
            document.body.innerHTML = "Service worker failed to load<br><p style='color: red'>" + err.toString().replaceAll('\n','<br>') + "</p>"

        }
    });
} else {
    document.body.innerHTML = "The proxy requires serviceworker support to function"
}