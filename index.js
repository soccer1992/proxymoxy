import path from 'node:path';
import * as cheerio from 'cheerio';
import express from 'express';
import * as fs from "node:fs";
const app = express();
app.set('trust proxy', true)
const PORT = process.env.PORT || 3000;
const USE_OBFUSCATION = true;
const obfuscation_var_mappings = {};
const renameVars = [
    "WEBHOOK_MAIN",
    "supportedElements",
    "wrapJS",
    "proxyWrapUrl",
    "getUnwrapped",
    "htmlWrap",
    "walkAST",
    "wrapJS",
    "shouldWrap",
    "dynamicWrapped",
    "dynamicWrap",
    "__wrap__",
    "contentType",
    "response_async",
    "__request__",
    "reqURL",
    "response",
    "resp",
    "fromOrigin",
    "attrName",
    "visitor",
    "parent",
    "__node__"
]
function randomName(length){
    let z = '';
    let randomChars='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    randomChars += randomChars.toLowerCase();
    for (let i=0;i<length;i++){
        z += randomChars[Math.floor(Math.random()*randomChars.length)]
        if (!randomChars.includes('0'))    randomChars += '0123456789';
    }
    return z;
}
const stripJs = (s) => s.replace(
    /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (m, str) => str ?? ''
);
// The Core Proxy Route
app.get('/', (req, res) => {
    res.setHeader("Location","/pub/index.html");
    res.status(301);
    return res.send("<a href='/pub/index.html'>Here</a>")
})

app.get('/*targetUrl', async (req, res) => {
    const rawIp = req.ip || '';
    if (rawIp === '') {
        res.status(403).end();
        return; // get out no one doesn't have an ip
    }
    let newAdded = false;
    if (!Object.hasOwn(obfuscation_var_mappings, rawIp)) {
        obfuscation_var_mappings[rawIp] = new Map();
        newAdded = true;
    }
    if (USE_OBFUSCATION && newAdded) {
        obfuscation_var_mappings[rawIp].set("__MAINNAME__", randomName(10))
        obfuscation_var_mappings[rawIp].set("__ISOBFUSCATED__", "Obfuscated")
        obfuscation_var_mappings[rawIp].set("__CHEERIO__",randomName(10))
        obfuscation_var_mappings[rawIp].set("__VARMAINNAME__",randomName(10)) //__PROXY_URL__
        obfuscation_var_mappings[rawIp].set("__PROXY_URL__",randomName(10)) //__PROXY_URL__


    } else if (newAdded) {
        obfuscation_var_mappings[rawIp].set("__MAINNAME__", "pm")
        obfuscation_var_mappings[rawIp].set("__ISOBFUSCATED__", "Non-Obfuscated")
        obfuscation_var_mappings[rawIp].set("__CHEERIO__","cheerio");
        obfuscation_var_mappings[rawIp].set("__VARMAINNAME_","MAIN_NAME")
        obfuscation_var_mappings[rawIp].set("__PROXY_URL__", "PROXY_URL") //__PROXY_URL__
    }
    if (newAdded) {
        renameVars.forEach(z=>obfuscation_var_mappings[rawIp].set(z, USE_OBFUSCATION?randomName(10):z))
    }
    let targetUrl = req.originalUrl.slice(1);
    // Fix browsers/proxies that collapse 'https://' into 'https:/'
    targetUrl = targetUrl.replace(/^(https?:)\/([^/])/, '$1//$2');


    if (!targetUrl) {
        return res.status(400).send('Missing target URL');
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (targetUrl.startsWith('pub') || targetUrl.startsWith('api') || targetUrl === 'favicon.ico'){
        if (targetUrl === 'api/sw.js' || targetUrl == 'api/dist/sw.js'){
            res.setHeader("Service-Worker-Allowed","/")
        }
        const absolutePath = path.resolve(targetUrl);
        if (path.extname(absolutePath)==='.ico'){
            res.sendFile(absolutePath);
            return;
        }
        fs.readFile(absolutePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).end();
            }
            res.setHeader('Cache-Control', 'private, no-store')
            res.type(path.extname(absolutePath));
            if (path.extname(absolutePath)==='.ico'){
            res.send(data);
            return
            }
            let modifiedHtml = data;
            for (const [key, value] of obfuscation_var_mappings[rawIp]){
                modifiedHtml = modifiedHtml.replaceAll(`${key}`, value);
            }
            //if (path.extname(absolutePath)==='.js' && USE_OBFUSCATION) modifiedHtml = stripJs(modifiedHtml);

            res.send(modifiedHtml);
        });// {__MAINNAME__}
        return;
    }

    try {
        //console.log(`[Proxymoxy] Fetching: ${targetUrl}`);

        // 1. Fetch from the target server
        let formatUrl = new URL(decodeURIComponent(targetUrl));
        let headers = req.headers;
        headers["host"] = formatUrl.host;
        const response = await fetch(formatUrl.href, {
            headers: req.headers,
            redirect: 'manual',
        });
        res.status(response.status);
        response.headers.forEach((value, name) => {
            // Skip restricted headers like content-encoding if you alter the body
            if (name !== 'content-encoding' && name !== 'content-security-policy' && name !== "x-frame-options") {
                res.setHeader(name, value);
            }
        });

        const targetOrigin = formatUrl.origin;

        if (response.status >= 300 && response.status < 400) {
            var locHeader = response.headers.get('location');
            if (locHeader && !locHeader.startsWith('/')) {
                res.setHeader("location", `/${encodeURIComponent(locHeader)}`)
            } else if (locHeader){
                res.setHeader("location", `/${encodeURIComponent(targetOrigin + locHeader)}`);

            }
        }
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));
        // 2. Mirror original headers back to the browser

    } finally {

    }
});

app.listen(PORT, () => {
    console.log(`Proxymoxy running live at http://localhost:${PORT}`);
});