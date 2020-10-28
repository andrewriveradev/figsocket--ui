
<div class="result">
    <h1>Result</h1>
    <a href="{endpoint}" target="_blank">{endpoint}</a>
</div>

<script>
    import service from "shared/service.js";

    $: ({ endpoint } = $service.context);
</script>