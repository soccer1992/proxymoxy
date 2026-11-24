import {proxyWrapUrl, getUnwrapped} from '../common/shared.js';

function run(locationVar, propertyVar, evalVar){


    let originalWindow = window;
    let originalLocation = location;
    let originalThis = this;

    let locationProxy = {}
    Object.setPrototypeOf(locationProxy, Location.prototype); // since proxying raw location is a pain
    locationProxy.constructor = Location;

    let fakeLocation = getUnwrapped(originalLocation);
    const urlprops = [
        "protocol",
        "hash",
        "host",
        "hostname",
        "href",
        "origin",
        "pathname",
        "port",
        "search",
    ]; // shared between URL and Location
    for (let p of urlprops){
        if (!Object.hasOwn(originalLocation, p)) continue;
        let descriptor = Object.getOwnPropertyDescriptor(originalLocation, p);
        const desc = {
            configurable: false,
            enumerable: true,
        };
        if (descriptor.get){
            desc.get = new Proxy(descriptor.get, {
                apply(){
                    return fakeLocation[p]
                }
            })
        }
        if (descriptor.set){
            desc.set = new Proxy(descriptor.set, {
                apply(target, thisArg, argArray) {
                    fakeLocation[p] = argArray[0];
                    if (p === 'hash'){
                        // special case where you should never modify .href
                        originalLocation[p] = fakeLocation[p]
                    } else {
                        originalLocation.href = proxyWrapUrl(fakeLocation.href, fakeLocation.origin);
                    }
                }
            })
        }
        Object.defineProperty(locationProxy, p, desc);

    }

    locationProxy.toString = new Proxy(originalLocation.toString, {
        apply(){
            return locationProxy.href;
        }
    });
    if (originalLocation.valueOf){
        locationProxy.valueOf = new Proxy(originalLocation.valueOf, {
            apply(){
                return locationProxy;
            }
        });
    }
    if (originalLocation.assign){
        locationProxy.assign = new Proxy(originalLocation.assign, {
            apply(target, that, args){
                 args[0] = proxyWrapUrl(args[0], locationProxy.href);
                 Reflect.apply(target, originalLocation, args)
            }
        });
    }

    if (originalLocation.reload){
        locationProxy.reload = new Proxy(originalLocation.reload, {
            apply(target, that, args){
                Reflect.apply(target, originalLocation, args) // really bro
            }
        });
    }
    if (originalLocation.replace){
        locationProxy.replace = new Proxy(originalLocation.replace, {
            apply(target, that, args){
                args[0] = proxyWrapUrl(args[0], locationProxy.href);
                Reflect.apply(target, originalLocation, args)
            }
        });
    }

    if (!Object.hasOwn(Object.prototype, locationVar)) Object.defineProperty(Object.prototype,locationVar, {
        get() {
            if (this === originalWindow){
                return locationProxy;
            } else {
                return Reflect.get(this, 'location');
            }
        },
        set(newValue){
            if (this === originalWindow){
                // really.
                locationProxy.href = newValue;
            } else {
                return Reflect.set(this, 'location', newValue);
            }
        },
        enumerable: false,
        configurable: false

    });
    if (!Object.hasOwn(window, propertyVar)) {
        Object.defineProperty(window, propertyVar, {
            value: function(arg) {
                switch (arg) {
                    case "location":
                        return locationVar;
                    case "eval":
                        return evalVar;
                    default:
                        return arg;
                }
            },
            writable: false,
            enumerable: true,
            configurable: false
        });
    }
    let originalFetch = originalWindow.fetch;
    let originalXHROpen = XMLHttpRequest.prototype.open;

    originalWindow.fetch = new Proxy(originalWindow.fetch, {
        async apply(target, thisArg, args){
            args[0] = proxyWrapUrl(args[0], locationProxy.href);
            return Reflect.apply(target, thisArg, args);
        }
    })
    originalWindow.XMLHttpRequest.prototype.open = new Proxy(originalWindow.XMLHttpRequest.prototype.open, {
        apply(target, thisArg, args){
            args[1] = proxyWrapUrl(args[1], locationProxy.href);
            return Reflect.apply(target, thisArg, args);
        }
    })
}
export {run};