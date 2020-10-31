import { component } from "xcr";

export default {
    initial: "hide",

    on: {
        LOADER_SHOW : ".show",
        LOADER_HIDE : ".hide",
    },

    states: {
        hide: {},
        show: component(import("shared/components/loader.svelte")),
    }
};
