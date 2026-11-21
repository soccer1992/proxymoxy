import {proxyWrapUrl, getUnwrapped} from '../common/shared.js';
import {wrapJS} from '../common/rewriters.js';
import {__PROXY_URL__, __VARMAINNAME__, supportedElements} from "../common/constants.js";


function run() {
    document.querySelectorAll(`script[${__VARMAINNAME__}-injected]`).forEach(a => a.remove());

    function wrap(eleName, eleNode) {
        let attrType = supportedElements[eleName];
        if (!attrType) return;
        if (!eleNode.getAttribute(attrType)) return;
        let attrOut = new URL(eleNode.getAttribute(attrType),  getUnwrapped(location.href));
        if (attrOut.origin === new URL(__PROXY_URL__).origin) return
        eleNode.setAttribute(__VARMAINNAME__ + '-orig-' + attrType, attrOut);
        eleNode.setAttribute(attrType, proxyWrapUrl(attrOut.toString(), getUnwrapped(location.href)));
    }
    document.querySelectorAll("*").forEach(a => wrap(a.tagName.toLowerCase(), a));

    (function () {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes"){
                    const changedElement = mutation.target;
                    const attrName = mutation.attributeName;
                    if ( attrName === "integrity" &&
                        changedElement.tagName === 'SCRIPT' ||
                        (
                            changedElement.tagName === 'LINK' &&
                            ['modulepreload', 'preload', 'stylesheet'].includes(
                                changedElement.getAttribute('rel')
                            )
                        )
                    ) {
                        changedElement.removeAttribute('integrity');
                        continue;
                    }
                    if (changedElement.tagName === 'META' && attrName==='http-equiv' && changedElement.getAttribute(attrName)==='content-security-policy'){
                        changedElement.removeAttribute(attrName);
                    }


                    const oldValue = mutation.oldValue;
                    const newValue = changedElement.getAttribute(attrName);
                    console.log(changedElement + ' changed attr ' + attrName + ' from ' + oldValue + ' to ' + newValue);
                    if (oldValue !== newValue) wrap(changedElement.nodeName.toLowerCase(), changedElement);
                } else {
                    for (const __node__ of mutation.addedNodes) {
                        // Check newly injected scripts, iframes, etc.
                        if (__node__.nodeType === Node.ELEMENT_NODE) {
                            if (__node__.nodeName.toLowerCase() === "script"){
                                if (__node__.getAttribute('src') == null){
                                    __node__.textContent = wrapJS(__node__.textContent, getUnwrapped(location.href));
                                    continue;
                                }
                            }
                            // handle element
                            wrap(__node__.nodeName.toLowerCase(), __node__)
                        }
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src", "href"],
            attributeOldValue: true
        });
    })();
}
export {run}