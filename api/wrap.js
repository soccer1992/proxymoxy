import {htmlWrap, wrapJS} from "./common/rewriters.js";
import {getUnwrapped, proxyWrapUrl} from "./common/shared.js";

function shouldWrap(url){
    // expected to have the correct origin, since how else would this service worker be called?
    return !(url.pathname.startsWith('/pub/') || url.pathname.startsWith('/api/') || url.pathname==='/favicon.ico');

}
function dynamicWrap(contentType, resp, reqURL){
    if (contentType.includes('text/html') || contentType.includes('javascript')) {

        // TODO: Hook up your Cheerio (HTML) or Babel (JS) parsing here!
        if (contentType.startsWith("text/html")){
            return htmlWrap(resp, reqURL);

        } else if (contentType.includes("javascript")){
            return wrapJS(resp, reqURL);

        }
    }
    return null;
}
async function  __wrap__(response_async, __request__) {
    let response = await response_async;
    if (!(response instanceof Response)){ // this means its a WISP call
        let newHeaders = Object.fromEntries(response.headers);
        delete newHeaders['content-encoding'];
        delete newHeaders['content-security-policy'];
        delete newHeaders['x-frame-options'];
        if (response.status >= 300 && response.status < 400) {
            const locHeader = newHeaders['location'];
            if (locHeader) {
                newHeaders['location'] = proxyWrapUrl(locHeader, new URL(__request__.url));
            }
        }
        response = new Response(response.body, {
            headers: newHeaders,
            status: response.status,
            statusText: response.statusText
        })
    }
    let reqURL;
    try {
        reqURL = getUnwrapped(__request__.url);
    } catch {
        return response; // dawg.
    }

    if (response.status === 0) return response;

    const buffer = await response.arrayBuffer();
        let resp = new TextDecoder().decode(buffer);
        let contentType = response.headers.get('content-type') || '';
        let dynamicWrapped = dynamicWrap(contentType, resp, reqURL);
        if (dynamicWrapped == null) return new Response(buffer, response); // remake so response.text is no longer read
        return new Response(dynamicWrapped, response);
}
export { shouldWrap, __wrap__, dynamicWrap };