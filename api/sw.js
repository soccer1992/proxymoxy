import {shouldWrap, __wrap__} from './wrap.js';
import EpoxyClient from "@mercuryworkshop/epoxy-transport";
import {getUnwrapped} from "./common/shared.js";
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        await self.skipWaiting();
        console.log('Registered');
    })());
});
function createClient() {
    return new EpoxyClient({
        wisp: "ws://127.0.0.1:6001",
    });
}

function ensureInit() {
    if (!initPromise) {
        initPromise = (async () => {
            try {
                client = createClient();
                await client.init();
                return client;
            } catch (err) {
                client = null;
                initPromise = null;
                throw err;
            }
        })();
    }
    return initPromise;
}
let initPromise = null;
let client = null;
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
            let connectFailed = true;
            let raw;
            while (connectFailed) {
                try {
                    raw = await client.request(
                        unwrapped,
                        event.request.method,
                        ["GET", "HEAD"].includes(event.request.method) ? null : event.request.body,
                        [...rewrittenHeaders],
                        event.request.signal
                    );
                    connectFailed = false;
                } catch (e){
                    if (String(e).includes("MuxTaskEnded")) {
                        client = null;
                        initPromise = null;
                        connectFailed = true;
                        await ensureInit();
                    }
                    throw e;
                }
            }
            return (__wrap__(raw, event.request))
        })());
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});