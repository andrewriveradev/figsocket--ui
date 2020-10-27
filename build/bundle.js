
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    (function() {
        const env = {"NODE_ENV":false};
        try {
            if (process) {
                process.env = Object.assign({}, process.env);
                Object.assign(process.env, env);
                return;
            }
        } catch (e) {} // avoid ReferenceError: process is not defined
        globalThis.process = { env:env };
    })();

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const file = "src\\shared\\components\\preview.svelte";

    function create_fragment(ctx) {
    	let pre;
    	let code;
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			code = element("code");
    			t = text(/*preview*/ ctx[0]);
    			attr_dev(code, "class", "language-javascript");
    			add_location(code, file, 1, 4, 11);
    			add_location(pre, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, code);
    			append_dev(code, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*preview*/ 1) set_data_dev(t, /*preview*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Preview", slots, []);
    	let { preview } = $$props;

    	onMount(() => {
    		const newScript = document.createElement("script");
    		newScript.src = "prism.js";
    		document.body.appendChild(newScript);
    	});

    	const writable_props = ["preview"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Preview> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("preview" in $$props) $$invalidate(0, preview = $$props.preview);
    	};

    	$$self.$capture_state = () => ({ onMount, preview });

    	$$self.$inject_state = $$props => {
    		if ("preview" in $$props) $$invalidate(0, preview = $$props.preview);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [preview];
    }

    class Preview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { preview: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Preview",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*preview*/ ctx[0] === undefined && !("preview" in props)) {
    			console.warn("<Preview> was created without expected prop 'preview'");
    		}
    	}

    	get preview() {
    		throw new Error("<Preview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set preview(value) {
    		throw new Error("<Preview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const { console: console_1 } = globals;
    const file$1 = "src\\app.svelte";

    // (118:12) {#if !loading && !endpoint}
    function create_if_block_4(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Generate Endpoint";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Run Demo";
    			attr_dev(button0, "class", "button svelte-1llxjy4");
    			add_location(button0, file$1, 118, 16, 2764);
    			attr_dev(button1, "class", "button faint svelte-1llxjy4");
    			add_location(button1, file$1, 119, 16, 2861);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*generateEndpoint*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*runDemo*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(118:12) {#if !loading && !endpoint}",
    		ctx
    	});

    	return block;
    }

    // (122:12) {#if endpoint}
    function create_if_block_3(ctx) {
    	let a0;
    	let span0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let a1;
    	let span1;
    	let t3;

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			span0 = element("span");
    			img = element("img");
    			t0 = text("\r\n                    Figma Document");
    			t1 = space();
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "{ }";
    			t3 = text("\r\n                    JSON Endpoint");
    			attr_dev(img, "height", "15");
    			if (img.src !== (img_src_value = "image/figma.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1llxjy4");
    			add_location(img, file$1, 124, 24, 3103);
    			attr_dev(span0, "class", "svelte-1llxjy4");
    			add_location(span0, file$1, 123, 20, 3071);
    			attr_dev(a0, "class", "button bg-green svelte-1llxjy4");
    			attr_dev(a0, "href", /*url*/ ctx[0]);
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$1, 122, 16, 2993);
    			attr_dev(span1, "class", "svelte-1llxjy4");
    			add_location(span1, file$1, 129, 20, 3331);
    			attr_dev(a1, "class", "button bg-gray svelte-1llxjy4");
    			attr_dev(a1, "href", /*endpoint*/ ctx[3]);
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$1, 128, 16, 3249);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, span0);
    			append_dev(span0, img);
    			append_dev(a0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a1, anchor);
    			append_dev(a1, span1);
    			append_dev(a1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*url*/ 1) {
    				attr_dev(a0, "href", /*url*/ ctx[0]);
    			}

    			if (dirty & /*endpoint*/ 8) {
    				attr_dev(a1, "href", /*endpoint*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(122:12) {#if endpoint}",
    		ctx
    	});

    	return block;
    }

    // (138:4) {#if loading}
    function create_if_block_2(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "image/loader.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "20");
    			attr_dev(img, "class", "svelte-1llxjy4");
    			add_location(img, file$1, 139, 12, 3573);
    			attr_dev(div, "class", "loader svelte-1llxjy4");
    			add_location(div, file$1, 138, 8, 3539);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(138:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (144:4) {#if endpoint}
    function create_if_block(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*preview*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "JSON Preview";
    			t1 = space();
    			if_block.c();
    			attr_dev(h3, "class", "svelte-1llxjy4");
    			add_location(h3, file$1, 145, 12, 3712);
    			attr_dev(div, "class", "preview svelte-1llxjy4");
    			add_location(div, file$1, 144, 8, 3677);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(144:4) {#if endpoint}",
    		ctx
    	});

    	return block;
    }

    // (152:12) {:else}
    function create_else_block(ctx) {
    	let preview_1;
    	let current;

    	preview_1 = new Preview({
    			props: { preview: /*preview*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(preview_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(preview_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const preview_1_changes = {};
    			if (dirty & /*preview*/ 4) preview_1_changes.preview = /*preview*/ ctx[2];
    			preview_1.$set(preview_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(preview_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(preview_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(preview_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(152:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (148:12) {#if !preview}
    function create_if_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "image/loader.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "height", "20");
    			attr_dev(img, "class", "svelte-1llxjy4");
    			add_location(img, file$1, 149, 20, 3823);
    			attr_dev(div, "class", "loader svelte-1llxjy4");
    			add_location(div, file$1, 148, 16, 3781);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(148:12) {#if !preview}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let h3;
    	let t5;
    	let ol;
    	let li0;
    	let p1;
    	let t7;
    	let img0;
    	let img0_src_value;
    	let t8;
    	let li1;
    	let p2;
    	let t10;
    	let img1;
    	let img1_src_value;
    	let t11;
    	let div2;
    	let form;
    	let input;
    	let input_disabled_value;
    	let t12;
    	let div1;
    	let t13;
    	let t14;
    	let t15;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*loading*/ ctx[1] && !/*endpoint*/ ctx[3] && create_if_block_4(ctx);
    	let if_block1 = /*endpoint*/ ctx[3] && create_if_block_3(ctx);
    	let if_block2 = /*loading*/ ctx[1] && create_if_block_2(ctx);
    	let if_block3 = /*endpoint*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "FigSocket";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Generate a JSON endpoint for any Figma document.";
    			t3 = space();
    			h3 = element("h3");
    			h3.textContent = "Getting Started";
    			t5 = space();
    			ol = element("ol");
    			li0 = element("li");
    			p1 = element("p");
    			p1.textContent = "Locate your Figma document URL.";
    			t7 = space();
    			img0 = element("img");
    			t8 = space();
    			li1 = element("li");
    			p2 = element("p");
    			p2.textContent = "Confirm your document share permissions are set to public.";
    			t10 = space();
    			img1 = element("img");
    			t11 = space();
    			div2 = element("div");
    			form = element("form");
    			input = element("input");
    			t12 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t13 = space();
    			if (if_block1) if_block1.c();
    			t14 = space();
    			if (if_block2) if_block2.c();
    			t15 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(h1, "class", "svelte-1llxjy4");
    			add_location(h1, file$1, 92, 8, 1832);
    			attr_dev(p0, "class", "svelte-1llxjy4");
    			add_location(p0, file$1, 93, 8, 1860);
    			attr_dev(h3, "class", "svelte-1llxjy4");
    			add_location(h3, file$1, 94, 8, 1925);
    			attr_dev(p1, "class", "svelte-1llxjy4");
    			add_location(p1, file$1, 97, 16, 1999);
    			attr_dev(img0, "width", "100%");
    			if (img0.src !== (img0_src_value = "image/figma-url.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "svelte-1llxjy4");
    			add_location(img0, file$1, 98, 16, 2055);
    			attr_dev(li0, "class", "svelte-1llxjy4");
    			add_location(li0, file$1, 96, 12, 1977);
    			attr_dev(p2, "class", "svelte-1llxjy4");
    			add_location(p2, file$1, 101, 16, 2156);
    			attr_dev(img1, "width", "100%");
    			if (img1.src !== (img1_src_value = "image/screenshot.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "svelte-1llxjy4");
    			add_location(img1, file$1, 102, 16, 2239);
    			attr_dev(li1, "class", "svelte-1llxjy4");
    			add_location(li1, file$1, 100, 12, 2134);
    			attr_dev(ol, "class", "svelte-1llxjy4");
    			add_location(ol, file$1, 95, 8, 1959);
    			attr_dev(div0, "class", "intro svelte-1llxjy4");
    			add_location(div0, file$1, 91, 4, 1803);
    			attr_dev(input, "class", "link-field svelte-1llxjy4");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Document URL");
    			input.disabled = input_disabled_value = /*endpoint*/ ctx[3] || /*loading*/ ctx[1];
    			add_location(input, file$1, 108, 12, 2442);
    			attr_dev(form, "class", "svelte-1llxjy4");
    			add_location(form, file$1, 107, 8, 2376);
    			attr_dev(div1, "class", "buttons svelte-1llxjy4");
    			add_location(div1, file$1, 116, 8, 2684);
    			attr_dev(div2, "class", "content offset svelte-1llxjy4");
    			add_location(div2, file$1, 106, 4, 2338);
    			attr_dev(div3, "class", "app svelte-1llxjy4");
    			add_location(div3, file$1, 90, 0, 1780);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, h3);
    			append_dev(div0, t5);
    			append_dev(div0, ol);
    			append_dev(ol, li0);
    			append_dev(li0, p1);
    			append_dev(li0, t7);
    			append_dev(li0, img0);
    			append_dev(ol, t8);
    			append_dev(ol, li1);
    			append_dev(li1, p2);
    			append_dev(li1, t10);
    			append_dev(li1, img1);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, form);
    			append_dev(form, input);
    			set_input_value(input, /*url*/ ctx[0]);
    			append_dev(div2, t12);
    			append_dev(div2, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t13);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div3, t14);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t15);
    			if (if_block3) if_block3.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*generateEndpoint*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*endpoint, loading*/ 10 && input_disabled_value !== (input_disabled_value = /*endpoint*/ ctx[3] || /*loading*/ ctx[1])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty & /*url*/ 1 && input.value !== /*url*/ ctx[0]) {
    				set_input_value(input, /*url*/ ctx[0]);
    			}

    			if (!/*loading*/ ctx[1] && !/*endpoint*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div1, t13);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*endpoint*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*loading*/ ctx[1]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(div3, t15);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*endpoint*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*endpoint*/ 8) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div3, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let url = "";
    	let error = false;
    	let loading = false;
    	let preview = false;
    	let endpoint = false;

    	const generateEndpoint = async () => {
    		error = false;
    		$$invalidate(1, loading = true);

    		try {
    			const response = await fetch(`/api/generate-endpoint?url=${encodeURIComponent(url)}`);
    			$$invalidate(3, { endpoint } = await response.json(), endpoint);
    			$$invalidate(1, loading = false);
    			return fetchPreview();
    		} catch(error) {
    			console.log(error);
    			error = true;
    			$$invalidate(1, loading = false);
    		}
    	};

    	const fetchPreview = async () => {
    		const response = await fetch(endpoint);
    		const json = await response.json();
    		return $$invalidate(2, preview = JSON.stringify(json, null, 4));
    	};

    	const runDemo = () => {
    		$$invalidate(1, loading = true);
    		$$invalidate(0, url = "https://www.figma.com/file/EoIGjb8EwKbqjw7TRq5JUg/FigSocket?node-id=0%3A1");
    		setTimeout(generateEndpoint, 500);
    	};

    	const resetState = () => {
    		error = false;
    		$$invalidate(1, loading = false);
    		$$invalidate(3, endpoint = false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		url = this.value;
    		$$invalidate(0, url);
    	}

    	$$self.$capture_state = () => ({
    		Preview,
    		url,
    		error,
    		loading,
    		preview,
    		endpoint,
    		generateEndpoint,
    		fetchPreview,
    		runDemo,
    		resetState
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("error" in $$props) error = $$props.error;
    		if ("loading" in $$props) $$invalidate(1, loading = $$props.loading);
    		if ("preview" in $$props) $$invalidate(2, preview = $$props.preview);
    		if ("endpoint" in $$props) $$invalidate(3, endpoint = $$props.endpoint);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		url,
    		loading,
    		preview,
    		endpoint,
    		generateEndpoint,
    		runDemo,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
