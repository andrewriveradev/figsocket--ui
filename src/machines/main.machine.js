import views from "./views.partial.js";
import overlays from "./overlays.partial.js";

export default {
    type : "parallel",

    context : {
        url      : "",
        endpoint : "",
        result   : "",
    },

    states : {
        views,
        overlays,
    },
};
