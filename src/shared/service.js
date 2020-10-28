import xcr from "xcr";
import { writable } from "svelte/store";

import config from "machines/main.machine.js";
import services from "machines/services/services.js";
import guards from "machines/guards/guards.js";
 
const { service, components } = xcr({
    xstate : {
        config,
        options : {
            services,
            guards,
        },
    },

    options : {
        debug : true,
    },
});
 
// Whenever the tree updates save value off to tree store.
const tree = writable([],
    (set) => {
        components((list) => {
            set(list);
        });
    }
);
 
export default service;
export {
    tree as components,
};
