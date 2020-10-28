
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
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
    function empty() {
        return text('');
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
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var runtime_1 = createCommonjsModule(function (module) {
    /**
     * Copyright (c) 2014-present, Facebook, Inc.
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE file in the root directory of this source tree.
     */

    var runtime = (function (exports) {

      var Op = Object.prototype;
      var hasOwn = Op.hasOwnProperty;
      var undefined$1; // More compressible than void 0.
      var $Symbol = typeof Symbol === "function" ? Symbol : {};
      var iteratorSymbol = $Symbol.iterator || "@@iterator";
      var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
      var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

      function define(obj, key, value) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
        return obj[key];
      }
      try {
        // IE 8 has a broken Object.defineProperty that only works on DOM objects.
        define({}, "");
      } catch (err) {
        define = function(obj, key, value) {
          return obj[key] = value;
        };
      }

      function wrap(innerFn, outerFn, self, tryLocsList) {
        // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
        var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
        var generator = Object.create(protoGenerator.prototype);
        var context = new Context(tryLocsList || []);

        // The ._invoke method unifies the implementations of the .next,
        // .throw, and .return methods.
        generator._invoke = makeInvokeMethod(innerFn, self, context);

        return generator;
      }
      exports.wrap = wrap;

      // Try/catch helper to minimize deoptimizations. Returns a completion
      // record like context.tryEntries[i].completion. This interface could
      // have been (and was previously) designed to take a closure to be
      // invoked without arguments, but in all the cases we care about we
      // already have an existing method we want to call, so there's no need
      // to create a new function object. We can even get away with assuming
      // the method takes exactly one argument, since that happens to be true
      // in every case, so we don't have to touch the arguments object. The
      // only additional allocation required is the completion record, which
      // has a stable shape and so hopefully should be cheap to allocate.
      function tryCatch(fn, obj, arg) {
        try {
          return { type: "normal", arg: fn.call(obj, arg) };
        } catch (err) {
          return { type: "throw", arg: err };
        }
      }

      var GenStateSuspendedStart = "suspendedStart";
      var GenStateSuspendedYield = "suspendedYield";
      var GenStateExecuting = "executing";
      var GenStateCompleted = "completed";

      // Returning this object from the innerFn has the same effect as
      // breaking out of the dispatch switch statement.
      var ContinueSentinel = {};

      // Dummy constructor functions that we use as the .constructor and
      // .constructor.prototype properties for functions that return Generator
      // objects. For full spec compliance, you may wish to configure your
      // minifier not to mangle the names of these two functions.
      function Generator() {}
      function GeneratorFunction() {}
      function GeneratorFunctionPrototype() {}

      // This is a polyfill for %IteratorPrototype% for environments that
      // don't natively support it.
      var IteratorPrototype = {};
      IteratorPrototype[iteratorSymbol] = function () {
        return this;
      };

      var getProto = Object.getPrototypeOf;
      var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
      if (NativeIteratorPrototype &&
          NativeIteratorPrototype !== Op &&
          hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
        // This environment has a native %IteratorPrototype%; use it instead
        // of the polyfill.
        IteratorPrototype = NativeIteratorPrototype;
      }

      var Gp = GeneratorFunctionPrototype.prototype =
        Generator.prototype = Object.create(IteratorPrototype);
      GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
      GeneratorFunctionPrototype.constructor = GeneratorFunction;
      GeneratorFunction.displayName = define(
        GeneratorFunctionPrototype,
        toStringTagSymbol,
        "GeneratorFunction"
      );

      // Helper for defining the .next, .throw, and .return methods of the
      // Iterator interface in terms of a single ._invoke method.
      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function(method) {
          define(prototype, method, function(arg) {
            return this._invoke(method, arg);
          });
        });
      }

      exports.isGeneratorFunction = function(genFun) {
        var ctor = typeof genFun === "function" && genFun.constructor;
        return ctor
          ? ctor === GeneratorFunction ||
            // For the native GeneratorFunction constructor, the best we can
            // do is to check its .name property.
            (ctor.displayName || ctor.name) === "GeneratorFunction"
          : false;
      };

      exports.mark = function(genFun) {
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
        } else {
          genFun.__proto__ = GeneratorFunctionPrototype;
          define(genFun, toStringTagSymbol, "GeneratorFunction");
        }
        genFun.prototype = Object.create(Gp);
        return genFun;
      };

      // Within the body of any async function, `await x` is transformed to
      // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
      // `hasOwn.call(value, "__await")` to determine if the yielded value is
      // meant to be awaited.
      exports.awrap = function(arg) {
        return { __await: arg };
      };

      function AsyncIterator(generator, PromiseImpl) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);
          if (record.type === "throw") {
            reject(record.arg);
          } else {
            var result = record.arg;
            var value = result.value;
            if (value &&
                typeof value === "object" &&
                hasOwn.call(value, "__await")) {
              return PromiseImpl.resolve(value.__await).then(function(value) {
                invoke("next", value, resolve, reject);
              }, function(err) {
                invoke("throw", err, resolve, reject);
              });
            }

            return PromiseImpl.resolve(value).then(function(unwrapped) {
              // When a yielded Promise is resolved, its final value becomes
              // the .value of the Promise<{value,done}> result for the
              // current iteration.
              result.value = unwrapped;
              resolve(result);
            }, function(error) {
              // If a rejected Promise was yielded, throw the rejection back
              // into the async generator function so it can be handled there.
              return invoke("throw", error, resolve, reject);
            });
          }
        }

        var previousPromise;

        function enqueue(method, arg) {
          function callInvokeWithMethodAndArg() {
            return new PromiseImpl(function(resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }

          return previousPromise =
            // If enqueue has been called before, then we want to wait until
            // all previous Promises have been resolved before calling invoke,
            // so that results are always delivered in the correct order. If
            // enqueue has not been called before, then it is important to
            // call invoke immediately, without waiting on a callback to fire,
            // so that the async generator function has the opportunity to do
            // any necessary setup in a predictable way. This predictability
            // is why the Promise constructor synchronously invokes its
            // executor callback, and why async functions synchronously
            // execute code before the first await. Since we implement simple
            // async functions in terms of async generators, it is especially
            // important to get this right, even though it requires care.
            previousPromise ? previousPromise.then(
              callInvokeWithMethodAndArg,
              // Avoid propagating failures to Promises returned by later
              // invocations of the iterator.
              callInvokeWithMethodAndArg
            ) : callInvokeWithMethodAndArg();
        }

        // Define the unified helper method that is used to implement .next,
        // .throw, and .return (see defineIteratorMethods).
        this._invoke = enqueue;
      }

      defineIteratorMethods(AsyncIterator.prototype);
      AsyncIterator.prototype[asyncIteratorSymbol] = function () {
        return this;
      };
      exports.AsyncIterator = AsyncIterator;

      // Note that simple async functions are implemented on top of
      // AsyncIterator objects; they just return a Promise for the value of
      // the final result produced by the iterator.
      exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
        if (PromiseImpl === void 0) PromiseImpl = Promise;

        var iter = new AsyncIterator(
          wrap(innerFn, outerFn, self, tryLocsList),
          PromiseImpl
        );

        return exports.isGeneratorFunction(outerFn)
          ? iter // If outerFn is a generator, return the full iterator.
          : iter.next().then(function(result) {
              return result.done ? result.value : iter.next();
            });
      };

      function makeInvokeMethod(innerFn, self, context) {
        var state = GenStateSuspendedStart;

        return function invoke(method, arg) {
          if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
          }

          if (state === GenStateCompleted) {
            if (method === "throw") {
              throw arg;
            }

            // Be forgiving, per 25.3.3.3.3 of the spec:
            // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
            return doneResult();
          }

          context.method = method;
          context.arg = arg;

          while (true) {
            var delegate = context.delegate;
            if (delegate) {
              var delegateResult = maybeInvokeDelegate(delegate, context);
              if (delegateResult) {
                if (delegateResult === ContinueSentinel) continue;
                return delegateResult;
              }
            }

            if (context.method === "next") {
              // Setting context._sent for legacy support of Babel's
              // function.sent implementation.
              context.sent = context._sent = context.arg;

            } else if (context.method === "throw") {
              if (state === GenStateSuspendedStart) {
                state = GenStateCompleted;
                throw context.arg;
              }

              context.dispatchException(context.arg);

            } else if (context.method === "return") {
              context.abrupt("return", context.arg);
            }

            state = GenStateExecuting;

            var record = tryCatch(innerFn, self, context);
            if (record.type === "normal") {
              // If an exception is thrown from innerFn, we leave state ===
              // GenStateExecuting and loop back for another invocation.
              state = context.done
                ? GenStateCompleted
                : GenStateSuspendedYield;

              if (record.arg === ContinueSentinel) {
                continue;
              }

              return {
                value: record.arg,
                done: context.done
              };

            } else if (record.type === "throw") {
              state = GenStateCompleted;
              // Dispatch the exception by looping back around to the
              // context.dispatchException(context.arg) call above.
              context.method = "throw";
              context.arg = record.arg;
            }
          }
        };
      }

      // Call delegate.iterator[context.method](context.arg) and handle the
      // result, either by returning a { value, done } result from the
      // delegate iterator, or by modifying context.method and context.arg,
      // setting context.delegate to null, and returning the ContinueSentinel.
      function maybeInvokeDelegate(delegate, context) {
        var method = delegate.iterator[context.method];
        if (method === undefined$1) {
          // A .throw or .return when the delegate iterator has no .throw
          // method always terminates the yield* loop.
          context.delegate = null;

          if (context.method === "throw") {
            // Note: ["return"] must be used for ES3 parsing compatibility.
            if (delegate.iterator["return"]) {
              // If the delegate iterator has a return method, give it a
              // chance to clean up.
              context.method = "return";
              context.arg = undefined$1;
              maybeInvokeDelegate(delegate, context);

              if (context.method === "throw") {
                // If maybeInvokeDelegate(context) changed context.method from
                // "return" to "throw", let that override the TypeError below.
                return ContinueSentinel;
              }
            }

            context.method = "throw";
            context.arg = new TypeError(
              "The iterator does not provide a 'throw' method");
          }

          return ContinueSentinel;
        }

        var record = tryCatch(method, delegate.iterator, context.arg);

        if (record.type === "throw") {
          context.method = "throw";
          context.arg = record.arg;
          context.delegate = null;
          return ContinueSentinel;
        }

        var info = record.arg;

        if (! info) {
          context.method = "throw";
          context.arg = new TypeError("iterator result is not an object");
          context.delegate = null;
          return ContinueSentinel;
        }

        if (info.done) {
          // Assign the result of the finished delegate to the temporary
          // variable specified by delegate.resultName (see delegateYield).
          context[delegate.resultName] = info.value;

          // Resume execution at the desired location (see delegateYield).
          context.next = delegate.nextLoc;

          // If context.method was "throw" but the delegate handled the
          // exception, let the outer generator proceed normally. If
          // context.method was "next", forget context.arg since it has been
          // "consumed" by the delegate iterator. If context.method was
          // "return", allow the original .return call to continue in the
          // outer generator.
          if (context.method !== "return") {
            context.method = "next";
            context.arg = undefined$1;
          }

        } else {
          // Re-yield the result returned by the delegate method.
          return info;
        }

        // The delegate iterator is finished, so forget it and continue with
        // the outer generator.
        context.delegate = null;
        return ContinueSentinel;
      }

      // Define Generator.prototype.{next,throw,return} in terms of the
      // unified ._invoke helper method.
      defineIteratorMethods(Gp);

      define(Gp, toStringTagSymbol, "Generator");

      // A Generator should always return itself as the iterator object when the
      // @@iterator function is called on it. Some browsers' implementations of the
      // iterator prototype chain incorrectly implement this, causing the Generator
      // object to not be returned from this call. This ensures that doesn't happen.
      // See https://github.com/facebook/regenerator/issues/274 for more details.
      Gp[iteratorSymbol] = function() {
        return this;
      };

      Gp.toString = function() {
        return "[object Generator]";
      };

      function pushTryEntry(locs) {
        var entry = { tryLoc: locs[0] };

        if (1 in locs) {
          entry.catchLoc = locs[1];
        }

        if (2 in locs) {
          entry.finallyLoc = locs[2];
          entry.afterLoc = locs[3];
        }

        this.tryEntries.push(entry);
      }

      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal";
        delete record.arg;
        entry.completion = record;
      }

      function Context(tryLocsList) {
        // The root entry object (effectively a try statement without a catch
        // or a finally block) gives us a place to store values thrown from
        // locations where there is no enclosing try statement.
        this.tryEntries = [{ tryLoc: "root" }];
        tryLocsList.forEach(pushTryEntry, this);
        this.reset(true);
      }

      exports.keys = function(object) {
        var keys = [];
        for (var key in object) {
          keys.push(key);
        }
        keys.reverse();

        // Rather than returning an object with a next method, we keep
        // things simple and return the next function itself.
        return function next() {
          while (keys.length) {
            var key = keys.pop();
            if (key in object) {
              next.value = key;
              next.done = false;
              return next;
            }
          }

          // To avoid creating an additional object, we just hang the .value
          // and .done properties off the next function object itself. This
          // also ensures that the minifier will not anonymize the function.
          next.done = true;
          return next;
        };
      };

      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];
          if (iteratorMethod) {
            return iteratorMethod.call(iterable);
          }

          if (typeof iterable.next === "function") {
            return iterable;
          }

          if (!isNaN(iterable.length)) {
            var i = -1, next = function next() {
              while (++i < iterable.length) {
                if (hasOwn.call(iterable, i)) {
                  next.value = iterable[i];
                  next.done = false;
                  return next;
                }
              }

              next.value = undefined$1;
              next.done = true;

              return next;
            };

            return next.next = next;
          }
        }

        // Return an iterator with no values.
        return { next: doneResult };
      }
      exports.values = values;

      function doneResult() {
        return { value: undefined$1, done: true };
      }

      Context.prototype = {
        constructor: Context,

        reset: function(skipTempReset) {
          this.prev = 0;
          this.next = 0;
          // Resetting context._sent for legacy support of Babel's
          // function.sent implementation.
          this.sent = this._sent = undefined$1;
          this.done = false;
          this.delegate = null;

          this.method = "next";
          this.arg = undefined$1;

          this.tryEntries.forEach(resetTryEntry);

          if (!skipTempReset) {
            for (var name in this) {
              // Not sure about the optimal order of these conditions:
              if (name.charAt(0) === "t" &&
                  hasOwn.call(this, name) &&
                  !isNaN(+name.slice(1))) {
                this[name] = undefined$1;
              }
            }
          }
        },

        stop: function() {
          this.done = true;

          var rootEntry = this.tryEntries[0];
          var rootRecord = rootEntry.completion;
          if (rootRecord.type === "throw") {
            throw rootRecord.arg;
          }

          return this.rval;
        },

        dispatchException: function(exception) {
          if (this.done) {
            throw exception;
          }

          var context = this;
          function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;

            if (caught) {
              // If the dispatched exception was caught by a catch block,
              // then let that catch block handle the exception normally.
              context.method = "next";
              context.arg = undefined$1;
            }

            return !! caught;
          }

          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;

            if (entry.tryLoc === "root") {
              // Exception thrown outside of any try block that could handle
              // it, so set the completion value of the entire function to
              // throw the exception.
              return handle("end");
            }

            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc");
              var hasFinally = hasOwn.call(entry, "finallyLoc");

              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                } else if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }

              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                }

              } else if (hasFinally) {
                if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }

              } else {
                throw new Error("try statement without catch or finally");
              }
            }
          }
        },

        abrupt: function(type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc <= this.prev &&
                hasOwn.call(entry, "finallyLoc") &&
                this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }

          if (finallyEntry &&
              (type === "break" ||
               type === "continue") &&
              finallyEntry.tryLoc <= arg &&
              arg <= finallyEntry.finallyLoc) {
            // Ignore the finally entry if control is not jumping to a
            // location outside the try/catch block.
            finallyEntry = null;
          }

          var record = finallyEntry ? finallyEntry.completion : {};
          record.type = type;
          record.arg = arg;

          if (finallyEntry) {
            this.method = "next";
            this.next = finallyEntry.finallyLoc;
            return ContinueSentinel;
          }

          return this.complete(record);
        },

        complete: function(record, afterLoc) {
          if (record.type === "throw") {
            throw record.arg;
          }

          if (record.type === "break" ||
              record.type === "continue") {
            this.next = record.arg;
          } else if (record.type === "return") {
            this.rval = this.arg = record.arg;
            this.method = "return";
            this.next = "end";
          } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
          }

          return ContinueSentinel;
        },

        finish: function(finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) {
              this.complete(entry.completion, entry.afterLoc);
              resetTryEntry(entry);
              return ContinueSentinel;
            }
          }
        },

        "catch": function(tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;
              if (record.type === "throw") {
                var thrown = record.arg;
                resetTryEntry(entry);
              }
              return thrown;
            }
          }

          // The context.catch method must only be called with a location
          // argument that corresponds to a known catch block.
          throw new Error("illegal catch attempt");
        },

        delegateYield: function(iterable, resultName, nextLoc) {
          this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          };

          if (this.method === "next") {
            // Deliberately forget the last sent value so that we don't
            // accidentally pass it on to the delegate.
            this.arg = undefined$1;
          }

          return ContinueSentinel;
        }
      };

      // Regardless of whether this script is executing as a CommonJS module
      // or not, return the runtime object so that we can declare the variable
      // regeneratorRuntime in the outer scope, which allows this module to be
      // injected easily by `bin/regenerator --include-runtime script.js`.
      return exports;

    }(
      // If this script is executing as a CommonJS module, use module.exports
      // as the regeneratorRuntime namespace. Otherwise create a new empty
      // object. Either way, the resulting object will be used to initialize
      // the regeneratorRuntime variable at the top of this file.
       module.exports 
    ));

    try {
      regeneratorRuntime = runtime;
    } catch (accidentalStrictMode) {
      // This module should not be running in strict mode, so the above
      // assignment should always work unless something is misconfigured. Just
      // in case runtime.js accidentally runs in strict mode, we can escape
      // strict mode using a global Function call. This could conceivably fail
      // if a Content Security Policy forbids using Function, but in that case
      // the proper solution is to fix the accidental strict mode problem. If
      // you've misconfigured your bundler to force strict mode and applied a
      // CSP to forbid Function, and you're not willing to fix either of those
      // problems, please detail your unique predicament in a GitHub issue.
      Function("r", "regeneratorRuntime = r")(runtime);
    }
    });

    var regenerator = runtime_1;

    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error) {
        reject(error);
        return;
      }

      if (info.done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }

    function _asyncToGenerator(fn) {
      return function () {
        var self = this,
            args = arguments;
        return new Promise(function (resolve, reject) {
          var gen = fn.apply(self, args);

          function _next(value) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
          }

          function _throw(err) {
            asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
          }

          _next(undefined);
        });
      };
    }

    var asyncToGenerator = _asyncToGenerator;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    var t=function(){return (t=Object.assign||function(t){for(var e,n=1,i=arguments.length;n<i;n++)for(var r in e=arguments[n])Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);return t}).apply(this,arguments)};function e(t,e){var n={};for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&e.indexOf(i)<0&&(n[i]=t[i]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(i=Object.getOwnPropertySymbols(t);r<i.length;r++)e.indexOf(i[r])<0&&Object.prototype.propertyIsEnumerable.call(t,i[r])&&(n[i[r]]=t[i[r]]);}return n}function n(t){var e="function"==typeof Symbol&&t[Symbol.iterator],n=0;return e?e.call(t):{next:function(){return t&&n>=t.length&&(t=void 0),{value:t&&t[n++],done:!t}}}}function i(t,e){var n="function"==typeof Symbol&&t[Symbol.iterator];if(!n)return t;var i,r,o=n.call(t),a=[];try{for(;(void 0===e||e-- >0)&&!(i=o.next()).done;)a.push(i.value);}catch(t){r={error:t};}finally{try{i&&!i.done&&(n=o.return)&&n.call(o);}finally{if(r)throw r.error}}return a}function r(){for(var t=[],e=0;e<arguments.length;e++)t=t.concat(i(arguments[e]));return t}var o={},a="production"===process.env.NODE_ENV;function s(t){return Object.keys(t)}function c(t,e,n){void 0===n&&(n=".");var i=l(t,n),r=l(e,n);return k(r)?!!k(i)&&r===i:k(i)?i in r:s(i).every((function(t){return t in r&&c(i[t],r[t])}))}function u(t){try{return k(t)||"number"==typeof t?""+t:t.type}catch(t){throw new Error("Events must be strings or objects with a string event.type property.")}}function h(t,e){try{return N(t)?t:t.toString().split(e)}catch(e){throw new Error("'"+t+"' is not a valid state path.")}}function l(t,e){return "object"==typeof(n=t)&&"value"in n&&"context"in n&&"event"in n&&"_event"in n?t.value:N(t)?f(t):"string"!=typeof t?t:f(h(t,e));var n;}function f(t){if(1===t.length)return t[0];for(var e={},n=e,i=0;i<t.length-1;i++)i===t.length-2?n[t[i]]=t[i+1]:(n[t[i]]={},n=n[t[i]]);return e}function d(t,e){for(var n={},i=s(t),r=0;r<i.length;r++){var o=i[r];n[o]=e(t[o],o,t,r);}return n}function p(t,e,i){var r,o,a={};try{for(var c=n(s(t)),u=c.next();!u.done;u=c.next()){var h=u.value,l=t[h];i(l)&&(a[h]=e(l,h,t));}}catch(t){r={error:t};}finally{try{u&&!u.done&&(o=c.return)&&o.call(c);}finally{if(r)throw r.error}}return a}var v=function(t){return function(e){var i,r,o=e;try{for(var a=n(t),s=a.next();!s.done;s=a.next()){o=o[s.value];}}catch(t){i={error:t};}finally{try{s&&!s.done&&(r=a.return)&&r.call(a);}finally{if(i)throw i.error}}return o}};function y(t){return t?k(t)?[[t]]:g(s(t).map((function(e){var n=t[e];return "string"==typeof n||n&&Object.keys(n).length?y(t[e]).map((function(t){return [e].concat(t)})):[[e]]}))):[[]]}function g(t){var e;return (e=[]).concat.apply(e,r(t))}function m(t){return N(t)?t:[t]}function w(t){return void 0===t?[]:m(t)}function _(t,e,i){var r,o;if(O(t))return t(e,i.data);var a={};try{for(var s=n(Object.keys(t)),c=s.next();!c.done;c=s.next()){var u=c.value,h=t[u];O(h)?a[u]=h(e,i.data):a[u]=h;}}catch(t){r={error:t};}finally{try{c&&!c.done&&(o=s.return)&&o.call(s);}finally{if(r)throw r.error}}return a}function x(t){return t instanceof Promise||!(null===t||!O(t)&&"object"!=typeof t||!O(t.then))}function S(t,e){var r,o,a=i([[],[]],2),s=a[0],c=a[1];try{for(var u=n(t),h=u.next();!h.done;h=u.next()){var l=h.value;e(l)?s.push(l):c.push(l);}}catch(t){r={error:t};}finally{try{h&&!h.done&&(o=u.return)&&o.call(u);}finally{if(r)throw r.error}}return [s,c]}function b(t,e){return d(t.states,(function(t,n){if(t){var i=(k(e)?void 0:e[n])||(t?t.current:void 0);if(i)return {current:i,states:b(t,i)}}}))}var E=function(){};function N(t){return Array.isArray(t)}function O(t){return "function"==typeof t}function k(t){return "string"==typeof t}function T(t,e){if(t)return k(t)?{type:"xstate.guard",name:t,predicate:e?e[t]:void 0}:O(t)?{type:"xstate.guard",name:t.name,predicate:t}:t}function P(t){try{return "subscribe"in t&&O(t.subscribe)}catch(t){return !1}}a||(E=function(t,e){var n=t instanceof Error?t:void 0;if((n||!t)&&void 0!==console){var i=["Warning: "+e];n&&i.push(n),console.warn.apply(console,i);}});var j,C,V=function(){return "function"==typeof Symbol&&Symbol.observable||"@@observable"}();function M(t){try{return "__xstatenode"in t}catch(t){return !1}}function L(e,n){return k(e)||"number"==typeof e?t({type:e},n):e}function I(e,n){if(!k(e)&&"$$type"in e&&"scxml"===e.$$type)return e;var i=L(e);return t({name:i.type,data:i,$$type:"scxml",type:"external"},n)}function D(e,n){return m(n).map((function(n){return void 0===n||"string"==typeof n||M(n)?{target:n,event:e}:t(t({},n),{event:e})}))}function A(t,e,n,i,r){var o=t.options.guards,a={state:r,cond:e,_event:i};if("xstate.guard"===e.type)return e.predicate(n,i.data,a);var s=o[e.type];if(!s)throw new Error("Guard '"+e.type+"' is not implemented on machine '"+t.id+"'.");return s(n,i.data,a)}!function(t){t.Start="xstate.start",t.Stop="xstate.stop",t.Raise="xstate.raise",t.Send="xstate.send",t.Cancel="xstate.cancel",t.NullEvent="",t.Assign="xstate.assign",t.After="xstate.after",t.DoneState="done.state",t.DoneInvoke="done.invoke",t.Log="xstate.log",t.Init="xstate.init",t.Invoke="xstate.invoke",t.ErrorExecution="error.execution",t.ErrorCommunication="error.communication",t.ErrorPlatform="error.platform",t.ErrorCustom="xstate.error",t.Update="xstate.update",t.Pure="xstate.pure",t.Choose="xstate.choose";}(j||(j={})),function(t){t.Parent="#_parent",t.Internal="#_internal";}(C||(C={}));var R=j.Start,$=j.Stop,z=j.Raise,F=j.Send,J=j.Cancel,U=j.NullEvent,B=j.Assign,q=(j.After,j.DoneState,j.Log),X=j.Init,H=j.Invoke,G=(j.ErrorExecution,j.ErrorPlatform),W=j.ErrorCustom,K=j.Update,Q=j.Choose,Y=j.Pure,Z=I({type:X});function tt(t,e){return e&&e[t]||void 0}function et(n,i){var r;if(k(n)||"number"==typeof n){var o=tt(n,i);r=O(o)?{type:n,exec:o}:o||{type:n,exec:void 0};}else if(O(n))r={type:n.name||n.toString(),exec:n};else {if(O(o=tt(n.type,i)))r=t(t({},n),{exec:o});else if(o){var a=n.type,s=e(n,["type"]);r=t(t({type:a},o),s);}else r=n;}return Object.defineProperty(r,"toString",{value:function(){return r.type},enumerable:!1,configurable:!0}),r}var nt=function(t,e){return t?(N(t)?t:[t]).map((function(t){return et(t,e)})):[]};function it(e){var n=et(e);return t(t({id:k(e)?e:n.id},n),{type:n.type})}function rt(t){return k(t)?{type:z,event:t}:ot(t,{to:C.Internal})}function ot(t,e){return {to:e?e.to:void 0,type:F,event:O(t)?t:L(t),delay:e?e.delay:void 0,id:e&&void 0!==e.id?e.id:O(t)?t.name:u(t)}}var at=function(t){return {type:B,assignment:t}};function st(t,e){var n=j.DoneState+"."+t,i={type:n,data:e,toString:function(){return n}};return i}function ct(t,e){var n=j.DoneInvoke+"."+t,i={type:n,data:e,toString:function(){return n}};return i}function ut(t,e){var n=j.ErrorPlatform+"."+t,i={type:n,data:e,toString:function(){return n}};return i}function ht(e,r,o,c,u){var h=i(S(u,(function(t){return t.type===B})),2),l=h[0],f=h[1],d=l.length?function(t,e,i,r){return a||E(!!t,"Attempting to update undefined context"),t?i.reduce((function(t,i){var o,a,c=i.assignment,u={state:r,action:i,_event:e},h={};if(O(c))h=c(t,e.data,u);else try{for(var l=n(s(c)),f=l.next();!f.done;f=l.next()){var d=f.value,p=c[d];h[d]=O(p)?p(t,e.data,u):p;}}catch(t){o={error:t};}finally{try{f&&!f.done&&(a=l.return)&&a.call(l);}finally{if(o)throw o.error}}return Object.assign({},t,h)}),t):t}(o,c,l,r):o;return [g(f.map((function(n){var i;switch(n.type){case z:return {type:z,_event:I(n.event)};case F:var o=function(e,n,i,r){var o,a={_event:i},s=I(O(e.event)?e.event(n,i.data,a):e.event);if(k(e.delay)){var c=r&&r[e.delay];o=O(c)?c(n,i.data,a):c;}else o=O(e.delay)?e.delay(n,i.data,a):e.delay;var u=O(e.to)?e.to(n,i.data,a):e.to;return t(t({},e),{to:u,_event:s,event:s.data,delay:o})}(n,d,c,e.options.delays);return a||E(!k(n.delay)||"number"==typeof o.delay,"No delay reference for delay expression '"+n.delay+"' was found on machine '"+e.id+"'"),o;case q:return function(e,n,i){return t(t({},e),{value:k(e.expr)?e.expr:e.expr(n,i.data,{_event:i})})}(n,d,c);case Q:if(!(u=null===(i=n.conds.find((function(t){var n=T(t.cond,e.options.guards);return !n||A(e,n,d,c,r)})))||void 0===i?void 0:i.actions))return [];var s=ht(e,r,d,c,nt(w(u),e.options.actions));return d=s[1],s[0];case Y:var u;if(!(u=n.get(d,c.data)))return [];s=ht(e,r,d,c,nt(w(u),e.options.actions));return d=s[1],s[0];default:return et(n,e.options.actions)}}))),d]}var lt=function(t){return "atomic"===t.type||"final"===t.type};function ft(t){return s(t.states).map((function(e){return t.states[e]}))}function dt(t){var e=[t];return lt(t)?e:e.concat(g(ft(t).map(dt)))}function pt(t,e){var i,r,o,a,s,c,u,h,l=vt(new Set(t)),f=new Set(e);try{for(var d=n(f),p=d.next();!p.done;p=d.next())for(var v=(E=p.value).parent;v&&!f.has(v);)f.add(v),v=v.parent;}catch(t){i={error:t};}finally{try{p&&!p.done&&(r=d.return)&&r.call(d);}finally{if(i)throw i.error}}var y=vt(f);try{for(var g=n(f),m=g.next();!m.done;m=g.next()){if("compound"!==(E=m.value).type||y.get(E)&&y.get(E).length){if("parallel"===E.type)try{for(var w=(s=void 0,n(ft(E))),_=w.next();!_.done;_=w.next()){var x=_.value;"history"!==x.type&&(f.has(x)||(f.add(x),l.get(x)?l.get(x).forEach((function(t){return f.add(t)})):x.initialStateNodes.forEach((function(t){return f.add(t)}))));}}catch(t){s={error:t};}finally{try{_&&!_.done&&(c=w.return)&&c.call(w);}finally{if(s)throw s.error}}}else l.get(E)?l.get(E).forEach((function(t){return f.add(t)})):E.initialStateNodes.forEach((function(t){return f.add(t)}));}}catch(t){o={error:t};}finally{try{m&&!m.done&&(a=g.return)&&a.call(g);}finally{if(o)throw o.error}}try{for(var S=n(f),b=S.next();!b.done;b=S.next()){var E;for(v=(E=b.value).parent;v&&!f.has(v);)f.add(v),v=v.parent;}}catch(t){u={error:t};}finally{try{b&&!b.done&&(h=S.return)&&h.call(S);}finally{if(u)throw u.error}}return f}function vt(t){var e,i,r=new Map;try{for(var o=n(t),a=o.next();!a.done;a=o.next()){var s=a.value;r.has(s)||r.set(s,[]),s.parent&&(r.has(s.parent)||r.set(s.parent,[]),r.get(s.parent).push(s));}}catch(t){e={error:t};}finally{try{a&&!a.done&&(i=o.return)&&i.call(o);}finally{if(e)throw e.error}}return r}function yt(t,e){return function t(e,n){var i=n.get(e);if(!i)return {};if("compound"===e.type){var r=i[0];if(!r)return {};if(lt(r))return r.key}var o={};return i.forEach((function(e){o[e.key]=t(e,n);})),o}(t,vt(pt([t],e)))}function gt(t,e){return Array.isArray(t)?t.some((function(t){return t===e})):t instanceof Set&&t.has(e)}function mt(t,e){return "compound"===e.type?ft(e).some((function(e){return "final"===e.type&&gt(t,e)})):"parallel"===e.type&&ft(e).every((function(e){return mt(t,e)}))}var wt=function(){function t(t){var e=this;this.actions=[],this.activities=o,this.meta={},this.events=[],this.value=t.value,this.context=t.context,this._event=t._event,this._sessionid=t._sessionid,this.event=this._event.data,this.historyValue=t.historyValue,this.history=t.history,this.actions=t.actions||[],this.activities=t.activities||o,this.meta=t.meta||{},this.events=t.events||[],this.matches=this.matches.bind(this),this.toStrings=this.toStrings.bind(this),this.configuration=t.configuration,this.transitions=t.transitions,this.children=t.children,this.done=!!t.done,Object.defineProperty(this,"nextEvents",{get:function(){return t=e.configuration,g(r(new Set(t.map((function(t){return t.ownEvents})))));var t;}});}return t.from=function(e,n){return e instanceof t?e.context!==n?new t({value:e.value,context:n,_event:e._event,_sessionid:null,historyValue:e.historyValue,history:e.history,actions:[],activities:e.activities,meta:{},events:[],configuration:[],transitions:[],children:{}}):e:new t({value:e,context:n,_event:Z,_sessionid:null,historyValue:void 0,history:void 0,actions:[],activities:void 0,meta:void 0,events:[],configuration:[],transitions:[],children:{}})},t.create=function(e){return new t(e)},t.inert=function(e,n){if(e instanceof t){if(!e.actions.length)return e;var i=Z;return new t({value:e.value,context:n,_event:i,_sessionid:null,historyValue:e.historyValue,history:e.history,activities:e.activities,configuration:e.configuration,transitions:[],children:{}})}return t.from(e,n)},t.prototype.toStrings=function(t,e){var n=this;if(void 0===t&&(t=this.value),void 0===e&&(e="."),k(t))return [t];var i=s(t);return i.concat.apply(i,r(i.map((function(i){return n.toStrings(t[i],e).map((function(t){return i+e+t}))}))))},t.prototype.toJSON=function(){this.configuration,this.transitions;return e(this,["configuration","transitions"])},t.prototype.matches=function(t){return c(t,this.value)},t}();function _t(t){try{return "function"==typeof t.send}catch(t){return !1}}var xt={},St=function(t){return "#"===t[0]},bt=function(){function o(e,i,c){var u=this;this.config=e,this.context=c,this.order=-1,this.__xstatenode=!0,this.__cache={events:void 0,relativeValue:new Map,initialStateValue:void 0,initialState:void 0,on:void 0,transitions:void 0,candidates:{},delayedTransitions:void 0},this.idMap={},this.options=Object.assign({actions:{},guards:{},services:{},activities:{},delays:{}},i),this.parent=this.options._parent,this.key=this.config.key||this.options._key||this.config.id||"(machine)",this.machine=this.parent?this.parent.machine:this,this.path=this.parent?this.parent.path.concat(this.key):[],this.delimiter=this.config.delimiter||(this.parent?this.parent.delimiter:"."),this.id=this.config.id||r([this.machine.key],this.path).join(this.delimiter),this.version=this.parent?this.parent.version:this.config.version,this.type=this.config.type||(this.config.parallel?"parallel":this.config.states&&s(this.config.states).length?"compound":this.config.history?"history":"atomic"),a||E(!("parallel"in this.config),'The "parallel" property is deprecated and will be removed in version 4.1. '+(this.config.parallel?"Replace with `type: 'parallel'`":"Use `type: '"+this.type+"'`")+" in the config for state node '"+this.id+"' instead."),this.initial=this.config.initial,this.states=this.config.states?d(this.config.states,(function(e,n){var i,r=new o(e,{_parent:u,_key:n});return Object.assign(u.idMap,t(((i={})[r.id]=r,i),r.idMap)),r})):xt;var h=0;!function t(e){var i,r;e.order=h++;try{for(var o=n(ft(e)),a=o.next();!a.done;a=o.next()){t(a.value);}}catch(t){i={error:t};}finally{try{a&&!a.done&&(r=o.return)&&r.call(o);}finally{if(i)throw i.error}}}(this),this.history=!0===this.config.history?"shallow":this.config.history||!1,this._transient=!!this.config.always||!!this.config.on&&(Array.isArray(this.config.on)?this.config.on.some((function(t){return ""===t.event})):""in this.config.on),this.strict=!!this.config.strict,this.onEntry=w(this.config.entry||this.config.onEntry).map((function(t){return et(t)})),this.onExit=w(this.config.exit||this.config.onExit).map((function(t){return et(t)})),this.meta=this.config.meta,this.doneData="final"===this.type?this.config.data:void 0,this.invoke=w(this.config.invoke).map((function(e,n){var i,r;if(M(e))return u.machine.options.services=t(((i={})[e.id]=e,i),u.machine.options.services),{type:H,src:e.id,id:e.id};if("string"!=typeof e.src){var o=u.id+":invocation["+n+"]";return u.machine.options.services=t(((r={})[o]=e.src,r),u.machine.options.services),t(t({type:H,id:o},e),{src:o})}return t(t({},e),{type:H,id:e.id||e.src,src:e.src})})),this.activities=w(this.config.activities).concat(this.invoke).map((function(t){return it(t)})),this.transition=this.transition.bind(this);}return o.prototype._init=function(){this.__cache.transitions||dt(this).forEach((function(t){return t.on}));},o.prototype.withConfig=function(e,n){void 0===n&&(n=this.context);var i=this.options,r=i.actions,a=i.activities,s=i.guards,c=i.services,u=i.delays;return new o(this.config,{actions:t(t({},r),e.actions),activities:t(t({},a),e.activities),guards:t(t({},s),e.guards),services:t(t({},c),e.services),delays:t(t({},u),e.delays)},n)},o.prototype.withContext=function(t){return new o(this.config,this.options,t)},Object.defineProperty(o.prototype,"definition",{get:function(){return {id:this.id,key:this.key,version:this.version,context:this.context,type:this.type,initial:this.initial,history:this.history,states:d(this.states,(function(t){return t.definition})),on:this.on,transitions:this.transitions,entry:this.onEntry,exit:this.onExit,activities:this.activities||[],meta:this.meta,order:this.order||-1,data:this.doneData,invoke:this.invoke}},enumerable:!0,configurable:!0}),o.prototype.toJSON=function(){return this.definition},Object.defineProperty(o.prototype,"on",{get:function(){if(this.__cache.on)return this.__cache.on;var t=this.transitions;return this.__cache.on=t.reduce((function(t,e){return t[e.eventType]=t[e.eventType]||[],t[e.eventType].push(e),t}),{})},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"after",{get:function(){return this.__cache.delayedTransitions||(this.__cache.delayedTransitions=this.getDelayedTransitions(),this.__cache.delayedTransitions)},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"transitions",{get:function(){return this.__cache.transitions||(this.__cache.transitions=this.formatTransitions(),this.__cache.transitions)},enumerable:!0,configurable:!0}),o.prototype.getCandidates=function(t){if(this.__cache.candidates[t])return this.__cache.candidates[t];var e=""===t,n=this.transitions.filter((function(n){var i=n.eventType===t;return e?i:i||"*"===n.eventType}));return this.__cache.candidates[t]=n,n},o.prototype.getDelayedTransitions=function(){var e=this,n=this.config.after;if(!n)return [];var i=function(t,n){var i=function(t,e){var n=e?"#"+e:"";return j.After+"("+t+")"+n}(O(t)?e.id+":delay["+n+"]":t,e.id);return e.onEntry.push(ot(i,{delay:t})),e.onExit.push({type:J,sendId:i}),i};return (N(n)?n.map((function(e,n){var r=i(e.delay,n);return t(t({},e),{event:r})})):g(s(n).map((function(e,r){var o=n[e],a=k(o)?{target:o}:o,s=isNaN(+e)?e:+e,c=i(s,r);return w(a).map((function(e){return t(t({},e),{event:c,delay:s})}))})))).map((function(n){var i=n.delay;return t(t({},e.formatTransition(n)),{delay:i})}))},o.prototype.getStateNodes=function(t){var e,n=this;if(!t)return [];var i=t instanceof wt?t.value:l(t,this.delimiter);if(k(i)){var r=this.getStateNode(i).initial;return void 0!==r?this.getStateNodes(((e={})[i]=r,e)):[this.states[i]]}var o=s(i);return o.map((function(t){return n.getStateNode(t)})).concat(o.reduce((function(t,e){var r=n.getStateNode(e).getStateNodes(i[e]);return t.concat(r)}),[]))},o.prototype.handles=function(t){var e=u(t);return this.events.includes(e)},o.prototype.resolveState=function(e){var n=Array.from(pt([],this.getStateNodes(e.value)));return new wt(t(t({},e),{value:this.resolve(e.value),configuration:n}))},o.prototype.transitionLeafNode=function(t,e,n){var i=this.getStateNode(t).next(e,n);return i&&i.transitions.length?i:this.next(e,n)},o.prototype.transitionCompoundNode=function(t,e,n){var i=s(t),r=this.getStateNode(i[0])._transition(t[i[0]],e,n);return r&&r.transitions.length?r:this.next(e,n)},o.prototype.transitionParallelNode=function(t,e,i){var r,o,a={};try{for(var c=n(s(t)),u=c.next();!u.done;u=c.next()){var h=u.value,l=t[h];if(l){var f=this.getStateNode(h)._transition(l,e,i);f&&(a[h]=f);}}}catch(t){r={error:t};}finally{try{u&&!u.done&&(o=c.return)&&o.call(c);}finally{if(r)throw r.error}}var d=s(a).map((function(t){return a[t]})),p=g(d.map((function(t){return t.transitions})));if(!d.some((function(t){return t.transitions.length>0})))return this.next(e,i);var v=g(d.map((function(t){return t.entrySet}))),y=g(s(a).map((function(t){return a[t].configuration})));return {transitions:p,entrySet:v,exitSet:g(d.map((function(t){return t.exitSet}))),configuration:y,source:e,actions:g(s(a).map((function(t){return a[t].actions})))}},o.prototype._transition=function(t,e,n){return k(t)?this.transitionLeafNode(t,e,n):1===s(t).length?this.transitionCompoundNode(t,e,n):this.transitionParallelNode(t,e,n)},o.prototype.next=function(t,e){var i,o,a,s=this,u=e.name,h=[],f=[];try{for(var d=n(this.getCandidates(u)),p=d.next();!p.done;p=d.next()){var y=p.value,m=y.cond,w=y.in,_=t.context,x=!w||(k(w)&&St(w)?t.matches(l(this.getStateNodeById(w).path,this.delimiter)):c(l(w,this.delimiter),v(this.path.slice(0,-2))(t.value))),S=!1;try{S=!m||A(this.machine,m,_,e,t);}catch(t){throw new Error("Unable to evaluate guard '"+(m.name||m.type)+"' in transition for event '"+u+"' in state node '"+this.id+"':\n"+t.message)}if(S&&x){void 0!==y.target&&(f=y.target),h.push.apply(h,r(y.actions)),a=y;break}}}catch(t){i={error:t};}finally{try{p&&!p.done&&(o=d.return)&&o.call(d);}finally{if(i)throw i.error}}if(a){if(!f.length)return {transitions:[a],entrySet:[],exitSet:[],configuration:t.value?[this]:[],source:t,actions:h};var b=g(f.map((function(e){return s.getRelativeStateNodes(e,t.historyValue)}))),E=!!a.internal;return {transitions:[a],entrySet:E?[]:g(b.map((function(t){return s.nodesFromChild(t)}))),exitSet:E?[]:[this],configuration:b,source:t,actions:h}}},o.prototype.nodesFromChild=function(t){if(t.escapes(this))return [];for(var e=[],n=t;n&&n!==this;)e.push(n),n=n.parent;return e.push(this),e},o.prototype.escapes=function(t){if(this===t)return !1;for(var e=this.parent;e;){if(e===t)return !1;e=e.parent;}return !0},o.prototype.getActions=function(t,e,o,a){var s,c,u,h,l=pt([],a?this.getStateNodes(a.value):[this]),f=t.configuration.length?pt(l,t.configuration):l;try{for(var d=n(f),p=d.next();!p.done;p=d.next()){gt(l,m=p.value)||t.entrySet.push(m);}}catch(t){s={error:t};}finally{try{p&&!p.done&&(c=d.return)&&c.call(d);}finally{if(s)throw s.error}}try{for(var v=n(l),y=v.next();!y.done;y=v.next()){var m;gt(f,m=y.value)&&!gt(t.exitSet,m.parent)||t.exitSet.push(m);}}catch(t){u={error:t};}finally{try{y&&!y.done&&(h=v.return)&&h.call(v);}finally{if(u)throw u.error}}t.source||(t.exitSet=[],t.entrySet.push(this));var w=g(t.entrySet.map((function(n){var i=[];if("final"!==n.type)return i;var r=n.parent;if(!r.parent)return i;i.push(st(n.id,n.doneData),st(r.id,n.doneData?_(n.doneData,e,o):void 0));var a=r.parent;return "parallel"===a.type&&ft(a).every((function(e){return mt(t.configuration,e)}))&&i.push(st(a.id)),i})));t.exitSet.sort((function(t,e){return e.order-t.order})),t.entrySet.sort((function(t,e){return t.order-e.order}));var x=new Set(t.entrySet),S=new Set(t.exitSet),b=i([g(Array.from(x).map((function(t){return r(t.activities.map((function(t){return function(t){var e=it(t);return {type:j.Start,activity:e,exec:void 0}}(t)})),t.onEntry)}))).concat(w.map(rt)),g(Array.from(S).map((function(t){return r(t.onExit,t.activities.map((function(t){return function(t){var e=it(t);return {type:j.Stop,activity:e,exec:void 0}}(t)})))})))],2),E=b[0],N=b[1];return nt(N.concat(t.actions).concat(E),this.machine.options.actions)},o.prototype.transition=function(t,e,n){void 0===t&&(t=this.initialState);var i,o,s=I(e);if(t instanceof wt)i=void 0===n?t:this.resolveState(wt.from(t,n));else {var c=k(t)?this.resolve(f(this.getResolvedPath(t))):this.resolve(t),u=n||this.machine.context;i=this.resolveState(wt.from(c,u));}if(!a&&"*"===s.name)throw new Error("An event cannot have the wildcard type ('*')");if(this.strict&&!this.events.includes(s.name)&&(o=s.name,!/^(done|error)\./.test(o)))throw new Error("Machine '"+this.id+"' does not accept event '"+s.name+"'");var h=this._transition(i.value,i,s)||{transitions:[],configuration:[],entrySet:[],exitSet:[],source:i,actions:[]},l=pt([],this.getStateNodes(i.value)),d=h.configuration.length?pt(l,h.configuration):l;return h.configuration=r(d),this.resolveTransition(h,i,s)},o.prototype.resolveRaisedTransition=function(t,e,n){var i,o=t.actions;return (t=this.transition(t,e))._event=n,t.event=n.data,(i=t.actions).unshift.apply(i,r(o)),t},o.prototype.resolveTransition=function(e,r,o,a){var c,u,h=this;void 0===o&&(o=Z),void 0===a&&(a=this.machine.context);var l=e.configuration,f=!r||e.transitions.length>0?yt(this.machine,l):void 0,d=r?r.historyValue?r.historyValue:e.source?this.machine.historyValue(r.value):void 0:void 0,p=r?r.context:a,v=this.getActions(e,p,o,r),y=r?t({},r.activities):{};try{for(var g=n(v),m=g.next();!m.done;m=g.next()){var w=m.value;w.type===R?y[w.activity.id||w.activity.type]=w:w.type===$&&(y[w.activity.id||w.activity.type]=!1);}}catch(t){c={error:t};}finally{try{m&&!m.done&&(u=g.return)&&u.call(g);}finally{if(c)throw c.error}}var _,x,E=i(ht(this,r,p,o,v),2),N=E[0],O=E[1],T=i(S(N,(function(t){return t.type===z||t.type===F&&t.to===C.Internal})),2),P=T[0],j=T[1],V=N.filter((function(t){return t.type===R&&t.activity.type===H})).reduce((function(t,e){return t[e.activity.id]=function(t,e){var n,i,r={id:i=t.id,send:function(){},subscribe:function(){return {unsubscribe:function(){}}},toJSON:function(){return {id:i}}},o=null===(n=e.options.services)||void 0===n?void 0:n[t.src];return r.deferred=!0,M(o)&&(r.state=o.initialState),r.meta=t,r}(e.activity,h.machine),t}),r?t({},r.children):{}),L=f?e.configuration:r?r.configuration:[],I=L.reduce((function(t,e){return void 0!==e.meta&&(t[e.id]=e.meta),t}),{}),D=mt(L,this),A=new wt({value:f||r.value,context:O,_event:o,_sessionid:r?r._sessionid:null,historyValue:f?d?(_=d,x=f,{current:x,states:b(_,x)}):void 0:r?r.historyValue:void 0,history:!f||e.source?r:void 0,actions:f?j:[],activities:f?y:r?r.activities:{},meta:f?I:r?r.meta:void 0,events:[],configuration:L,transitions:e.transitions,children:V,done:D}),J=p!==O;A.changed=o.name===K||J;var B=A.history;if(B&&delete B.history,!f)return A;var q=A;if(!D)for((this._transient||l.some((function(t){return t._transient})))&&(q=this.resolveRaisedTransition(q,{type:U},o));P.length;){var X=P.shift();q=this.resolveRaisedTransition(q,X._event,o);}var G=q.changed||(B?!!q.actions.length||J||typeof B.value!=typeof q.value||!function t(e,n){if(e===n)return !0;if(void 0===e||void 0===n)return !1;if(k(e)||k(n))return e===n;var i=s(e),r=s(n);return i.length===r.length&&i.every((function(i){return t(e[i],n[i])}))}(q.value,B.value):void 0);return q.changed=G,q.historyValue=A.historyValue,q.history=B,q},o.prototype.getStateNode=function(t){if(St(t))return this.machine.getStateNodeById(t);if(!this.states)throw new Error("Unable to retrieve child state '"+t+"' from '"+this.id+"'; no child states exist.");var e=this.states[t];if(!e)throw new Error("Child state '"+t+"' does not exist on '"+this.id+"'");return e},o.prototype.getStateNodeById=function(t){var e=St(t)?t.slice("#".length):t;if(e===this.id)return this;var n=this.machine.idMap[e];if(!n)throw new Error("Child state node '#"+e+"' does not exist on machine '"+this.id+"'");return n},o.prototype.getStateNodeByPath=function(t){if("string"==typeof t&&St(t))try{return this.getStateNodeById(t.slice(1))}catch(t){}for(var e=h(t,this.delimiter).slice(),n=this;e.length;){var i=e.shift();if(!i.length)break;n=n.getStateNode(i);}return n},o.prototype.resolve=function(t){var e,n=this;if(!t)return this.initialStateValue||xt;switch(this.type){case"parallel":return d(this.initialStateValue,(function(e,i){return e?n.getStateNode(i).resolve(t[i]||e):xt}));case"compound":if(k(t)){var i=this.getStateNode(t);return "parallel"===i.type||"compound"===i.type?((e={})[t]=i.initialStateValue,e):t}return s(t).length?d(t,(function(t,e){return t?n.getStateNode(e).resolve(t):xt})):this.initialStateValue||{};default:return t||xt}},o.prototype.getResolvedPath=function(t){if(St(t)){var e=this.machine.idMap[t.slice("#".length)];if(!e)throw new Error("Unable to find state node '"+t+"'");return e.path}return h(t,this.delimiter)},Object.defineProperty(o.prototype,"initialStateValue",{get:function(){var t,e;if(this.__cache.initialStateValue)return this.__cache.initialStateValue;if("parallel"===this.type)e=p(this.states,(function(t){return t.initialStateValue||xt}),(function(t){return !("history"===t.type)}));else if(void 0!==this.initial){if(!this.states[this.initial])throw new Error("Initial state '"+this.initial+"' not found on '"+this.key+"'");e=lt(this.states[this.initial])?this.initial:((t={})[this.initial]=this.states[this.initial].initialStateValue,t);}return this.__cache.initialStateValue=e,this.__cache.initialStateValue},enumerable:!0,configurable:!0}),o.prototype.getInitialState=function(t,e){var n=this.getStateNodes(t);return this.resolveTransition({configuration:n,entrySet:n,exitSet:[],transitions:[],source:void 0,actions:[]},void 0,void 0,e)},Object.defineProperty(o.prototype,"initialState",{get:function(){this._init();var t=this.initialStateValue;if(!t)throw new Error("Cannot retrieve initial state from simple state '"+this.id+"'.");return this.getInitialState(t)},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"target",{get:function(){var t;if("history"===this.type){var e=this.config;t=k(e.target)&&St(e.target)?f(this.machine.getStateNodeById(e.target).path.slice(this.path.length-1)):e.target;}return t},enumerable:!0,configurable:!0}),o.prototype.getRelativeStateNodes=function(t,e,n){return void 0===n&&(n=!0),n?"history"===t.type?t.resolveHistory(e):t.initialStateNodes:[t]},Object.defineProperty(o.prototype,"initialStateNodes",{get:function(){var t=this;return lt(this)?[this]:"compound"!==this.type||this.initial?g(y(this.initialStateValue).map((function(e){return t.getFromRelativePath(e)}))):(a||E(!1,"Compound state node '"+this.id+"' has no initial state."),[this])},enumerable:!0,configurable:!0}),o.prototype.getFromRelativePath=function(t){if(!t.length)return [this];var e=i(t),n=e[0],r=e.slice(1);if(!this.states)throw new Error("Cannot retrieve subPath '"+n+"' from node with no states");var o=this.getStateNode(n);if("history"===o.type)return o.resolveHistory();if(!this.states[n])throw new Error("Child state '"+n+"' does not exist on '"+this.id+"'");return this.states[n].getFromRelativePath(r)},o.prototype.historyValue=function(t){if(s(this.states).length)return {current:t||this.initialStateValue,states:p(this.states,(function(e,n){if(!t)return e.historyValue();var i=k(t)?void 0:t[n];return e.historyValue(i||e.initialStateValue)}),(function(t){return !t.history}))}},o.prototype.resolveHistory=function(t){var e=this;if("history"!==this.type)return [this];var i=this.parent;if(!t){var r=this.target;return r?g(y(r).map((function(t){return i.getFromRelativePath(t)}))):i.initialStateNodes}var o,a,s=(o=i.path,a="states",function(t){var e,i,r=t;try{for(var s=n(o),c=s.next();!c.done;c=s.next()){var u=c.value;r=r[a][u];}}catch(t){e={error:t};}finally{try{c&&!c.done&&(i=s.return)&&i.call(s);}finally{if(e)throw e.error}}return r})(t).current;return k(s)?[i.getStateNode(s)]:g(y(s).map((function(t){return "deep"===e.history?i.getFromRelativePath(t):[i.states[t[0]]]})))},Object.defineProperty(o.prototype,"stateIds",{get:function(){var t=this,e=g(s(this.states).map((function(e){return t.states[e].stateIds})));return [this.id].concat(e)},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"events",{get:function(){var t,e,i,r;if(this.__cache.events)return this.__cache.events;var o=this.states,a=new Set(this.ownEvents);if(o)try{for(var c=n(s(o)),u=c.next();!u.done;u=c.next()){var h=o[u.value];if(h.states)try{for(var l=(i=void 0,n(h.events)),f=l.next();!f.done;f=l.next()){var d=f.value;a.add(""+d);}}catch(t){i={error:t};}finally{try{f&&!f.done&&(r=l.return)&&r.call(l);}finally{if(i)throw i.error}}}}catch(e){t={error:e};}finally{try{u&&!u.done&&(e=c.return)&&e.call(c);}finally{if(t)throw t.error}}return this.__cache.events=Array.from(a)},enumerable:!0,configurable:!0}),Object.defineProperty(o.prototype,"ownEvents",{get:function(){var t=new Set(this.transitions.filter((function(t){return !(!t.target&&!t.actions.length&&t.internal)})).map((function(t){return t.eventType})));return Array.from(t)},enumerable:!0,configurable:!0}),o.prototype.resolveTarget=function(t){var e=this;if(void 0!==t)return t.map((function(t){if(!k(t))return t;var n=t[0]===e.delimiter;if(n&&!e.parent)return e.getStateNodeByPath(t.slice(1));var i=n?e.key+t:t;if(!e.parent)return e.getStateNodeByPath(i);try{return e.parent.getStateNodeByPath(i)}catch(t){throw new Error("Invalid transition definition for state node '"+e.id+"':\n"+t.message)}}))},o.prototype.formatTransition=function(e){var n=this,i=function(t){if(void 0!==t&&""!==t)return w(t)}(e.target),r="internal"in e?e.internal:!i||i.some((function(t){return k(t)&&t[0]===n.delimiter})),o=this.machine.options.guards,a=this.resolveTarget(i),s=t(t({},e),{actions:nt(w(e.actions)),cond:T(e.cond,o),target:a,source:this,internal:r,eventType:e.event,toJSON:function(){return t(t({},s),{target:s.target?s.target.map((function(t){return "#"+t.id})):void 0,source:"#"+n.id})}});return s},o.prototype.formatTransitions=function(){var t,i,o,c=this;if(this.config.on)if(Array.isArray(this.config.on))o=this.config.on;else {var u=this.config.on,h=u["*"],l=void 0===h?[]:h,f=e(u,["*"]);o=g(s(f).map((function(t){a||""!==t||E(!1,"Empty string transition configs (e.g., `{ on: { '': ... }}`) for transient transitions are deprecated. Specify the transition in the `{ always: ... }` property instead. Please check the `on` configuration for \"#"+c.id+'".');var e=D(t,f[t]);return a||function(t,e,n){var i=n.slice(0,-1).some((function(t){return !("cond"in t)&&!("in"in t)&&(k(t.target)||M(t.target))}));E(!i,"One or more transitions for "+(""===e?"the transient event":"event '"+e+"'")+" on state '"+t.id+"' are unreachable. Make sure that the default transition is the last one defined.");}(c,t,e),e})).concat(D("*",l)));}else o=[];var d=this.config.always?D("",this.config.always):[],p=this.config.onDone?D(String(st(this.id)),this.config.onDone):[];a||E(!(this.config.onDone&&!this.parent),'Root nodes cannot have an ".onDone" transition. Please check the config of "'+this.id+'".');var v=g(this.invoke.map((function(t){var e=[];return t.onDone&&e.push.apply(e,r(D(String(ct(t.id)),t.onDone))),t.onError&&e.push.apply(e,r(D(String(ut(t.id)),t.onError))),e}))),y=this.after,m=g(r(p,v,o,d).map((function(t){return w(t).map((function(t){return c.formatTransition(t)}))})));try{for(var _=n(y),x=_.next();!x.done;x=_.next()){var S=x.value;m.push(S);}}catch(e){t={error:e};}finally{try{x&&!x.done&&(i=_.return)&&i.call(_);}finally{if(t)throw t.error}}return m},o}();var Et={deferEvents:!1},Nt=function(){function e(e){this.processingEvent=!1,this.queue=[],this.initialized=!1,this.options=t(t({},Et),e);}return e.prototype.initialize=function(t){if(this.initialized=!0,t){if(!this.options.deferEvents)return void this.schedule(t);this.process(t);}this.flushEvents();},e.prototype.schedule=function(t){if(this.initialized&&!this.processingEvent){if(0!==this.queue.length)throw new Error("Event queue should be empty when it is not processing events");this.process(t),this.flushEvents();}else this.queue.push(t);},e.prototype.clear=function(){this.queue=[];},e.prototype.flushEvents=function(){for(var t=this.queue.shift();t;)this.process(t),t=this.queue.shift();},e.prototype.process=function(t){this.processingEvent=!0;try{t();}catch(t){throw this.clear(),t}finally{this.processingEvent=!1;}},e}(),Ot=new Map,kt=0,Tt=function(){return "x:"+kt++},Pt=function(t,e){return Ot.set(t,e),t},jt=function(t){return Ot.get(t)},Ct=function(t){Ot.delete(t);};function Vt(t){if(!a&&"undefined"!=typeof window){var e=function(){var t=window;if(t.__xstate__)return t.__xstate__}();e&&e.register(t);}}var Mt,Lt={sync:!1,autoForward:!1},It=function(){var t=[];return function(e,n){e&&t.push(e);var i=n(e||t[t.length-1]);return e&&t.pop(),i}}();!function(t){t[t.NotStarted=0]="NotStarted",t[t.Running=1]="Running",t[t.Stopped=2]="Stopped";}(Mt||(Mt={}));var Dt=function(){function e(n,i){var r=this;void 0===i&&(i=e.defaultOptions),this.machine=n,this.scheduler=new Nt,this.delayedEventsMap={},this.listeners=new Set,this.contextListeners=new Set,this.stopListeners=new Set,this.doneListeners=new Set,this.eventListeners=new Set,this.sendListeners=new Set,this.initialized=!1,this._status=Mt.NotStarted,this.children=new Map,this.forwardTo=new Set,this.init=this.start,this.send=function(t,e){if(N(t))return r.batch(t),r.state;var n=I(L(t,e));if(r._status===Mt.Stopped)return a||E(!1,'Event "'+n.name+'" was sent to stopped service "'+r.machine.id+'". This service has already reached its final state, and will not transition.\nEvent: '+JSON.stringify(n.data)),r.state;if(r._status===Mt.NotStarted&&r.options.deferEvents)a||E(!1,'Event "'+n.name+'" was sent to uninitialized service "'+r.machine.id+'" and is deferred. Make sure .start() is called for this service.\nEvent: '+JSON.stringify(n.data));else if(r._status!==Mt.Running)throw new Error('Event "'+n.name+'" was sent to uninitialized service "'+r.machine.id+'". Make sure .start() is called for this service, or set { deferEvents: true } in the service options.\nEvent: '+JSON.stringify(n.data));return r.scheduler.schedule((function(){r.forward(n);var t=r.nextState(n);r.update(t,n);})),r._state},this.sendTo=function(e,n){var i=r.parent&&(n===C.Parent||r.parent.id===n),o=i?r.parent:_t(n)?n:r.children.get(n)||jt(n);if(o)"machine"in o?o.send(t(t({},e),{name:e.name===W?""+ut(r.id):e.name,origin:r.sessionId})):o.send(e.data);else {if(!i)throw new Error("Unable to send event to child '"+n+"' from service '"+r.id+"'.");a||E(!1,"Service '"+r.id+"' has no parent: unable to send event "+e.type);}};var o=t(t({},e.defaultOptions),i),s=o.clock,c=o.logger,u=o.parent,h=o.id,l=void 0!==h?h:n.id;this.id=l,this.logger=c,this.clock=s,this.parent=u,this.options=o,this.scheduler=new Nt({deferEvents:this.options.deferEvents}),this.sessionId=Tt();}return Object.defineProperty(e.prototype,"initialState",{get:function(){var t=this;return this._initialState?this._initialState:It(this,(function(){return t._initialState=t.machine.initialState,t._initialState}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"state",{get:function(){return a||E(this._status!==Mt.NotStarted,"Attempted to read state from uninitialized service '"+this.id+"'. Make sure the service is started first."),this._state},enumerable:!0,configurable:!0}),e.prototype.execute=function(t,e){var i,r;try{for(var o=n(t.actions),a=o.next();!a.done;a=o.next()){var s=a.value;this.exec(s,t,e);}}catch(t){i={error:t};}finally{try{a&&!a.done&&(r=o.return)&&r.call(o);}finally{if(i)throw i.error}}},e.prototype.update=function(t,e){var i,r,o,a,s,c,u,h,l=this;if(t._sessionid=this.sessionId,this._state=t,this.options.execute&&this.execute(this.state),this.devTools&&this.devTools.send(e.data,t),t.event)try{for(var f=n(this.eventListeners),d=f.next();!d.done;d=f.next()){(0,d.value)(t.event);}}catch(t){i={error:t};}finally{try{d&&!d.done&&(r=f.return)&&r.call(f);}finally{if(i)throw i.error}}try{for(var p=n(this.listeners),v=p.next();!v.done;v=p.next()){(0,v.value)(t,t.event);}}catch(t){o={error:t};}finally{try{v&&!v.done&&(a=p.return)&&a.call(p);}finally{if(o)throw o.error}}try{for(var y=n(this.contextListeners),g=y.next();!g.done;g=y.next()){(0,g.value)(this.state.context,this.state.history?this.state.history.context:void 0);}}catch(t){s={error:t};}finally{try{g&&!g.done&&(c=y.return)&&c.call(y);}finally{if(s)throw s.error}}var m=mt(t.configuration||[],this.machine);if(this.state.configuration&&m){var w=t.configuration.find((function(t){return "final"===t.type&&t.parent===l.machine})),x=w&&w.doneData?_(w.doneData,t.context,e):void 0;try{for(var S=n(this.doneListeners),b=S.next();!b.done;b=S.next()){(0,b.value)(ct(this.id,x));}}catch(t){u={error:t};}finally{try{b&&!b.done&&(h=S.return)&&h.call(S);}finally{if(u)throw u.error}}this.stop();}},e.prototype.onTransition=function(t){return this.listeners.add(t),this._status===Mt.Running&&t(this.state,this.state.event),this},e.prototype.subscribe=function(t,e,n){var i,r=this;if(!t)return {unsubscribe:function(){}};var o=n;return "function"==typeof t?i=t:(i=t.next.bind(t),o=t.complete.bind(t)),this.listeners.add(i),this._status===Mt.Running&&i(this.state),o&&this.onDone(o),{unsubscribe:function(){i&&r.listeners.delete(i),o&&r.doneListeners.delete(o);}}},e.prototype.onEvent=function(t){return this.eventListeners.add(t),this},e.prototype.onSend=function(t){return this.sendListeners.add(t),this},e.prototype.onChange=function(t){return this.contextListeners.add(t),this},e.prototype.onStop=function(t){return this.stopListeners.add(t),this},e.prototype.onDone=function(t){return this.doneListeners.add(t),this},e.prototype.off=function(t){return this.listeners.delete(t),this.eventListeners.delete(t),this.sendListeners.delete(t),this.stopListeners.delete(t),this.doneListeners.delete(t),this.contextListeners.delete(t),this},e.prototype.start=function(t){var e=this;if(this._status===Mt.Running)return this;Pt(this.sessionId,this),this.initialized=!0,this._status=Mt.Running;var n=void 0===t?this.initialState:It(this,(function(){return !k(n=t)&&"value"in n&&"history"in n?e.machine.resolveState(t):e.machine.resolveState(wt.from(t,e.machine.context));var n;}));return this.options.devTools&&this.attachDev(),this.scheduler.initialize((function(){e.update(n,Z);})),this},e.prototype.stop=function(){var t,e,i,r,o,a,c,u,h,l;try{for(var f=n(this.listeners),d=f.next();!d.done;d=f.next()){var p=d.value;this.listeners.delete(p);}}catch(e){t={error:e};}finally{try{d&&!d.done&&(e=f.return)&&e.call(f);}finally{if(t)throw t.error}}try{for(var v=n(this.stopListeners),y=v.next();!y.done;y=v.next()){(p=y.value)(),this.stopListeners.delete(p);}}catch(t){i={error:t};}finally{try{y&&!y.done&&(r=v.return)&&r.call(v);}finally{if(i)throw i.error}}try{for(var g=n(this.contextListeners),m=g.next();!m.done;m=g.next()){p=m.value;this.contextListeners.delete(p);}}catch(t){o={error:t};}finally{try{m&&!m.done&&(a=g.return)&&a.call(g);}finally{if(o)throw o.error}}try{for(var w=n(this.doneListeners),_=w.next();!_.done;_=w.next()){p=_.value;this.doneListeners.delete(p);}}catch(t){c={error:t};}finally{try{_&&!_.done&&(u=w.return)&&u.call(w);}finally{if(c)throw c.error}}this.children.forEach((function(t){O(t.stop)&&t.stop();}));try{for(var x=n(s(this.delayedEventsMap)),S=x.next();!S.done;S=x.next()){var b=S.value;this.clock.clearTimeout(this.delayedEventsMap[b]);}}catch(t){h={error:t};}finally{try{S&&!S.done&&(l=x.return)&&l.call(x);}finally{if(h)throw h.error}}return this.scheduler.clear(),this.initialized=!1,this._status=Mt.Stopped,Ct(this.sessionId),this},e.prototype.batch=function(e){var i=this;if(this._status===Mt.NotStarted&&this.options.deferEvents)a||E(!1,e.length+' event(s) were sent to uninitialized service "'+this.machine.id+'" and are deferred. Make sure .start() is called for this service.\nEvent: '+JSON.stringify(event));else if(this._status!==Mt.Running)throw new Error(e.length+' event(s) were sent to uninitialized service "'+this.machine.id+'". Make sure .start() is called for this service, or set { deferEvents: true } in the service options.');this.scheduler.schedule((function(){var o,a,s=i.state,c=!1,u=[],h=function(e){var n=I(e);i.forward(n),s=It(i,(function(){return i.machine.transition(s,n)})),u.push.apply(u,r(s.actions.map((function(e){return i=s,r=(n=e).exec,t(t({},n),{exec:void 0!==r?function(){return r(i.context,i.event,{action:n,state:i,_event:i._event})}:void 0});var n,i,r;})))),c=c||!!s.changed;};try{for(var l=n(e),f=l.next();!f.done;f=l.next()){h(f.value);}}catch(t){o={error:t};}finally{try{f&&!f.done&&(a=l.return)&&a.call(l);}finally{if(o)throw o.error}}s.changed=c,s.actions=u,i.update(s,I(e[e.length-1]));}));},e.prototype.sender=function(t){return this.send.bind(this,t)},e.prototype.nextState=function(t){var e=this,n=I(t);if(0===n.name.indexOf(G)&&!this.state.nextEvents.some((function(t){return 0===t.indexOf(G)})))throw n.data.data;return It(this,(function(){return e.machine.transition(e.state,n)}))},e.prototype.forward=function(t){var e,i;try{for(var r=n(this.forwardTo),o=r.next();!o.done;o=r.next()){var a=o.value,s=this.children.get(a);if(!s)throw new Error("Unable to forward event '"+t+"' from interpreter '"+this.id+"' to nonexistant child '"+a+"'.");s.send(t);}}catch(t){e={error:t};}finally{try{o&&!o.done&&(i=r.return)&&i.call(r);}finally{if(e)throw e.error}}},e.prototype.defer=function(t){var e=this;this.delayedEventsMap[t.id]=this.clock.setTimeout((function(){t.to?e.sendTo(t._event,t.to):e.send(t._event);}),t.delay);},e.prototype.cancel=function(t){this.clock.clearTimeout(this.delayedEventsMap[t]),delete this.delayedEventsMap[t];},e.prototype.exec=function(t,e,n){void 0===n&&(n=this.machine.options.actions);var i=e.context,r=e._event,o=t.exec||tt(t.type,n),s=O(o)?o:o?o.exec:t.exec;if(s)try{return s(i,r.data,{action:t,state:this.state,_event:r})}catch(t){throw this.parent&&this.parent.send({type:"xstate.error",data:t}),t}switch(t.type){case F:var c=t;if("number"==typeof c.delay)return void this.defer(c);c.to?this.sendTo(c._event,c.to):this.send(c._event);break;case J:this.cancel(t.sendId);break;case R:var u=t.activity;if(!this.state.activities[u.id||u.type])break;if(u.type===j.Invoke){var h=this.machine.options.services?this.machine.options.services[u.src]:void 0,l=u.id,f=u.data;a||E(!("forward"in u),"`forward` property is deprecated (found in invocation of '"+u.src+"' in in machine '"+this.machine.id+"'). Please use `autoForward` instead.");var d="autoForward"in u?u.autoForward:!!u.forward;if(!h)return void(a||E(!1,"No service found for invocation '"+u.src+"' in machine '"+this.machine.id+"'."));var p=f?_(f,i,r):void 0,v=O(h)?h(i,r.data,{data:p}):h;x(v)?this.state.children[l]=this.spawnPromise(Promise.resolve(v),l):O(v)?this.state.children[l]=this.spawnCallback(v,l):P(v)?this.state.children[l]=this.spawnObservable(v,l):M(v)&&(this.state.children[l]=this.spawnMachine(p?v.withContext(p):v,{id:l,autoForward:d}));}else this.spawnActivity(u);break;case $:this.stopChild(t.activity.id);break;case q:var y=t.label,g=t.value;y?this.logger(y,g):this.logger(g);break;default:a||E(!1,"No implementation found for action type '"+t.type+"'");}},e.prototype.removeChild=function(t){this.children.delete(t),this.forwardTo.delete(t),delete this.state.children[t];},e.prototype.stopChild=function(t){var e=this.children.get(t);e&&(this.removeChild(t),O(e.stop)&&e.stop());},e.prototype.spawn=function(e,n,i){if(x(e))return this.spawnPromise(Promise.resolve(e),n);if(O(e))return this.spawnCallback(e,n);if(_t(e))return this.spawnActor(e);if(P(e))return this.spawnObservable(e,n);if(M(e))return this.spawnMachine(e,t(t({},i),{id:n}));throw new Error('Unable to spawn entity "'+n+'" of type "'+typeof e+'".')},e.prototype.spawnMachine=function(n,i){var r=this;void 0===i&&(i={});var o=new e(n,t(t({},this.options),{parent:this,id:i.id||n.id})),a=t(t({},Lt),i);a.sync&&o.onTransition((function(t){r.send(K,{state:t,id:o.id});}));var s=o;return this.children.set(o.id,s),a.autoForward&&this.forwardTo.add(o.id),o.onDone((function(t){r.removeChild(o.id),r.send(I(t,{origin:o.id}));})).start(),s},e.prototype.spawnPromise=function(t,e){var n=this,i=!1;t.then((function(t){i||(n.removeChild(e),n.send(I(ct(e,t),{origin:e})));}),(function(t){if(!i){n.removeChild(e);var r=ut(e,t);try{n.send(I(r,{origin:e}));}catch(i){!function(t,e,n){if(!a){var i=t.stack?" Stacktrace was '"+t.stack+"'":"";if(t===e)console.error("Missing onError handler for invocation '"+n+"', error was '"+t+"'."+i);else {var r=e.stack?" Stacktrace was '"+e.stack+"'":"";console.error("Missing onError handler and/or unhandled exception/promise rejection for invocation '"+n+"'. Original error: '"+t+"'. "+i+" Current error is '"+e+"'."+r);}}}(t,i,e),n.devTools&&n.devTools.send(r,n.state),n.machine.strict&&n.stop();}}}));var r={id:e,send:function(){},subscribe:function(e,n,i){var r=!1;return t.then((function(t){r||(e&&e(t),r||i&&i());}),(function(t){r||n(t);})),{unsubscribe:function(){return r=!0}}},stop:function(){i=!0;},toJSON:function(){return {id:e}}};return this.children.set(e,r),r},e.prototype.spawnCallback=function(t,e){var n,i=this,r=!1,o=new Set,a=new Set;try{n=t((function(t){a.forEach((function(e){return e(t)})),r||i.send(t);}),(function(t){o.add(t);}));}catch(t){this.send(ut(e,t));}if(x(n))return this.spawnPromise(n,e);var s={id:e,send:function(t){return o.forEach((function(e){return e(t)}))},subscribe:function(t){return a.add(t),{unsubscribe:function(){a.delete(t);}}},stop:function(){r=!0,O(n)&&n();},toJSON:function(){return {id:e}}};return this.children.set(e,s),s},e.prototype.spawnObservable=function(t,e){var n=this,i=t.subscribe((function(t){n.send(I(t,{origin:e}));}),(function(t){n.removeChild(e),n.send(I(ut(e,t),{origin:e}));}),(function(){n.removeChild(e),n.send(I(ct(e),{origin:e}));})),r={id:e,send:function(){},subscribe:function(e,n,i){return t.subscribe(e,n,i)},stop:function(){return i.unsubscribe()},toJSON:function(){return {id:e}}};return this.children.set(e,r),r},e.prototype.spawnActor=function(t){return this.children.set(t.id,t),t},e.prototype.spawnActivity=function(t){var e=this.machine.options&&this.machine.options.activities?this.machine.options.activities[t.type]:void 0;if(e){var n=e(this.state.context,t);this.spawnEffect(t.id,n);}else a||E(!1,"No implementation found for activity '"+t.type+"'");},e.prototype.spawnEffect=function(t,e){this.children.set(t,{id:t,send:function(){},subscribe:function(){return {unsubscribe:function(){}}},stop:e||void 0,toJSON:function(){return {id:t}}});},e.prototype.attachDev=function(){if(this.options.devTools&&"undefined"!=typeof window){if(window.__REDUX_DEVTOOLS_EXTENSION__){var e="object"==typeof this.options.devTools?this.options.devTools:void 0;this.devTools=window.__REDUX_DEVTOOLS_EXTENSION__.connect(t(t({name:this.id,autoPause:!0,stateSanitizer:function(t){return {value:t.value,context:t.context,actions:t.actions}}},e),{features:t({jump:!1,skip:!1},e?e.features:void 0)}),this.machine),this.devTools.init(this.state);}Vt(this);}},e.prototype.toJSON=function(){return {id:this.id}},e.prototype[V]=function(){return this},e.defaultOptions=function(t){return {execute:!0,deferEvents:!0,clock:{setTimeout:function(e,n){return t.setTimeout.call(null,e,n)},clearTimeout:function(e){return t.clearTimeout.call(null,e)}},logger:t.console.log.bind(console),devTools:!1}}("undefined"==typeof window?global:window),e.interpret=At,e}();function At(t,e){return new Dt(t,e)}
    /*! xstate-component-tree@3.0.0 !*/const Rt=async({item:t,load:e,context:n,event:i})=>{const r=await e(n,i);if(Array.isArray(r)){const[e,n]=await Promise.all(r);t.component=e,t.props=n;}else t.component=r;},$t=async({child:t,root:e})=>{const{_tree:n}=t,i=await n;e.children.push(...i);};class zt{constructor(t,e,{cache:n=!0}=!1){this._interpreter=t,this._callback=e,this._caching=n,this.id=t.id,this._counter=0,this._cache=new Map,this._paths=new Map,this._invocables=new Map,this._children=new Map,this._tree=!1,this._data=!1,this._prep(),this._watch();}teardown(){this._paths.clear(),this._invocables.clear(),this._children.clear(),this._cache.clear(),this._tree=null,this._data=null,this.options=null,this._unsubscribe();}_prep(){const{_paths:t,_invocables:e,_interpreter:n,_caching:i}=this,{idMap:r}=n.machine;for(const n in r){const{path:o,meta:a=!1,invoke:s}=r[n],c=o.join(".");a&&t.set(c,{__proto__:null,cache:i,...a}),s.forEach(({id:t})=>e.set(c,t));}}_watch(){const{_interpreter:t}=this,{unsubscribe:e}=t.subscribe(t=>this._state(t));this._unsubscribe=e;}async _walk(){const{_paths:t,_invocables:e,_children:n,_cache:i,_counter:r,_data:{value:o,context:a,event:s}}=this,c=[],u={__proto__:null,id:this.id,children:[]};let h;for(h="string"==typeof o?[[u,o,!1]]:Object.keys(o).map(t=>[u,t,o[t]]);h.length&&r===this._counter;){const[r,o,u]=h.shift();let l=r;if(t.has(o)){const e=t.get(o);let n=!1;i.has(o)&&(n=i.get(o),n.counter===this._counter-1?n.counter=this._counter:(n=!1,i.delete(o)));const{component:u=!1,props:h=!1,load:f}=e,d={__proto__:null,component:n?n.item.component:u,props:n?n.item.props:h,children:[]};if(f&&!n.loaded){const t=Rt({item:d,load:f,context:a,event:s});t.then(()=>{const t=i.get(o);t&&(t.loaded=!0);}),c.push(t);}e.cache&&!n&&i.set(o,{__proto__:null,item:d,counter:this._counter,loaded:!1}),r.children.push(d),l=d;}if(e.has(o)){const t=e.get(o);n.has(t)&&c.push($t({child:n.get(t),root:l}));}u&&("string"!=typeof u?h.push(...Object.keys(u).map(t=>[l,`${o}.${t}`,u[t]])):h.push([l,`${o}.${u}`,!1]));}return await Promise.all(c),u.children}async _run(){const{_children:t,_callback:e}=this,n=++this._counter;this._tree=this._walk();const[i]=await Promise.all([this._tree,[...t.values()].map(({_tree:t})=>t)]);n===this._counter&&e(i,{data:this._data});}_state(t){const{changed:e,children:n}=t;if(!1===e)return !1;this._data={__proto__:null,value:t.value,event:t.event,context:t.context};const{_children:i}=this;return i.forEach((t,e)=>{e in n||(t.teardown(),t=null,i.delete(e));}),Object.keys(n).forEach(t=>{if(i.has(t))return;const e=n[t];e.initialized&&e.state&&i.set(t,new zt(e,()=>this._run()));}),this._run()}}var Ft=(t,e={},n)=>({...e,meta:{...e.meta,load:(e,i)=>[t,{...n,ctx:e,event:i}]}});let Ut=!0;var xcr = ({xstate:{config:t={},options:e={}}={},router:{name:n="XCR",routes:i=[],fallback:r=!1}={},options:{debug:o=!1}={}}={})=>{const a=new Map(Object.entries(i)),{paramsObj:s}=(()=>{const t={},e=[];return window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,(function(n,i,r){t[i]=r,e.push(`${i}=${r}`);})),{paramsObj:t,paramsString:e.join("&")}})(),c={params:s},u={"xcr:update:params":{actions:at(({params:t={}})=>({params:t}))},"xcr:404":r};a.forEach((t,e)=>{u["xcr:url:"+e]=t.replace(/^\/|\/$/g,"");});const h=At(function(t,e,n){void 0===n&&(n=t.context);var i="function"==typeof n?n():n;return new bt(t,e,i)}({...t,on:{...t.on,...u}},e).withContext({...c}));h.start(),o&&setTimeout(()=>{window.state=h;},1e3);const l=async()=>{const t=((t=window.location.hash)=>{let[e]=t.split("?");return e=e.replace("#",""),e=e.replace(/^\/|\/$/g,""),e})(window.location.hash);if(o&&console.log("URL",{path:t,params:s}),a.has(t)){if(Ut)return Ut=!1,await(e=500,new Promise((t,n)=>setTimeout(t,e))),h.send("xcr:url:"+t);h.send("xcr:url:"+t);}else r&&h.send("xcr:404");var e;};return h.subscribe(t=>{const e=t.toStrings().pop(),i=Object.entries(t.context.params).map(([t,e])=>`${t}=${e}`).join("&");a.forEach((t,r)=>{t===e&&history.pushState({},n,`#/${r}${i?"?"+i:""}`);}),o&&console.log("State",t);}),l(),window.onpopstate=l,window.onhashchange=l,{service:h,components:t=>new zt(h,t)}};

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    var __assign = function () {
      __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }

        return t;
      };

      return __assign.apply(this, arguments);
    };

    function getEventType(event) {
      try {
        return isString(event) || typeof event === 'number' ? "" + event : event.type;
      } catch (e) {
        throw new Error('Events must be strings or objects with a string event.type property.');
      }
    }


    function isFunction(value) {
      return typeof value === 'function';
    }

    function isString(value) {
      return typeof value === 'string';
    } // export function memoizedGetter<T, TP extends { prototype: object }>(

    function toEventObject(event, payload // id?: TEvent['type']
    ) {
      if (isString(event) || typeof event === 'number') {
        return __assign({
          type: event
        }, payload);
      }

      return event;
    }

    var ActionTypes;

    (function (ActionTypes) {
      ActionTypes["Start"] = "xstate.start";
      ActionTypes["Stop"] = "xstate.stop";
      ActionTypes["Raise"] = "xstate.raise";
      ActionTypes["Send"] = "xstate.send";
      ActionTypes["Cancel"] = "xstate.cancel";
      ActionTypes["NullEvent"] = "";
      ActionTypes["Assign"] = "xstate.assign";
      ActionTypes["After"] = "xstate.after";
      ActionTypes["DoneState"] = "done.state";
      ActionTypes["DoneInvoke"] = "done.invoke";
      ActionTypes["Log"] = "xstate.log";
      ActionTypes["Init"] = "xstate.init";
      ActionTypes["Invoke"] = "xstate.invoke";
      ActionTypes["ErrorExecution"] = "error.execution";
      ActionTypes["ErrorCommunication"] = "error.communication";
      ActionTypes["ErrorPlatform"] = "error.platform";
      ActionTypes["ErrorCustom"] = "xstate.error";
      ActionTypes["Update"] = "xstate.update";
      ActionTypes["Pure"] = "xstate.pure";
      ActionTypes["Choose"] = "xstate.choose";
    })(ActionTypes || (ActionTypes = {}));

    var SpecialTargets;

    (function (SpecialTargets) {
      SpecialTargets["Parent"] = "#_parent";
      SpecialTargets["Internal"] = "#_internal";
    })(SpecialTargets || (SpecialTargets = {}));

    var start = ActionTypes.Start;
    var stop = ActionTypes.Stop;
    var raise = ActionTypes.Raise;
    var send = ActionTypes.Send;
    var cancel = ActionTypes.Cancel;
    var nullEvent = ActionTypes.NullEvent;
    var assign$1 = ActionTypes.Assign;
    var after = ActionTypes.After;
    var doneState = ActionTypes.DoneState;
    var log = ActionTypes.Log;
    var init$1 = ActionTypes.Init;
    var invoke = ActionTypes.Invoke;
    var errorExecution = ActionTypes.ErrorExecution;
    var errorPlatform = ActionTypes.ErrorPlatform;
    var error = ActionTypes.ErrorCustom;
    var update$1 = ActionTypes.Update;
    var choose = ActionTypes.Choose;
    var pure = ActionTypes.Pure;

    function getActionFunction(actionType, actionFunctionMap) {
      return actionFunctionMap ? actionFunctionMap[actionType] || undefined : undefined;
    }

    function toActionObject(action, actionFunctionMap) {
      var actionObject;

      if (isString(action) || typeof action === 'number') {
        var exec = getActionFunction(action, actionFunctionMap);

        if (isFunction(exec)) {
          actionObject = {
            type: action,
            exec: exec
          };
        } else if (exec) {
          actionObject = exec;
        } else {
          actionObject = {
            type: action,
            exec: undefined
          };
        }
      } else if (isFunction(action)) {
        actionObject = {
          // Convert action to string if unnamed
          type: action.name || action.toString(),
          exec: action
        };
      } else {
        var exec = getActionFunction(action.type, actionFunctionMap);

        if (isFunction(exec)) {
          actionObject = __assign(__assign({}, action), {
            exec: exec
          });
        } else if (exec) {
          var actionType = exec.type || action.type;
          actionObject = __assign(__assign(__assign({}, exec), action), {
            type: actionType
          });
        } else {
          actionObject = action;
        }
      }

      Object.defineProperty(actionObject, 'toString', {
        value: function () {
          return actionObject.type;
        },
        enumerable: false,
        configurable: true
      });
      return actionObject;
    }

    function toActivityDefinition(action) {
      var actionObject = toActionObject(action);
      return __assign(__assign({
        id: isString(action) ? action : actionObject.id
      }, actionObject), {
        type: actionObject.type
      });
    }
    /**
     * Raises an event. This places the event in the internal event queue, so that
     * the event is immediately consumed by the machine in the current step.
     *
     * @param eventType The event to raise.
     */


    function raise$1(event) {
      if (!isString(event)) {
        return send$1(event, {
          to: SpecialTargets.Internal
        });
      }

      return {
        type: raise,
        event: event
      };
    }
    /**
     * Sends an event. This returns an action that will be read by an interpreter to
     * send the event in the next step, after the current step is finished executing.
     *
     * @param event The event to send.
     * @param options Options to pass into the send event:
     *  - `id` - The unique send event identifier (used with `cancel()`).
     *  - `delay` - The number of milliseconds to delay the sending of the event.
     *  - `to` - The target of this event (by default, the machine the event was sent from).
     */


    function send$1(event, options) {
      return {
        to: options ? options.to : undefined,
        type: send,
        event: isFunction(event) ? event : toEventObject(event),
        delay: options ? options.delay : undefined,
        id: options && options.id !== undefined ? options.id : isFunction(event) ? event.name : getEventType(event)
      };
    }
    /**
     * Sends an event to this machine's parent.
     *
     * @param event The event to send to the parent machine.
     * @param options Options to pass into the send event.
     */


    function sendParent(event, options) {
      return send$1(event, __assign(__assign({}, options), {
        to: SpecialTargets.Parent
      }));
    }
    /**
     * Sends an update event to this machine's parent.
     */


    function sendUpdate() {
      return sendParent(update$1);
    }
    /**
     * Sends an event back to the sender of the original event.
     *
     * @param event The event to send back to the sender
     * @param options Options to pass into the send event
     */


    function respond(event, options) {
      return send$1(event, __assign(__assign({}, options), {
        to: function (_, __, _a) {
          var _event = _a._event;
          return _event.origin; // TODO: handle when _event.origin is undefined
        }
      }));
    }

    var defaultLogExpr = function (context, event) {
      return {
        context: context,
        event: event
      };
    };
    /**
     *
     * @param expr The expression function to evaluate which will be logged.
     *  Takes in 2 arguments:
     *  - `ctx` - the current state context
     *  - `event` - the event that caused this action to be executed.
     * @param label The label to give to the logged expression.
     */


    function log$1(expr, label) {
      if (expr === void 0) {
        expr = defaultLogExpr;
      }

      return {
        type: log,
        label: label,
        expr: expr
      };
    }
    /**
     * Cancels an in-flight `send(...)` action. A canceled sent action will not
     * be executed, nor will its event be sent, unless it has already been sent
     * (e.g., if `cancel(...)` is called after the `send(...)` action's `delay`).
     *
     * @param sendId The `id` of the `send(...)` action to cancel.
     */


    var cancel$1 = function (sendId) {
      return {
        type: cancel,
        sendId: sendId
      };
    };
    /**
     * Starts an activity.
     *
     * @param activity The activity to start.
     */


    function start$1(activity) {
      var activityDef = toActivityDefinition(activity);
      return {
        type: ActionTypes.Start,
        activity: activityDef,
        exec: undefined
      };
    }
    /**
     * Stops an activity.
     *
     * @param activity The activity to stop.
     */


    function stop$1(activity) {
      var activityDef = toActivityDefinition(activity);
      return {
        type: ActionTypes.Stop,
        activity: activityDef,
        exec: undefined
      };
    }
    /**
     * Updates the current context of the machine.
     *
     * @param assignment An object that represents the partial context to update.
     */


    var assign$2 = function (assignment) {
      return {
        type: assign$1,
        assignment: assignment
      };
    };
    /**
     * Returns an event type that represents an implicit event that
     * is sent after the specified `delay`.
     *
     * @param delayRef The delay in milliseconds
     * @param id The state node ID where this event is handled
     */


    function after$1(delayRef, id) {
      var idSuffix = id ? "#" + id : '';
      return ActionTypes.After + "(" + delayRef + ")" + idSuffix;
    }
    /**
     * Returns an event that represents that a final state node
     * has been reached in the parent state node.
     *
     * @param id The final state node's parent state node `id`
     * @param data The data to pass into the event
     */


    function done(id, data) {
      var type = ActionTypes.DoneState + "." + id;
      var eventObject = {
        type: type,
        data: data
      };

      eventObject.toString = function () {
        return type;
      };

      return eventObject;
    }

    function pure$1(getActions) {
      return {
        type: ActionTypes.Pure,
        get: getActions
      };
    }
    /**
     * Forwards (sends) an event to a specified service.
     *
     * @param target The target service to forward the event to.
     * @param options Options to pass into the send action creator.
     */


    function forwardTo(target, options) {
      return send$1(function (_, event) {
        return event;
      }, __assign(__assign({}, options), {
        to: target
      }));
    }
    /**
     * Escalates an error by sending it as an event to this machine's parent.
     *
     * @param errorData The error data to send, or the expression function that
     * takes in the `context`, `event`, and `meta`, and returns the error data to send.
     * @param options Options to pass into the send action creator.
     */


    function escalate(errorData, options) {
      return sendParent(function (context, event, meta) {
        return {
          type: error,
          data: isFunction(errorData) ? errorData(context, event, meta) : errorData
        };
      }, __assign(__assign({}, options), {
        to: SpecialTargets.Parent
      }));
    }

    function choose$1(conds) {
      return {
        type: ActionTypes.Choose,
        conds: conds
      };
    }

    var actions = {
      raise: raise$1,
      send: send$1,
      sendParent: sendParent,
      sendUpdate: sendUpdate,
      log: log$1,
      cancel: cancel$1,
      start: start$1,
      stop: stop$1,
      assign: assign$2,
      after: after$1,
      done: done,
      respond: respond,
      forwardTo: forwardTo,
      escalate: escalate,
      choose: choose$1,
      pure: pure$1
    };

    var raise$2 = actions.raise;
    var views = {
      initial: "boot",
      on: {
        APP_READY: ".start",
        RESET: ".start",
        RESULT: ".result"
      },
      states: {
        // Check local storage for previous result
        boot: {
          entry: raise$2("APP_READY")
        },
        // Start screen
        start: Ft(Promise.resolve().then(function () { return start$2; }), {
          on: {
            GENERATE: {
              target: "generating",
              actions: assign$2({
                url: function url(_, _ref) {
                  var _url = _ref.data;
                  return _url;
                }
              })
            }
          }
        }),
        // Generating endpoint and getting preview
        generating: Ft(Promise.resolve().then(function () { return generating; }), {
          initial: "generate",
          on: {
            GENERATE_COMPLETE: "result"
          },
          states: {
            generate: {
              invoke: {
                src: "generateEndpoint",
                onDone: {
                  target: "done",
                  actions: [assign$2({
                    endpoint: function endpoint(_, _ref2) {
                      var _endpoint = _ref2.data.endpoint;
                      return _endpoint;
                    }
                  })]
                },
                onError: {
                  target: "error"
                }
              }
            },
            done: {
              after: {
                2000: {
                  actions: raise$2("GENERATE_COMPLETE")
                }
              }
            },
            error: {
              entry: console.log
            }
          }
        }),
        // Load main UI
        result: Ft(Promise.resolve().then(function () { return result; }), {})
      }
    };

    var overlays = {};

    var config = {
      type: "parallel",
      context: {
        url: "",
        endpoint: "",
        result: ""
      },
      states: {
        views: views,
        overlays: overlays
      }
    };

    var config$1 = {
      API_URL: "https://fig-socket-api.vercel.app/api"
    };

    var API_URL = config$1.API_URL;
    var services = {
      generateEndpoint: function generateEndpoint(_ref) {
        var url = _ref.url;
        return /*#__PURE__*/asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
          var response;
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.prev = 0;
                  _context.next = 3;
                  return fetch("".concat(API_URL, "/generate-endpoint?url=").concat(encodeURIComponent(url)));

                case 3:
                  response = _context.sent;
                  return _context.abrupt("return", response.json());

                case 7:
                  _context.prev = 7;
                  _context.t0 = _context["catch"](0);
                  console.log(_context.t0);
                  throw _context.t0;

                case 11:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[0, 7]]);
        }));
      }
    };

    var guards = {};

    var _xcr = xcr({
      xstate: {
        config: config,
        options: {
          services: services,
          guards: guards
        }
      },
      options: {
        debug: true
      }
    }),
        service = _xcr.service,
        components = _xcr.components; // Whenever the tree updates save value off to tree store.


    var tree = writable([], function (set) {
      components(function (list) {
        set(list);
      });
    });

    var send$2 = function send(el, event) {
      return el.addEventListener("click", /*#__PURE__*/function () {
        var _ref = asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(e) {
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  e.preventDefault();
                  _context.next = 3;
                  return event;

                case 3:
                  if (event.self) {
                    if (el === e.target) {
                      delete event.self;
                      service.send(event);
                    }
                  } else {
                    service.send(event);
                  }

                case 4:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }());
    };

    const file = "src\\app.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i].component;
    	child_ctx[2] = list[i].props;
    	child_ctx[3] = list[i].children;
    	return child_ctx;
    }

    // (13:12) {#each $components as { component, props, children }
    function create_each_block(key_1, ctx) {
    	let first;
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ components: /*children*/ ctx[3] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[1].default;

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$components*/ 1)
    			? get_spread_update(switch_instance_spread_levels, [{ components: /*children*/ ctx[3] }, get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[1].default)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(13:12) {#each $components as { component, props, children }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let h3;
    	let t1;
    	let button;
    	let send_action;
    	let t3;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t4;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*$components*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*component*/ ctx[1].default;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "FigSocket";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Reset";
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div2 = element("div");
    			attr_dev(h3, "class", "m-0");
    			add_location(h3, file, 8, 12, 282);
    			add_location(button, file, 9, 12, 326);
    			attr_dev(div0, "class", "d-flex justify-content-between align-items-center pb-4");
    			add_location(div0, file, 7, 8, 200);
    			attr_dev(div1, "class", "view");
    			add_location(div1, file, 11, 8, 393);
    			attr_dev(div2, "class", "footer");
    			add_location(div2, file, 16, 8, 641);
    			attr_dev(div3, "class", "content");
    			add_location(div3, file, 6, 4, 169);
    			attr_dev(div4, "class", "app container justify-content-center mt-5 p-4 svelte-5lf5vr");
    			add_location(div4, file, 5, 0, 104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(div3, t3);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(send_action = send$2.call(null, button, "RESET"));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$components*/ 1) {
    				const each_value = /*$components*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
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
    	let $components;
    	validate_store(tree, "components");
    	component_subscribe($$self, tree, $$value => $$invalidate(0, $components = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ send: send$2, components: tree, $components });
    	return [$components];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
      target: document.body
    });

    const file$1 = "./src/views/start/start.svelte";

    function create_fragment$1(ctx) {
    	let div5;
    	let div4;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let h3;
    	let t5;
    	let hr;
    	let t6;
    	let p1;
    	let t8;
    	let img0;
    	let img0_src_value;
    	let t9;
    	let p2;
    	let t11;
    	let img1;
    	let img1_src_value;
    	let t12;
    	let div3;
    	let div2;
    	let form;
    	let input;
    	let t13;
    	let button0;
    	let t15;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "FigSocket generates an enpoint that allows you to retrieve the JSON representation of any Figma file.";
    			t3 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "How To";
    			t5 = space();
    			hr = element("hr");
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Make sure the privacy settings for your Figma document are at least set to \"can view\".";
    			t8 = space();
    			img0 = element("img");
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "Copy the URL to your Figma document and paste below.";
    			t11 = space();
    			img1 = element("img");
    			t12 = space();
    			div3 = element("div");
    			div2 = element("div");
    			form = element("form");
    			input = element("input");
    			t13 = space();
    			button0 = element("button");
    			button0.textContent = "Generate Endpoint";
    			t15 = space();
    			button1 = element("button");
    			button1.textContent = "Run Demo";
    			add_location(h1, file$1, 3, 12, 86);
    			add_location(p0, file$1, 4, 12, 116);
    			attr_dev(div0, "class", "col-12");
    			add_location(div0, file$1, 2, 8, 52);
    			attr_dev(h3, "class", "mt-5");
    			add_location(h3, file$1, 7, 12, 284);
    			add_location(hr, file$1, 8, 12, 326);
    			attr_dev(p1, "class", "mt-2");
    			add_location(p1, file$1, 9, 12, 344);
    			attr_dev(img0, "class", "w-100");
    			if (img0.src !== (img0_src_value = "images/can-view.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$1, 10, 12, 464);
    			attr_dev(p2, "class", "mt-4");
    			add_location(p2, file$1, 11, 12, 525);
    			attr_dev(img1, "class", "w-100 mt-4");
    			if (img1.src !== (img1_src_value = "images/figma-url.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$1, 12, 12, 611);
    			attr_dev(div1, "class", "col-12");
    			add_location(div1, file$1, 6, 8, 250);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Figma Document URL");
    			add_location(input, file$1, 17, 20, 826);
    			attr_dev(button0, "type", "submit");
    			add_location(button0, file$1, 18, 20, 921);
    			add_location(form, file$1, 16, 15, 758);
    			add_location(button1, file$1, 21, 15, 1012);
    			attr_dev(div2, "class", "mt-5");
    			add_location(div2, file$1, 15, 11, 723);
    			attr_dev(div3, "class", "col-12");
    			add_location(div3, file$1, 14, 8, 690);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$1, 1, 4, 25);
    			attr_dev(div5, "class", "start");
    			add_location(div5, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div4, t3);
    			append_dev(div4, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t5);
    			append_dev(div1, hr);
    			append_dev(div1, t6);
    			append_dev(div1, p1);
    			append_dev(div1, t8);
    			append_dev(div1, img0);
    			append_dev(div1, t9);
    			append_dev(div1, p2);
    			append_dev(div1, t11);
    			append_dev(div1, img1);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, form);
    			append_dev(form, input);
    			set_input_value(input, /*url*/ ctx[0]);
    			append_dev(form, t13);
    			append_dev(form, button0);
    			append_dev(div2, t15);
    			append_dev(div2, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[1]), false, true, false),
    					listen_dev(button1, "click", /*runDemo*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*url*/ 1 && input.value !== /*url*/ ctx[0]) {
    				set_input_value(input, /*url*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
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
    	validate_slots("Start", slots, []);
    	let url = "";

    	const handleSubmit = () => {
    		service.send({ type: "GENERATE", data: url });
    	};

    	const runDemo = () => {
    		$$invalidate(0, url = "https://www.figma.com/file/EoIGjb8EwKbqjw7TRq5JUg/FigSocket?node-id=0%3A1");
    		return handleSubmit();
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Start> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		url = this.value;
    		$$invalidate(0, url);
    	}

    	$$self.$capture_state = () => ({ service, url, handleSubmit, runDemo });

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url, handleSubmit, runDemo, input_input_handler];
    }

    class Start extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Start",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var start$2 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Start
    });

    const file$2 = "./src/views/generating/generating.svelte";

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let p;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Generating";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*url*/ ctx[0]);
    			add_location(h1, file$2, 0, 0, 0);
    			add_location(p, file$2, 1, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*url*/ 1) set_data_dev(t2, /*url*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $service;
    	validate_store(service, "service");
    	component_subscribe($$self, service, $$value => $$invalidate(1, $service = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Generating", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Generating> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ service, url, $service });

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	let url;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$service*/ 2) {
    			 $$invalidate(0, { url } = $service.context, url);
    		}
    	};

    	return [url];
    }

    class Generating extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Generating",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var generating = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Generating
    });

    const file$3 = "./src/views/result/result.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let a;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Result";
    			t1 = space();
    			a = element("a");
    			t2 = text(/*endpoint*/ ctx[0]);
    			add_location(h1, file$3, 2, 4, 28);
    			attr_dev(a, "href", /*endpoint*/ ctx[0]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$3, 3, 4, 49);
    			attr_dev(div, "class", "result");
    			add_location(div, file$3, 1, 0, 2);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, a);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*endpoint*/ 1) set_data_dev(t2, /*endpoint*/ ctx[0]);

    			if (dirty & /*endpoint*/ 1) {
    				attr_dev(a, "href", /*endpoint*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $service;
    	validate_store(service, "service");
    	component_subscribe($$self, service, $$value => $$invalidate(1, $service = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Result", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Result> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ service, endpoint, $service });

    	$$self.$inject_state = $$props => {
    		if ("endpoint" in $$props) $$invalidate(0, endpoint = $$props.endpoint);
    	};

    	let endpoint;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$service*/ 2) {
    			 $$invalidate(0, { endpoint } = $service.context, endpoint);
    		}
    	};

    	return [endpoint];
    }

    class Result extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Result",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    var result = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Result
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
