<div class="start">
    <div class="row">
        <div class="col-12">
            <h1>Welcome</h1>
            <p>FigSocket generates an enpoint that allows you to retrieve the JSON representation of any Figma file.</p>
        </div>
        <div class="col-12">
            <h3 class="mt-5">How To</h3>
            <hr>
            <p class="mt-2">Make sure the privacy settings for your Figma document are at least set to "can view".</p>
            <img class="w-100" src="images/can-view.png" />
            <p class="mt-4">Copy the URL to your Figma document and paste below.</p>
            <img class="w-100 mt-4" src="images/figma-url.png" />
        </div>
        <div class="col-12">
           <div class="mt-5">
               <form on:submit|preventDefault={handleSubmit}>
                    <input type="text" placeholder="Figma Document URL" bind:value="{url}" />
                    <button type="submit">Generate Endpoint</button>
               </form>

               <button on:click="{runDemo}">Run Demo</button>
           </div>
        </div>
    </div>
    <button on:click={() =>service.send("TAB_1")}>Tab 1</button>
    <button on:click={() =>service.send("TAB_2")}>Tab 2</button>
        
    {#each components as { component, children, props}}
        <svelte:component this={component.default} components={children}/>
    {/each}
</div>

<script>
import service from "shared/service.js";

export let components;

let url = "";

const handleSubmit = () => {
    service.send({
        type : "GENERATE",
        data : url,
    });
};

const runDemo = () => {
    url = "https://www.figma.com/file/EoIGjb8EwKbqjw7TRq5JUg/FigSocket?node-id=0%3A1";

    return handleSubmit();
};
</script>