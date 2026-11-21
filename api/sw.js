import {shouldWrap, __wrap__} from './wrap.js';
import EpoxyClient from "@mercuryworkshop/epoxy-transport";
import {getUnwrapped} from "./common/shared.js";
let client = new EpoxyClient({ wisp: "ws://127.0.0.1:6001" });
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        await self.skipWaiting();
        console.log('Registered');
    })());
});

let initPromise = null;
function ensureInit() {
    if (!initPromise) {
        initPromise = client.init();
    }
    return initPromise;
}

self.addEventListener('fetch', (event) => {
    let urlObj = new URL(event.request.url);
    if (urlObj.origin !== self.location.origin) return; // HOW IS THIS POSSIBLE I DONT EVEN KNOW

    let z=atob("cmVzcG9uZFdpdGg=")
    if (shouldWrap(urlObj)) {
        event[z]((async()=> {
            await ensureInit();

            let unwrapped = getUnwrapped(event.request.url);
            const rewrittenHeaders = new Headers(event.request.headers);
            if (rewrittenHeaders.has("Origin")) {
                rewrittenHeaders.set("Origin", unwrapped.origin);
            }
            const raw = client.request(
                unwrapped,
                event.request.method,
                ["GET", "HEAD"].includes(event.request.method) ? null : event.request.body,
                [...rewrittenHeaders],
                event.request.signal
            );
            return (__wrap__(raw, event.request))
        })());
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});