import {shouldWrap, __wrap__} from './wrap.js';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Registered');
});

self.addEventListener('fetch', async (event) => {
    let urlObj = new URL(event.request.url);
    if (urlObj.origin !== self.location.origin) return; // HOW IS THIS POSSIBLE I DONT EVEN KNOW
    let fetched = fetch(event.request);
    let z=atob("cmVzcG9uZFdpdGg=")
    if (shouldWrap(urlObj)) {
        event[z](__wrap__(fetched, event.request));
    } else {
        event[z](fetched);

    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});