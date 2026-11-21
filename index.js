import path from 'node:path';
import express from 'express';
import * as fs from "node:fs";
import { readdir } from "node:fs/promises";
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
const app = express();
app.set('trust proxy', true)
const PORT = process.env.PORT || 3000;
const USE_OBFUSCATION = 0;
const obfuscation_var_mappings = {};
const obfuscation_js_remap = {};

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
    "fromOrigin",
    "attrName",
    "visitor",
    "__node__"
]
async function findJsFiles(dir = './') {
    return (await readdir(dir, { recursive: true })).filter(file =>
        path.extname(file) === '.js' && !file.includes('node_modules')
    );
}
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

// The Core Proxy Route
app.get('/', (req, res) => {
    res.setHeader("Location","/pub/index.html");
    res.status(301);
    return res.send("<a href='/pub/index.html'>Here</a>")
})
function isDuplicate(ip, value){
    const innerMap = obfuscation_js_remap[ip];
    return innerMap ? Array.from(innerMap.values()).includes(value) : false;
}
function reverseGet(map, value){for(let [a,b]of map)if(b===value)return a
    return null;}

app.all('/*targetUrl', async (req, res) => {
    console.log(req.originalUrl)
    const rawIp = req.ip || '';
    if (rawIp === '') {
        res.status(403).end();
        return; // get out no one doesn't have an ip
    }
    let newAdded = false;
    if (!Object.hasOwn(obfuscation_var_mappings, rawIp)) {
        obfuscation_var_mappings[rawIp] = new Map();
        obfuscation_js_remap[rawIp] = new Map();
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
        (await findJsFiles("pub/")).forEach(file => {
                        if (!path.basename(file).endsWith('.js')) return;

            if (!USE_OBFUSCATION){
                obfuscation_js_remap[rawIp][file]=file;
                return;
            }
            let genName = uniqueNamesGenerator({
                dictionaries: [adjectives, animals],
                separator: '',
                style: 'capital'
            });
            let name = path.join(path.dirname(file), genName + path.extname(file));

            while (isDuplicate(rawIp, name)){ 
                genName = uniqueNamesGenerator({
                    dictionaries: [adjectives, animals],
                    separator: '',
                    style: 'capital'
                });
                name = path.join(path.dirname(file), genName + path.extname(file));
            }
            obfuscation_js_remap[rawIp].set(file, name);
        })
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
        if (targetUrl === 'api/sw.js' || targetUrl === 'api/dist/sw.js'){
            res.setHeader("Service-Worker-Allowed","/")
        }
        if (targetUrl.startsWith("pub")){
            if (USE_OBFUSCATION){
                if (obfuscation_js_remap[rawIp].get(targetUrl.substring(4))) return res.status(500); // this works
            }
            // do rerouting
            targetUrl = 'pub/' + (reverseGet(obfuscation_js_remap[rawIp], targetUrl.substring(4)) ?? targetUrl.substring(4))
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
            const merged = new Map([
    ...obfuscation_var_mappings[rawIp],
    ...(targetUrl.startsWith('pub')?obfuscation_js_remap[rawIp]:new Map())
]);
            for (const [key, value] of merged){
                modifiedHtml = modifiedHtml.replaceAll(`${key}`, value);
            }
            //if (path.extname(absolutePath)==='.js' && USE_OBFUSCATION) modifiedHtml = stripJs(modifiedHtml);

            res.send(modifiedHtml);
        });// {__MAINNAME__}
        return;
    }
    return res.status(200).send("yup, proxies working, if you've gotten here during normal browsing, report this to the developers");
    try {
        //console.log(`[Proxymoxy] Fetching: ${targetUrl}`);

        // 1. Fetch from the target server
        let formatUrl = new URL(decodeURIComponent(targetUrl));
        let headers = req.headers;
        headers["host"] = formatUrl.host;
        const isGetOrHead = ['GET', 'HEAD'].includes(req.method.toUpperCase());
        const response = await fetch(formatUrl.href, {
            headers: req.headers,
            redirect: 'manual',
            body: isGetOrHead ? undefined : req,
            ...(isGetOrHead ? {} : { duplex: 'half' }),
            method: req.method
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
//window[btoa('zö¥')](window[btoa('jÚ')]([...'=kSMoQnclxWY'].reverse()[btoa('§')]('')))  