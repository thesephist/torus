// @begindebug
//> These utility functions enable rich debugging statements
//  during development, when using the development build
//  (`dist/torus.dev.js`). These give you hierarchical information
//  about what components are being rendered, and how.

//> Flag to enable rich debugging during renders
const DEBUG_RENDER = true;

//> Repeat a string `count` times. Used to indent in `render_debug`.
const repeat = (str, count) => {
    let s = '';
    while (count -- > 0) {
        s += str;
    }
    return s;
}

//> Main rich debug logger function. `render_debug()` depends on
//  the `render_stack` counter in our rendering algorithm to
//  figure out how deep in the render tree we are, and indent
//  the message to the level appropriate to our place in the
//  render tree.
const render_debug = (msg, header = false) => {
    if (DEBUG_RENDER) {
        if (header) {
            //> We want to pull forward headers in front
            //  of their section contents, so we de-indent 1.
            const prefix = repeat('\t', render_stack - 1);
            console.log('%c' + prefix + msg, 'font-weight: bold');
        } else {
            const prefix = repeat('\t', render_stack);
            console.log(prefix + msg);
        }
    }
}
// @enddebug

//> A global counter for how deep we are in our render tree.
//  0 indicates that we aren't in the middle of rendering.
let render_stack = 0;

//> Shortcut utility function to check if a given name is
//  bound to something that's an actual object (not just null).
//  We perform the `null` check first because that's faster.
const isObject = obj => obj !== null && typeof obj === 'object';

//> `normalizeJDOM` takes a JDOM object (dictionary) and modifies
//  it in place so it has the default JDOM properties, and we don't
//  have to complicate our rendering code by checking for nulls with
//  every key access into our serialized virtual DOM.
//  Note that we don't check `isObject(jdom)` here. We assume
//  only valid objects are passed in to 'normalize', which is true
//  in our usage so far. `normalizeJDOM` is a hot path in rendering,
//  so we need it as fast as it can be.
const normalizeJDOM = jdom => {
    jdom.attrs = jdom.attrs !== undefined ? jdom.attrs : {};
    jdom.events = jdom.events !== undefined ? jdom.events : {};
    jdom.children = jdom.children !== undefined ? jdom.children : [];
}

//> Quick shorthand to normalize either 1. a single value or 2. an array
//  of values into an array of values. This is useful because JDOM
//  accepts either into things like `attrs.class` and `events.<name>`.
const arrayNormalize = data => Array.isArray(data) ? data : [data];

//> We use comment nodes as placeholder nodes because they're lightweight
//  and invisible.
const tmpNode = () => document.createComment('');

//> `opQueue` is a global queue of node-level operations to be performed.
//  These are calculated during the diff, but because operations touching the
//  page DOM are expensive, we defer them until the end of a render pass
//  and run them all at once, asynchronously. Each item in the queue is an array
//  that starts with an opcode (one of the three below), and is followed
//  by the list of arguments the operation takes. We render all operations in the queue
//  to the DOM before the browser renders the next frame.
let opQueue = [];
const OP_APPEND = 0; // append, parent, new
const OP_REMOVE = 1; // remove, parent, old
const OP_REPLACE = 2; // replace, old, new
//> This is a stubbed `parentNode`. See below in `runDOMOperations` for why this exists.
const STUB_PARENT = {replaceChild: () => {}};

//> `runDOMOperations` works through the `opQueue` and performs each
//  DOM operation in order they were queued. rDO is called when the reconciler
//  (`render`) reaches the bottom of a render stack (when it's done reconciling
//  the diffs in a root-level JDOM node of a component).
function runDOMOperations() {
    //> This function is written to avoid any potential reconciliation conflicts.
    //  There are two risks to mitigate: 1. attempting insert a node
    //  that is already in the DOM, and 2. attempting remove a node that isn't
    //  in the DOM. Both will result in inconsistent DOM state and break the renderer.
    //  To avoid this, first, we remove all children and add placeholders where they
    //  ought to be replaced. Then, in a second loop, we add any children that need
    //  to be added and replace placeholders. Thus, no children will be inadvertently removed
    //  and no wrong node will be removed.
    const len = opQueue.length;
    for (let i = 0; i < len; i ++) {
        const next = opQueue[i];
        const op = next[0];
        if (op === OP_REMOVE) {
            //> Remove all children that should be
            next[1].removeChild(next[2]);
        } else if (op === OP_REPLACE) {
            //> For the ones queued to for being replaced,
            //  put in a placeholder node, and queue that up instead.
            const oldNode = next[1];
            const tmp = tmpNode();
            const parent = oldNode.parentNode;
            //> Sometimes, the given node will be a standalone node
            //  (like the root of an unmounted component) and will have no `parentNode`.
            //  In these rare cases, it's best for performance to just set the parent to a stub
            //  with a no-op `replaceChild`. Trying to check for edge cases later each time is a
            //  performance penalty, since this is a very rare case.
            if (parent !== null) {
                parent.replaceChild(tmp, oldNode);
                next[1] = tmp;
                next[3] = parent;
            } else {
                next[3] = STUB_PARENT;
            }
        }
    }
    for (let i = 0; i < len; i ++) {
        const next = opQueue[i];
        const op = next[0];
        if (op === OP_APPEND) {
            //> Add any node that need to be added
            next[1].appendChild(next[2]);
        } else if (op === OP_REPLACE) {
            //> Replace placeholders with correct nodes. This is
            // equivalent to `parent.replaceChild(newNode, oldNode)`
            next[3].replaceChild(next[2], next[1]);
        }
    }
    opQueue = [];
}

//> A function to compare event handlers in `render`
const diffEvents = (whole, sub, cb) => {
    for (const eventName of Object.keys(whole)) {
        const wholeEvents = arrayNormalize(whole[eventName]);
        const subEvents = arrayNormalize(sub[eventName] || []);
        for (const handlerFn of wholeEvents) {
            if (!subEvents.includes(handlerFn)) {
                cb(eventName, handlerFn);
            }
        }
    }
}

//> Torus's virtual DOM rendering algorithm that manages all diffing,
//  updating, and efficient DOM access. `render` takes `node`, the previous
//  root node; `previous`, the previous JDOM; and `next`, the new JDOM;
//  and returns the new root node (potentially different from the old
//  root node.) Whenever a component is rendered, it calls `render`. This
//  rendering algorithm is recursive into child nodes. Despite not touching
//  the DOM, this is still one of the most expensive parts of rendering.
const render = (node, previous, next) => {

    //> This queues up a node to be inserted into a new slot in the
    //  DOM tree. All queued replacements will flush to DOM at the end
    //  of the render pass, from `runDOMOperations`.
    const replacePreviousNode = newNode => {
        if (node && node !== newNode) {
            opQueue.push([OP_REPLACE, node, newNode]);
        }
        node = newNode;
    };

    //> We're rendering a new node in the render tree. Increment counter.
    render_stack ++;

    //> We only do diff operations if the previous and next items are not the same.
    if (previous !== next) {
        //> If we need to render a null (comment) node,
        //  create and insert a comment node. This might seem
        //  silly, but it keeps the DOM consistent between
        //  renders and makes diff simpler.
        if (next === null) {
            // @begindebug
            if (node === undefined) {
                render_debug('Add comment node');
            } else {
                render_debug(`Replace previous node <${node.tagName}> with comment node`);
            }
            // @enddebug
            replacePreviousNode(tmpNode());
        //> If we're rendering a string or raw number,
        //  convert it into a string and add a TextNode.
        } else if (typeof next === 'string' || typeof next === 'number') {
            // @begindebug
            if (node === undefined) {
                render_debug(`Add text node "${next}"`);
            } else {
                render_debug(`Replace previous node "${previous}" with text node "${next}"`);
            }
            // @enddebug
            //> If the previous node was also a text node, just replace the `.nodeValue`, which is
            //  very fast. Otherwise, create a new `TextNode`.
            if (typeof previous === 'string' || typeof previous === 'number') {
                node.nodeValue = next;
            } else {
                replacePreviousNode(document.createTextNode(next));
            }
        //> If we need to render a literal DOM Node, just replace
        //  the old node with the literal node.
        } else if (next.appendChild !== undefined) { // check if next instanceof Node; fastest way is checking for presence of a non-getter property
            // @begindebug
            if (node === undefined) {
                render_debug(`Add literal element <${next.tagName.toLowerCase()}>`);
            } else {
                render_debug(`Replace literal element <${previous.tagName.toLowerCase()}> with literal element <${next.tagName.toLowerCase()}>`);
            }
            // @enddebug
            replacePreviousNode(next);
        //> If we're rendering an object literal, assume it's a serialized
        //  JDOM dictionary. This is the meat of the algorithm.
        } else { // next is a non-null object
            // @debug
            render_debug(`Render pass for <${next.tag}>:`, true);

            if (
                node === undefined
                || !isObject(previous)
                //> Check if previous instanceof Node; fastest way is checking for presence of a
                //  non-getter property, like `appendChild`.
                || (previous && previous.appendChild !== undefined)
                //> If the tags differ, we assume the subtrees will be different
                //  as well and just start a completely new element. This is efficient
                //  in practice, reduces the time complexity of the algorithm, and
                //  an optimization shared with React's reconciler.
                || previous.tag !== next.tag
            ) {
                //> If the previous JDOM doesn't exist or wasn't JDOM, we're adding a completely
                //  new node into the DOM. Stub an empty `previous`.
                previous = {
                    tag: null,
                };
                replacePreviousNode(document.createElement(next.tag));
                // @begindebug
                if (node === undefined) {
                    render_debug(`Add <${next.tag}>`);
                } else {
                    render_debug(`Replace previous node <${node.tagName}> with <${next.tag}>`);
                }
                // @enddebug
            }
            normalizeJDOM(previous);
            normalizeJDOM(next);

            //> Compare and update attributes
            for (const attrName of Object.keys(next.attrs)) {
                if (attrName === 'class') {
                    //> JDOM can pass classes as either a single string
                    //  or an array of strings, so we need to check for either
                    //  of those cases.
                    const nextClass = next.attrs.class;
                    //> Mutating `className` is faster than iterating through
                    //  `classList` objects if there's only one batch operation
                    //  for all class changes.
                    if (Array.isArray(nextClass)) {
                        // @begindebug
                        if (node.className !== nextClass.join(' ')) {
                            render_debug(`Update class names for <${next.tag}> to "${nextClass.join(' ')}"`);
                        }
                        // @enddebug
                        node.className = nextClass.join(' ');
                    } else {
                        // @begindebug
                        if (node.className !== nextClass) {
                            render_debug(`Update class name for <${next.tag}> to ${nextClass}`);
                        }
                        // @enddebug
                        node.className = nextClass;
                    }
                } else if (attrName === 'style') {
                    //> JDOM takes style attributes as a dictionary
                    //  rather than a string for API ergonomics, so we serialize
                    //  it differently than other attributes.
                    const prevStyle = previous.attrs.style || {};
                    const nextStyle = next.attrs.style;

                    //> When we iterate through the key/values of a flat object like this,
                    //  you may be tempted to use `Object.entries()`. We use `Object.keys()` and lookups,
                    //  which is less idiomatic, but fast. This results in a measurable performance bump.
                    for (const styleKey of Object.keys(nextStyle)) {
                        if (nextStyle[styleKey] !== prevStyle[styleKey]) {
                            // @debug
                            render_debug(`Set <${next.tag}> style ${styleKey}: ${nextStyle[styleKey]}`);
                            node.style[styleKey] = nextStyle[styleKey];
                        }
                    }
                    for (const styleKey of Object.keys(prevStyle)) {
                        if (nextStyle[styleKey] === undefined) {
                            // @debug
                            render_debug(`Unsetting <${next.tag}> style ${styleKey}: ${prevStyle[styleKey]}`);
                            node.style[styleKey] = '';
                        }
                    }
                //> If an attribute is an IDL attribute, we set it
                //  through JavaScript properties on the HTML element
                //  and not `setAttribute()`. This is necessary for
                //  properties like `value` and `indeterminate`.
                } else if (attrName in node) {
                    // @debug
                    render_debug(`Set <${next.tag}> property ${attrName} = ${next.attrs[attrName]}`);
                    node[attrName] = next.attrs[attrName];
                } else {
                    if (next.attrs[attrName] !== previous.attrs[attrName]) {
                        // @debug
                        render_debug(`Set <${next.tag}> attribute "${attrName}" to "${next.attrs[attrName]}"`);
                        node.setAttribute(attrName, next.attrs[attrName]);
                    }
                }
            }

            //> For any attributes that were removed in the new JDOM,
            //  also attempt to remove them from the DOM.
            for (const attrName of Object.keys(previous.attrs)) {
                if (next.attrs[attrName] === undefined) {
                    if (attrName in node) {
                        // @debug
                        render_debug(`Remove <${next.tag} property ${attrName}`);
                        //> `null` seems to be the default for most IDL attrs,
                        //  but even this isn't entirely consistent. This seems
                        //  like something we should fix as issues come up, not
                        //  preemptively search for a cross-browser solution.
                        node[attrName] = null;
                    } else {
                        // @debug
                        render_debug(`Remove <${next.tag}> attribute ${attrName}`);
                        node.removeAttribute(attrName);
                    }
                }
            }

            diffEvents(next.events, previous.events, (eventName, handlerFn) => {
                // @debug
                render_debug(`Set new ${eventName} event listener on <${next.tag}>`);
                node.addEventListener(eventName, handlerFn);
            });
            diffEvents(previous.events, next.events, (eventName, handlerFn) => {
                // @debug
                render_debug(`Remove ${eventName} event listener on <${next.tag}>`);
                node.removeEventListener(eventName, handlerFn);
            });

            //> Render children recursively. These loops are also well optimized, since
            //  it's a hot patch of code at runtime.
            //  We memoize generated child nodes into this `previous._nodes` array
            //  so we don't have to perform expensive, DOM-touching operations during reconciliation
            //  to look up children of the current node in the next render pass. `nodeChildren`
            //  will be updated alongside enqueued DOM mutation operations.
            const nodeChildren = previous._nodes || [];
            const prevChildren = previous.children;
            const nextChildren = next.children;
            //> Memoize length lookups.
            const prevLength = prevChildren.length;
            const nextLength = nextChildren.length;
            const minLength = prevLength < nextLength ? prevLength : nextLength;
            if (nextLength > 0 || prevLength > 0) {
                //> "sync" the common sections of the two children lists.
                let i = 0;
                for (; i < minLength; i ++) {
                    if (prevChildren[i] !== nextChildren[i]) {
                        nodeChildren[i] = render(nodeChildren[i], prevChildren[i], nextChildren[i]);
                    }
                }
                //> If the new JDOM has more children than the old JDOM, we need to
                //  add the extra children.
                if (prevLength < nextLength) {
                    for (; i < nextLength; i ++) {
                        // @begindebug
                        if (nextChildren[i].tagName) {
                            render_debug(`Add child <${nextChildren[i].tagName.toLowerCase()}>`);
                        } else if (nextChildren[i].tag) {
                            render_debug(`Add child <${nextChildren[i].tag}>`);
                        } else {
                            render_debug(`Add child "${nextChildren[i]}"`);
                        }
                        // @enddebug
                        const newChild = render(undefined, undefined, nextChildren[i]);
                        opQueue.push([OP_APPEND, node, newChild]);
                        nodeChildren.push(newChild);
                    }
                //> If the new JDOM has less than or equal number of children to the old
                //  JDOM, we'll remove any stragglers.
                } else {
                    for (; i < prevLength; i ++) {
                        // @begindebug
                        if (prevChildren[i].tagName) {
                            render_debug(`Remove child <${prevChildren[i].tagName.toLowerCase()}>`);
                        } else if (prevChildren[i].tag) {
                            render_debug(`Remove child <${prevChildren[i].tag}>`);
                        } else {
                            render_debug(`Remove child "${prevChildren[i]}"`);
                        }
                        // @enddebug
                        //> If we need to remove a child element, removing
                        //  it from the DOM immediately might lead to race conditions.
                        //  instead, we add a placeholder and remove the placeholder
                        //  at the end.
                        opQueue.push([OP_REMOVE, node, nodeChildren[i]]);
                    }
                    nodeChildren.splice(nextLength, prevLength - nextLength);
                }
                //> Mount `nodeChildren` onto the up-to-date JDOM, so the next
                //  render pass can reference it.
                next._nodes = nodeChildren;
            }
        }
    }

    //> We're done rendering the current node,
    //  so decrement the render stack counter.
    render_stack --;

    //> If we've reached the top of the render tree, it's time
    //  to flush replaced nodes to the DOM before the next frame.
    if (render_stack === 0) {
        //> `runDOMOperations()` can also be called completely asynchronously
        //  with utilities like `requestIdleCallback`, _a la_ Concurrent React,
        //  for better responsiveness on larger component trees. This requires
        //  a modification to Torus's architecture, so that each set of `DOMOperations`
        //  tasks in the `opQueue` from one component's render call are flushed to
        //  the DOM before the next component's `DOMOperations` begins, for consistency.
        //  This can be achieved with a nested queue layer on top of `opQueue`.
        //  Here, we omit concurrency support today because it's not a great necessity
        //  where Torus is used.
        runDOMOperations();
    }

    return node;
}

//> Shorthand function for the default, empty event object in `Component`.
const emptyEvent = () => {
    return {
        source: null,
        handler: () => {},
    }
}

//> Torus's Component class
class Component {

    constructor(...args) {
        this.jdom = undefined;
        this.node = undefined;
        this.event = emptyEvent();
        //> We call init() before render, because it's a common pattern
        //  to set and initialize "private" fields in `this.init()` (at least
        //  before the ES-next private fields proposal becomes widely supported.)
        //  Frequently, rendering will require private values to be set correctly.
        this.init(...args);
        //> After we run `#init()`, we want to make sure that every constructed
        //  component has a valid `#node` property. To be efficient, we only
        //  render to set `#node` if it isn't already set yet.
        if (this.node === undefined) {
            this.render();
        }
    }

    //> `Component.from()` allows us to transform a pure function that
    //  maps arguments to a JDOM tree, and promote it into a full-fledged
    //  `Component` class we can compose and use anywhere.
    static from(fn) {
        return class FunctionComponent extends Component {
            init(...args) {
                this.args = args;
            }
            compose() {
                return fn(...this.args);
            }
        }
    }

    //> The default `Component#init()` is guaranteed to always be a no-op method
    init() {
        // should be overridden
    }

    //> Components usually subscribe to events from a Record, either a view model or
    //  a model that maps to business logic. This is shorthand to access that.
    get record() {
        return this.event.source;
    }

    bind(source, handler) {
        this.unbind();

        if (source instanceof Evented) {
            this.event = {source, handler};
            source.addHandler(handler);
        } else {
            throw new Error(`Tried to bind to ${source}, which is not an instance of Evented`);
        }
    }

    unbind() {
        if (this.record) {
            this.record.removeHandler(this.event.handler);
        }
        this.event = emptyEvent();
    }

    //> We use `#remove()` to prepare to remove the component from our application
    // entirely. By default, it unsubscribes from all updates. However, the component
    // is still in the render tree -- that's something for the user to decide when to
    //  hide.
    remove() {
        this.unbind();
    }

    //> `#compose()` is our primary rendering API for components. By default, it renders
    //  an invisible comment node.
    compose() {
        return null;
    }

    //> `#preprocess()` is an API on the component to allow us to extend `Component` to give
    //  it additional capabilities idiomatically. It consumes the result of `#compose()` and
    //  returns JDOM to be used to actually render the component. See `Styled()` for a
    //  usage example -- it fills similar use cases as React's render props or HOCs.
    preprocess(jdom) {
        return jdom;
    }

    //> `#render()` is called to actually render the component again to the DOM,
    //  and Torus assumes that it's called rarely, only when the component absolutely
    //  must update. This obviates the need for something like React's `shouldComponentUpdate`.
    render(data) {
        // @debug
        render_debug(`Render Component: ${this.constructor.name}`, true);
        data = data || (this.record && this.record.summarize())
        const jdom = this.preprocess(this.compose(data), data);
        if (jdom === undefined) {
            //> If the developer accidentally forgets to return the JDOM value from
            //  compose, instead of leading to a cryptic DOM API error, show a more
            //  friendly warning.
            throw new Error(this.constructor.name + '.compose() didn\'t return anything');
        }
        try {
            this.node = render(this.node, this.jdom, jdom);
        } catch (e) {
            /* istanbul ignore next: haven't found a reproducible error case that triggers this */
            console.error('Error rendering updates', e);
        }
        return this.jdom = jdom;
    }

}

//> We keep track of unique class names already injected into the
//  page's stylesheet, so we don't do redundant style reconciliation.
const injectedClassNames = new Set();

//> Global pointer to the stylesheet on the page that Torus uses to insert
//  new CSS rules. It's set the first time a styled component renders.
let styledComponentSheet = null;

//> Fast pure function to map a style rule to a very reasonably unique class name
//  that won't conflict with other classes on the page.
const generateUniqueClassName = stylesObject => {
    // Modified from https://github.com/darkskyapp/string-hash/blob/master/index.js
    const str = JSON.stringify(stylesObject);
    let i = str.length;
    let hash = 1989;
    while (i) {
        hash = (hash * 13) ^ str.charCodeAt(-- i);
    }
    return '_torus' + (hash >>> 0);
}

//> We have to construct lots of a{b} syntax in CSS, so here's a shorthand.
const brace = (a, b) => a + '{' + b + '}';

//> The meat of `Styled()`. This function maps an ergonomic, dictionary-based
//  set of CSS declarations to an array of CSS rules that can be inserted onto
//  the page stylesheet, and recursively resolves nested CSS, handles keyframes
//  and media queries, and parses other SCSS-like things.
const rulesFromStylesObject = (selector, stylesObject) => {
    let rules = [];
    let selfDeclarations = '';
    for (const prop of Object.keys(stylesObject)) {
        const val = stylesObject[prop];
        //> CSS declarations that start with '@' are globally namespaced
        //  (like @keyframes and @media), so we need to treat them differently.
        if (prop[0] === '@') {
            if (prop.startsWith('@media')) {
                rules.push(brace(prop, rulesFromStylesObject(selector, val).join('')));
            } else  { // @keyframes or @font-face
                rules.push(brace(prop, rulesFromStylesObject('', val).join('')));
            }
        } else {
            if (typeof val === 'object') {
                const commaSeparatedProps = prop.split(',');
                for (const p of commaSeparatedProps) {
                    //> SCSS-like syntax means we use '&' to nest declarations about
                    //  the parent selector.
                    if (p.includes('&')) {
                        const fullSelector = p.replace(/&/g, selector);
                        rules = rules.concat(rulesFromStylesObject(fullSelector, val));
                    } else {
                        rules = rules.concat(rulesFromStylesObject(selector + ' ' + p, val));
                    }
                }
            } else {
                selfDeclarations += prop + ':' + val + ';';
            }
        }
    }
    if (selfDeclarations) {
        rules.push(brace(selector, selfDeclarations));
    }

    return rules;
}

//> Function called once to initialize a stylesheet for Torus
//  to use on every subsequent style render.
const initSheet = () => {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-torus', '');
    document.head.appendChild(styleElement);
    styledComponentSheet = styleElement.sheet;
}

//> The preprocessor on `Styled()` components call this to
//  make sure a given set of CSS rules for a component is inserted
//  into the page stylesheet, but only once for a unique set of rules.
//  We disambiguate by the class name, which is a hash of the CSS rules.
const injectStylesOnce = stylesObject => {
    const className = generateUniqueClassName(stylesObject);
    if (!injectedClassNames.has(className)) {
        if (!styledComponentSheet) {
            initSheet();
        }
        const rules = rulesFromStylesObject('.' + className, stylesObject);
        for (const rule of rules) {
            // @debug
            render_debug(`Add new CSS rule: ${rule}`);
            styledComponentSheet.insertRule(rule, styledComponentSheet.cssRules.length);
        }
        injectedClassNames.add(className);
    }
    return className;
}

//> Higher-order component to enable styling for any Component class.
const Styled = Base => {
    return class extends Base {
        //> In a styled component, the `#styles()` method is passed in
        //  the same data as `#compose()`, and returns a JSON of nested CSS.
        styles() {
            return {};
        }

        preprocess(jdom, data) {
            if (isObject(jdom)) {
                jdom.attrs = jdom.attrs || {};
                jdom.attrs.class = arrayNormalize(jdom.attrs.class || []);
                jdom.attrs.class.push(injectStylesOnce(this.styles(data)));
            }
            return jdom;
        }
    }
}

//> Provide a default, `StyledComponent` class
const StyledComponent = Styled(Component);

//> Torus's generic List implementation, based on Stores.
//  React and similar virtual-dom view libraries depend on [key-based
//  reconciliation](https://reactjs.org/docs/reconciliation.html) during render
//  to efficiently render children of long lists. Torus doesn't (yet) have a key-aware
//  reconciler in the diffing algorithm, but `List`'s design obviates the need for keys.
//  Rather than giving the renderer a flat virtual DOM tree to render, `List`
//  instantiates each individual item component and hands them off to the renderer as full
//  DOM Node elements, so each list item manages its own rendering, and the list component
//  only worries about displaying the list wrapper and a flat list of children items.

class List extends Component {

    get itemClass() {
        return Component; // default value, should be overridden
    }

    init(store, ...itemData) {
        this.store = store;
        this.items = new Map();
        this.filterFn = null;
        this.itemData = itemData;

        this.bind(this.store, () => this.itemsChanged());
    }

    itemsChanged() {
        //> For every record in the store, if it isn't already in
        //  `this.items`, add it and its view; if any were removed,
        //  also remove it from `this.items`.
        const data = this.store.summarize();
        for (const record of this.items.keys()) {
            if (!data.includes(record)) {
                this.items.get(record).remove();
                this.items.delete(record);
            }
        }
        for (const record of data) {
            if (!this.items.has(record)) {
                this.items.set(
                    record,
                    //> We pass a callback that takes a record and removes it from
                    //  the list's store. It's common in UIs for items to have a button
                    //  that removes the item from the list, so this callback is passed
                    //  to the item component constructor to facilitate that pattern.
                    new this.itemClass(
                        record,
                        () => this.store.remove(record),
                        ...this.itemData
                    )
                );
            }
        }

        let sorter = [...this.items.entries()];
        //> Sort by the provided filter function if there is one
        if (this.filterFn !== null) {
            sorter = sorter.filter(item => this.filterFn(item[0]));
        }
        //> Sort the list the way the associated Store is sorted.
        sorter.sort((a, b) => data.indexOf(a[0]) - data.indexOf(b[0]));

        //> Store the new items in a new (insertion-ordered) Map at this.items
        this.items = new Map(sorter);

        this.render();
    }

    filter(filterFn) {
        this.filterFn = filterFn;
        this.itemsChanged();
    }

    unfilter() {
        this.filterFn = null;
        this.itemsChanged();
    }

    get components() {
        return [...this];
    }

    //> `List#nodes` returns the HTML nodes for each of its item
    //  views, sorted in order. Designed to make writing `#compose()` easier.
    get nodes() {
        return this.components.map(item => item.node);
    }

    //> This iterator is called when JavaScript requests an iterator from a list,
    //  e.g. when `for (const _ of someList)` is run.
    [Symbol.iterator]() {
        return this.items.values();
    }

    remove() {
        super.remove();
        //> When we remove a list, we also want to call `remove()` on each
        //  child components.
        for (const c of this.items.values()) {
            c.remove();
        }
    }

    //> By default, just render the children views in a `<ul/>`
    compose() {
        return {
            tag: 'ul',
            children: this.nodes,
        }
    }

}

//> Higher-order component to create a list component for a given
//  child item component.
const ListOf = itemClass => {
    return class extends List {
        get itemClass() {
            return itemClass;
        }
    }
}

//> A base class for evented data stores. Not exposed to the public API, but
//  all observables in Torus inherit from `Evented`.
class Evented {

    constructor() {
        this.eventTargets = new Set();
    }

    //> Base, empty implementation of `#summarize()` which is overridden in all subclasses.
    //  In subclasses, this returns the "summary" of the current state of the
    //  event emitter as an object/array.
    summarize() {}

    //> Whenever something changes, we fire an event to all subscribed
    //  listeners, with a summary of its state.
    emitEvent() {
        const summary = this.summarize();
        for (const handler of this.eventTargets) {
            handler(summary);
        }
    }

    addHandler(handler) {
        this.eventTargets.add(handler);
        handler(this.summarize());
    }

    removeHandler(handler) {
        this.eventTargets.delete(handler);
    }

}

//> `Record` is Torus's unit of individual data source, used for view models and
//  Models from business logic.
class Record extends Evented {

    constructor(id, data = {}) {
        super();

        //> We can create a Record by either passing in just the properties,
        //  or an ID and a dictionary of props. We disambiguate here.
        if (isObject(id)) {
            data = id;
            id = null;
        }

        this.id = id;
        this.data = data;
    }

    //> Setter for properties
    update(data) {
        Object.assign(this.data, data);
        this.emitEvent();
    }

    //> Getter
    get(name) {
        return this.data[name];
    }

    //> We summarize a Record by returning a dictionary of
    //  all of its properties and the ID
    summarize() {
        return Object.assign(
            {id: this.id},
            this.data
        );
    }

    //> The JSON-serialized version of a Record is the same as its
    //  summary, since it's a shallow data store with just plain properties.
    serialize() {
        return this.summarize();
    }

}

//> A list of Records, represents a collection or a table
class Store extends Evented {

    constructor(records = []) {
        super();
        //> Reset the store's contents with the given records
        this.reset(records);
    }

    get recordClass() {
        return Record;
    }

    get comparator() {
        return null;
    }

    //> Create and return a new instance of the store's record from
    //  the given data.
    create(id, data) {
        return this.add(new this.recordClass(id, data));
    }

    //> Add a given record to this store, also called by `#create()`.
    add(record) {
        this.records.add(record);
        this.emitEvent();
        return record;
    }

    //> Remove a given record from the store.
    remove(record) {
        this.records.delete(record);
        this.emitEvent();
        return record;
    }

    //> This iterator is called when JavaScript requests an iterator from a store,
    //  like when `for (const _ of someStore)` is run.
    [Symbol.iterator]() {
        return this.records.values();
    }

    //> Try to find a record with the given ID in the store,
    //  and return it. Returns null if not found.
    find(id) {
        for (const record of this.records) {
            if (record.id === id) {
                return record;
            }
        }
        return null;
    }

    reset(records) {
        //> Internally, we represent the store as an unordered set.
        //  we only order by comparator when we summarize. This prevents
        //  us from having to perform sorting checks on every insert/update,
        //  and is efficient as long as we don't re-render excessively.
        this.records = new Set(records);
        this.emitEvent();
    }

    summarize() {
        //> The summary of a store is defined functionally. We just sort
        //  the records in our store by the comparator (but we use a list
        //  of pairs of cached comparators and records to be fast.
        return [...this.records].map(record => [
            this.comparator ? this.comparator(record) : null,
            record,
        ]).sort((a, b) => {
            if (a[0] < b[0]) {
                return -1;
            } else if (a[0] > b[0]) {
                return 1;
            } else {
                return 0;
            }
        }).map(o => o[1]);
    }

    //> To serialize a store, we serialize each record and put them
    //  in a giant list.
    serialize() {
        return this.summarize().map(record => record.serialize());
    }

}

//> Higher-order component to create a Store for a given
//  record class.
const StoreOf = recordClass => {
    return class extends Store {
        get recordClass() {
            return recordClass;
        }
    }
}

//> Helper function for the router. It takes a route string
//  that contains parameters like, `/path/:param1/path/:param2`
//  and returns a regular expression to match that route
//  and a list of params in that route.
const routeStringToRegExp = route => {
    let match;
    const paramNames = [];
    while (match !== null) {
        match = (/:\w+/).exec(route);
        if (match) {
            const paramName = match[0];
            paramNames.push(paramName.substr(1));
            route = route.replace(paramName, '(.+)');
        }
    }
    return [new RegExp(route), paramNames];
}

//> Front-end router. A routing component can bind
//  to updates from the Router instead of a Record, and re-render
//  different subviews when the routes change.
class Router extends Evented {

    constructor(routes) {
        super();
        //> We parse the given dictionary of routes into three things:
        //  the name of the route, the route regular expression, and
        //  the list of params in that route.
        this.routes = Object.entries(routes)
            .map(([name, route]) => [name, ...routeStringToRegExp(route)]);
        //> Last matched route's information is cached here
        this.lastMatch = ['', null];
        //> Whenever the browser pops the history state (i.e. when the user
        //  goes back with the back button or forward with the forward button),
        //  we need to route again.
        this._cb = () => this.route(location.pathname);
        window.addEventListener('popstate', this._cb);
        //> Route the current URL, if it's already a deep link to a path.
        this._cb();
    }

    //> The "summary" of this Evented (components can bind to this object)
    //  is the information about the last route.
    summarize() {
        return this.lastMatch;
    }

    //> Click events from links can call `this.go()` with the destination URL
    //  to trigger going to a new route without reloading the page.
    go(destination) {
        history.pushState(null, document.title, destination);
        this.route(destination);
    }

    //> Main procedure to reconcile which of the defined route the current
    //  location path matches, and dispatch the right event. Routes are checked
    //  in order of declaration.
    route(path) {
        //> Match destination against the route regular expressions
        for (const [name, routeRe, paramNames] of this.routes) {
            const match = routeRe.exec(path);
            if (match !== null) {
                const result = {};
                const paramValues = match.slice(1);
                //> Given the matched values and parameter names,
                //  build a dictionary of params that components can use
                //  to re-render based on the route.
                paramNames.forEach((name, i) => result[name] = paramValues[i]);
                this.lastMatch = [name, result];
                break;
            }
        }
        this.emitEvent();
    }

    //> When we don't want the router to work anymore / stop listening / be gc'd,
    //  we can call `#remove()` to do just that.
    remove() {
        window.removeEventListener('popstate', this._cb);
    }

}

//> Torus exposes these public APIs
const exposedNames = {
    //> `render` isn't designed to be a public API and the API
    //  might change, but it's exposed to make unit testing easier.
    render,
    Component,
    Styled,
    StyledComponent,
    List,
    ListOf,
    Record,
    Store,
    StoreOf,
    Router,
}
//> If there is a global `window` object, bind API names to it.
if (typeof window === 'object') {
    window.Torus = exposedNames;
}
//> Export public APIs CommonJS-style
if (typeof module === 'object' && module.exports) {
    module.exports = exposedNames;
}
