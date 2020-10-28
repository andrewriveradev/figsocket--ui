<style lang="scss">
@import 'app';
</style>

<div class="app container justify-content-center mt-5 p-4">
    <div class="content">
        <div class="d-flex justify-content-between align-items-center pb-4">
            <h3 class="m-0">FigSocket</h3>
            <button use:send={"RESET"}>Reset</button>
        </div>
        <div class="view">
            {#each $components as { component, props, children } (component.default)}
                <svelte:component this={component.default} components={children} {...props} />
            {/each}
        </div>
        <div class="footer">

        </div>
    </div>
</div>

<script>
import { send } from "shared/actions.js";
import { components } from "shared/service.js";
</script>