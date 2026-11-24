import { getUnwrapped} from "../common/shared.js";
import { wrapJS } from "../common/rewriters.js";
import {__VARMAINNAME__} from "../common/constants.js";
export function run(evalVar){
  Object.defineProperty(Object.prototype, `$${__VARMAINNAME__}$rewrite`, {
    value:(a,b)=>wrapJS(a,b===undefined?getUnwrapped(location.href):b),
    enumerable:!1,
    configurable:!0,
    writable:!1
  });
    const evalProxy = new Proxy(window.eval, {
    apply(target,thisArg, args) {
      args[0] = wrapJS(args[0].toString(), getUnwrapped(location.href));
      return Reflect.apply(target, thisArg, args);
    }
  })
      if (!Object.hasOwn(Object.prototype, evalVar)) Object.defineProperty(Object.prototype,evalVar, {
        get() {
            if (this === window){
                return evalProxy;
            } else {
                return Reflect.get(this, 'eval');
            }
        },
        set(newValue){
          return Reflect.set(this, 'eval', newValue);
        },
        enumerable: false,
        configurable: false

    });

    // new Function
    const FunctionProxy = new Proxy(window.Function, {
      construct(target, args, newTarget) {
        const nextArgs = [...args];
        if (nextArgs.length > 0) {
          nextArgs[nextArgs.length - 1] = wrapJS(String(nextArgs[nextArgs.length - 1]), getUnwrapped(location.href));
        } else {
          nextArgs.push(''); // bruh.
        }
        const actualNewTarget = newTarget === FunctionProxy ? target : newTarget;
        return Reflect.construct(target, nextArgs, actualNewTarget);
      },

      apply(target, thisArg, args) {
        const nextArgs = [...args];
        if (nextArgs.length > 0) {
          nextArgs[nextArgs.length - 1] = wrapJS(String(nextArgs[nextArgs.length - 1]), getUnwrapped(location.href));
        } else {
          nextArgs.push(''); // bruh.
        }
        return Reflect.construct(target, nextArgs);
      }
    });

window.Function = FunctionProxy;
Object.defineProperty(Function.prototype, 'constructor', {
  value: FunctionProxy,
  writable: true,
  configurable: true
});
}