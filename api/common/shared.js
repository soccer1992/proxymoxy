///import { dynamicWrap } from '/api/wrap.js';
export let supportedElements = {
    "a": "href",
    "area": "href",
    "base": "href",
    "link": "href",
    "script": "src",
    "img": "src",
    "iframe": "src",
    "video": "src",
    "audio": "src",
    "source": "src",
    "track": "src",
    "embed": "src",
    "input": "src",
    "meta": "/"
}

export function proxyWrapUrl(url, fromOrigin){
    //if (url.startsWith("data:")){
    //    let urlData = url.substring(5);
    //    let readMime = false;
    //    let mimeType = 'text/plain;charset=US-ASCII';
    //    if (urlData[0]!==';' && urlData[0]!==','){
    //        readMime = true;
    //        // mime type
    //        mimeType = urlData.split(';base64')[0].split(',')[0];
    //    }
    //    let b64encoded = urlData.includes(';base64');
    //    let restOfData=urlData.substring(urlData.indexOf(",")+1);
    //    if (b64encoded) restOfData = atob(restOfData);
    //    let dynamicWrapped = dynamicWrap(mimeType, restOfData, fromOrigin);
    //    if (dynamicWrapped == null) return url;
    //    return 'data:' + (readMime?mimeType:'') + (b64encoded?';base64':'') + ',' + (b64encoded?btoa(dynamicWrapped):encodeURIComponent(dynamicWrapped));
    //}
    if (new URL(__PROXY_URL__).origin===new URL(url,fromOrigin).origin)return url
    return __PROXY_URL__ + encodeURIComponent(new URL(url, fromOrigin).href);
    //if (url.startsWith('/')) {
    //    return `${PROXY_URL}${fromOrigin}${url}`;
    //} else {
    //    return `${PROXY_URL}${url}`;
    //}
}
export function getUnwrapped(url){
    try{
        return new URL(decodeURIComponent(new URL(url).pathname.substring(1)));
    } catch {
        return url;
    }

}


export let __PROXY_URL__ = self.location.origin + "/"
export let __VARMAINNAME__ = '__MAINNAME__';
