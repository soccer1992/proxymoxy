import {shouldWrap, __wrap__} from '/api/wrap.js';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Registered');
});

self.addEventListener('fetch', async (event) => {
    let urlObj = new URL(event.request.url);
    if (urlObj.origin !== self.location.origin) return; // HOW IS THIS POSSIBLE I DONT EVEN KNOW
    let fetched = fetch(event.request);
    let z="res"+"pondWith"
    if (shouldWrap(urlObj)) {
        event[z](__wrap__(fetched, event.request));
    } else {
        event[z](fetched);

    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});