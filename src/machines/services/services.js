import config from "shared/config.js";

const { API_URL } = config;

export default {
    generateEndpoint : ({ url }) => async () => {
        try {
            const response = await fetch(`${API_URL}/generate-endpoint?url=${encodeURIComponent(url)}`);
            
            return response.json();
        } catch(err) {
            console.log(err);
            throw err;
        }
    },
};
