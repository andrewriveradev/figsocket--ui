<pre>
    <code class="language-javascript">
        {preview}
    </code>
</pre>

<script>
    import { onMount } from "svelte";

    export let preview;

    onMount(() => {
        const newScript = document.createElement("script");
  
        newScript.src = "prism.js";
        document.body.appendChild(newScript);
    });
</script>