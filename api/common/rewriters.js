import * as __CHEERIO__ from 'https://cdn.jsdelivr.net/npm/cheerio@1.2.0/+esm';
import { parse } from 'https://cdn.jsdelivr.net/npm/@babel/parser/+esm';
import { generate } from 'https://cdn.jsdelivr.net/npm/@babel/generator/+esm';
import {__VARMAINNAME__, __PROXY_URL__, proxyWrapUrl, supportedElements} from "/api/common/shared.js";



let WEBHOOK_MAIN = `
    let locationVar = \`$${__VARMAINNAME__}$location\`;
    let propertyVar = \`$${__VARMAINNAME__}$prop\`;
    if (!Object.hasOwn(window, propertyVar)) {
        Object.defineProperty(window, propertyVar, {
            value: function(arg) {
                switch (arg) {
                    case "location":
                        return locationVar;
                    default:
                        return arg;
                }
            },
            writable: false,
            enumerable: true,
            configurable: false
        });
    }
import { run as lrun } from '${__PROXY_URL__}api/webhooks/location.js';
lrun(locationVar, propertyVar)
import { run } from '${__PROXY_URL__}api/webhooks/main.js'

run()
`
export function htmlWrap(html, fromOrigin){
    const $ = __CHEERIO__.load(html);

    $(Object.keys(supportedElements).join(', ')).each((i, el) => {
        if (
            el.name === 'script' ||
            (el.name === 'link' &&
                ["modulepreload", "preload", "stylesheet"].includes($(el).attr("rel")))
        ) {
            $(el).removeAttr("integrity");
        }
        if (el.name === 'meta' && $(el).attr("http-equiv")==='content-security-policy'){
            $(el).removeAttr("http-equiv");
        }

        let attrName = supportedElements[el.name]
        if (!attrName)return;
        const href = $(el).attr(attrName);
        if (href)$(el).attr(attrName, proxyWrapUrl(href, fromOrigin));

    });
    $('head').prepend($(`<script src="data:text/javascript;base64,${btoa(WEBHOOK_MAIN)}" ${__VARMAINNAME__}-injected="true" type="module" async></script>`));
    return $.html();
}
function walkAST(__node__, visitor, parent = null) {
    if (!__node__ || typeof __node__ !== 'object') return;

    if (visitor[__node__.type]) {
        visitor[__node__.type](__node__, parent);
    }

    for (const key of Object.keys(__node__)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;

        const child = __node__[key];
        if (Array.isArray(child)) {
            for (const item of child) {
                walkAST(item, visitor, __node__);
            }
        } else if (child && typeof child === 'object') {
            walkAST(child, visitor, __node__);
        }
    }
}
export function wrapJS(js) {
    const ast = parse(js, {
        sourceType: "unambiguous",
        allowAwaitOutsideFunction: true
    });

    const wrapFnName = `$${__VARMAINNAME__}$prop`;

    const rewriteMember = (__node__) => {
        // 1. Skip private fields (e.g., this.#secret)
        if (__node__.property.type === "PrivateName") {
            return;
        }

        // 2. Skip if already wrapped with $...$prop(...)
        if (
            __node__.computed &&
            __node__.property.type === "CallExpression" &&
            __node__.property.callee.type === "Identifier" &&
            __node__.property.callee.name === wrapFnName
        ) {
            return;
        }

        // 3. Build plain Babel AST nodes (no @babel/types import needed)
        const propArg = __node__.computed
            ? __node__.property
            : { type: "StringLiteral", value: __node__.property.name };

        __node__.property = {
            type: "CallExpression",
            callee: { type: "Identifier", name: wrapFnName },
            arguments: [propArg]
        };
        __node__.computed = true;
    };

    walkAST(ast, {
        MemberExpression: rewriteMember,
        OptionalMemberExpression: rewriteMember
    });

    return generate(ast).code;
}

