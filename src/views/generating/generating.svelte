<h1>Generating</h1>
<p>{url}</p>

<script>
    import service from "shared/service.js";

    $: ({ url } = $service.context);
</script>