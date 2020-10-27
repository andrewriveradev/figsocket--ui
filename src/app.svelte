<style lang="scss">
@import 'app';
</style>

<div class="app">
    <div class="intro">
        <h1>FigSocket</h1>
        <p>Generate a JSON endpoint for any Figma document.</p>
        <h3>Getting Started</h3>
        <ol>
            <li>
                <p>Locate your Figma document URL.</p>
                <img width="100%" src="image/figma-url.png" />
            </li>
            <li>
                <p>Confirm your document share permissions are set to public.</p>
                <img width="100%" src="image/screenshot.png" />
            </li>
        </ol>
    </div>
    <div class="content offset">
        <form on:submit|preventDefault="{generateEndpoint}">
            <input
                class="link-field"
                type="text"
                bind:value="{url}"
                placeholder="Document URL"
                disabled={endpoint || loading}
            />
        </form>
        <div class="buttons">
            {#if !loading && !endpoint}
                <button class="button" on:click="{generateEndpoint}">Generate Endpoint</button>
                <button class="button faint" on:click="{runDemo}">Run Demo</button>
            {/if}
            {#if endpoint}
                <a class="button bg-green" href="{url}" target="_blank">
                    <span>
                        <img height="15" src="image/figma.png" />
                    </span>
                    Figma Document
                </a>
                <a class="button bg-gray" href="{endpoint}" target="_blank">
                    <span>
                        &#123; &#125; 
                    </span>
                    JSON Endpoint
                </a>
            {/if}
        </div>
    </div>
    {#if loading}
        <div class="loader">
            <img src="image/loader.svg" height="20"/>
        </div>
    {/if}
    
    {#if endpoint}
        <div class="preview">
            <h3>JSON Preview</h3>

            {#if !preview}
                <div class="loader">
                    <img src="image/loader.svg" height="20"/>
                </div>
            {:else}
                <Preview {preview}/>
            {/if}
        </div>
    {/if}
</div>

<script>
    import Preview from "./shared/components/preview.svelte";

    let url = "";
    let error = false;
    let loading = false;
    let preview = false;
    let endpoint = false;

    const url = "https://fig-socket.vercel.app";

    const generateEndpoint = async () => {
        error = false;
        loading = true;

        try {
            const response = await fetch(`${url}/api/generate-endpoint?url=${encodeURIComponent(url)}`);

            ({ endpoint } = await response.json());
            loading = false;

            return fetchPreview()
        } catch(error) {
            console.log(error);
            error = true;
            loading = false;
        }
    }

    const fetchPreview = async () => {
        const response = await fetch(endpoint);

        const json = await response.json();

        return (preview = JSON.stringify(json, null, 4));
    }

    const runDemo = () => {
        loading = true;

        url = "https://www.figma.com/file/EoIGjb8EwKbqjw7TRq5JUg/FigSocket?node-id=0%3A1";
        setTimeout(generateEndpoint, 500);
    }

    const resetState = () => {
        error = false;
        loading = false;
        endpoint = false;
    }
</script>
