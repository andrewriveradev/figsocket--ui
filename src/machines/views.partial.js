import { component } from "xcr";
import { actions, assign } from "xstate";

const { raise } = actions;

export default {
    initial : "boot",

    on : {
        APP_READY : ".start",
        RESET : ".start",
        RESULT : ".result",
    },
    states : {
        // Check local storage for previous result
        boot : {
            entry : raise("APP_READY")
        },

        // Start screen
        start : component(import("views/start/start.svelte"), {
            on : {
                GENERATE : {
                    target : "generating",

                    actions : assign({
                        url : (_, { data : url }) => url,
                    })
                },
            }
        }),

        // Generating endpoint and getting preview
        generating : component(import("views/generating/generating.svelte"), {
            initial : "generate",
            
            on : {
                GENERATE_COMPLETE : "result",
            },

            states : {
                generate : {
                    invoke : {
                        src: "generateEndpoint",
                        onDone : {
                            target: "done",
                            actions : [
                                assign({
                                    endpoint : (_, { data : { endpoint }}) => endpoint,
                                }),
                            ],
                        },
                        onError : {
                            target : "error"
                        }
                    }
                },
                done : {
                    after : {
                        2000 : {
                            actions : raise("GENERATE_COMPLETE")
                        }
                    }
                },
                error : {
                    entry : console.log
                },
            }
        }),

        // Load main UI
        result : component(import("views/result/result.svelte"), {

        }),
    },
};
