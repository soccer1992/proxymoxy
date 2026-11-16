import { getUnwrapped } from "../common/shared.js";
import { wrapJS } from "../common/rewriters.js";
export function run(){
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