import views from "./views.partial.js";
import loader from "./loader.partial.js";

export default {
    type : "parallel",

    context : {
        url      : "",
        endpoint : "",
        result   : "",
    },

    states : {
        views,
        loader,
    },
};
