import {__VARMAINNAME__} from "../common/shared.js";
import { run as lrun } from './location.js';
import { run as crun } from './codewrappers.js';
crun()
lrun(`$${__VARMAINNAME__}$location`, `$${__VARMAINNAME__}$prop`)
import { run } from './main.js'
run()