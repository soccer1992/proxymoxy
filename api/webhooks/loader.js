import {__VARMAINNAME__} from "../common/constants.js";
import { run as lrun } from './location.js';
import { run as crun } from './codewrappers.js';
import { run } from './main.js'
crun()
lrun(`$${__VARMAINNAME__}$location`, `$${__VARMAINNAME__}$prop`)
run()