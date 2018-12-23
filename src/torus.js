// @begindebug
const DEBUG_RENDER = true;
const repeat = (str, count) => {
    let s = '';
    while (count > 0) {
        s += str;
        count --;
    }
    return s;
}
const render_debug = (msg, header = false) => {
    if (DEBUG_RENDER) {
        if (header) {
            const prefix = repeat('\t', render_stack.length - 1);
            console.log('%c' + prefix + msg, 'font-weight: bold');
        } else {
            const prefix = repeat('\t', render_stack.length);
            console.log(prefix + msg);
        }
    }
}
// @enddebug

const HTML_IDL_ATTRIBUTES = [
    'type',
    'value',
    'selected',
    'indeterminate',
    'tabIndex',
    'checked',
    'disabled',
];

let render_stack = [];
const push_render_stack = component => render_stack.push(component);
const pop_render_stack = () => render_stack.pop();

const createNodeFactory = tag => {
    return function(arg1, arg2, arg3) {
        let attrs,
            events,
            children;

        if (arg1 instanceof Array) {
            children = arg1;
        } else if (arg2 instanceof Array) {
            attrs = arg1;
            children = arg2;
        } else if (arg3 instanceof Array) {
            attrs = arg1;
            events = arg2;
            children = arg3;
        } else if (typeof arg1 === 'object' && typeof arg2 === 'undefined') {
            attrs = arg1;
        } else if (typeof arg1 === 'object' && typeof arg2 === 'object') {
            attrs = arg1;
            events = arg2;
        }

        const jdom = {
            tag: tag,
        };
        if (attrs !== undefined) jdom.attrs = attrs;
        if (events !== undefined) jdom.events = events;
        if (children && children.length > 0) jdom.children = children;
        return jdom;
    }
}

const isObject = o => typeof o === 'object' && o !== null;

const normalizeJDOM = jdom => {
    if (isObject(jdom)) {
        if (!('tag' in jdom)) jdom.tag = 'div';
        if (!('attrs' in jdom)) jdom.attrs = {};
        if (!('events' in jdom)) jdom.events = {};
        if (!('children' in jdom)) jdom.children = [];
    }
    return jdom;
}

const arrayNormalize = data => data instanceof Array ? data : [data];

const tmpNode = () => document.createComment('');
const placeholders = new Map();
function replacePlaceholders() {
    for (const [tmp, newNode] of placeholders.entries()) {
        tmp.parentNode.replaceChild(newNode, tmp);
    }
    placeholders.clear();
}

const renderJDOM = (node, previous, next) => {

    function replacePreviousNode(newNode) {
        if (node !== undefined && node !== newNode && node.parentNode) {
            const tmp = tmpNode();
            placeholders.set(tmp, newNode);
            node.parentNode.replaceChild(tmp, node);
        }
        node = newNode;
    };

    push_render_stack(next);

    const isChanged = previous !== next;
    if (isChanged && next instanceof Node) {
        // @begindebug
        if (node === undefined) {
            render_debug(`Add literal element <${next.tagName}>`);
        } else {
            render_debug(`Replace literal element <${previous.tagName}> with literal element <${next.tagName}>`);
        }
        // @enddebug
        replacePreviousNode(next);
    } else if (isChanged && next === null) {
        // @begindebug
        if (node === undefined) {
            render_debug('Add comment node');
        } else {
            render_debug(`Replace previous node <${node.tagName}> with comment node`);
        }
        // @enddebug
        replacePreviousNode(tmpNode());
    } else if (isChanged && (typeof next === 'string' || typeof next === 'number')) {
        // @begindebug
        if (node === undefined) {
            render_debug(`Add text node "${next}"`);
        } else {
            render_debug(`Replace previous node "${previous}" with text node "${next}"`);
        }
        // @enddebug
        replacePreviousNode(document.createTextNode(next));
    } else if (typeof next === 'object') {
        if (previous === undefined) {
            // Creating a brand-new node.
            previous = {
                tag: null,
            };
        }
        normalizeJDOM(previous);
        normalizeJDOM(next);

        // @debug
        render_debug(`Render pass for <${next.tag.toLowerCase()}>:`, true);

        // Compare tag
        if (previous.tag !== next.tag) {
            if (node === undefined) {
                // @debug
                render_debug(`Add <${next.tag}>`);
            } else {
                // @debug
                render_debug(`Replace previous node <${node.tagName}> with <${next.tag}`);
                // new root element, so "reset" previous
                previous = {};
                normalizeJDOM(previous);
            }
            replacePreviousNode(document.createElement(next.tag));
        }

        // Compare attrs
        for (const attrName in next.attrs) {
            switch (attrName) {
                case 'class':
                    const prevClass = arrayNormalize(previous.attrs.class || []);
                    const nextClass = arrayNormalize(next.attrs.class);

                    for (const className of nextClass) {
                        // @debug
                        render_debug(`Add <${next.tag}> class "${className}"`);
                        node.classList.add(className);
                    }
                    for (const className of prevClass) {
                        if (!nextClass.includes(className)) {
                            // @debug
                            render_debug(`Remove <${next.tag}> class "${className}"`);
                            node.classList.remove(className);
                        }
                    }
                    break;
                case 'style':
                    const prevStyle = previous.attrs.style || {};
                    const nextStyle = next.attrs.style;

                    for (const styleKey in nextStyle) {
                        if (nextStyle[styleKey] !== prevStyle[styleKey]) {
                            // @debug
                            render_debug(`Set <${next.tag}> style ${styleKey}: ${nextStyle[styleKey]}`);
                            node.style[styleKey] = nextStyle[styleKey];
                        }
                    }
                    for (const styleKey in prevStyle) {
                        if (!(styleKey in next.attrs.style)) {
                            // @debug
                            render_debug(`Unsetting <${next.tag}> style ${styleKey}: ${prevStyle[styleKey]}`);
                            node.style[styleKey] = '';
                        }
                    }
                    break;
                default:
                    if (HTML_IDL_ATTRIBUTES.includes(attrName)) {
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
                    break;
            }

        }
        for (const attrName in previous.attrs) {
            if (!(attrName in next.attrs)) {
                if (HTML_IDL_ATTRIBUTES.includes(attrName)) {
                    // @debug
                    render_debug(`Remove <${next.tag} property ${attrName}`);
                    // null seems to be the default for most IDL attrs,
                    //  but even this isn't entirely consistent. This seems
                    //  like something we should fix as issues come up.
                    node[attrName] = null;
                } else {
                    // @debug
                    render_debug(`Remove <${next.tag}> attribute ${attrName}`);
                    node.removeAttribute(attrName);
                }
            }
        }

        // Compare event handlers
        for (const eventName in next.events) {
            const prevEvents = arrayNormalize(previous.events[eventName] || []);
            const nextEvents = arrayNormalize(next.events[eventName]);

            for (const handlerFn of nextEvents) {
                if (!prevEvents.includes(handlerFn)) {
                    // @debug
                    render_debug(`Set new ${eventName} event listener on <${next.tag}>`);
                    node.addEventListener(eventName, handlerFn);
                }
            }
        }
        for (const eventName in previous.events) {
            const prevEvents = arrayNormalize(previous.events[eventName] || []);
            const nextEvents = arrayNormalize(next.events[eventName]);

            for (const handlerFn of prevEvents) {
                if (!nextEvents.includes(handlerFn)) {
                    // @debug
                    render_debug(`Remove ${eventName} event listener on <${next.tag}>`);
                    node.removeEventListener(eventName, handlerFn);
                }
            }
        }

        // Render children
        if (next.children.length > 0 || previous.children.length > 0) {
            if (previous.children.length < next.children.length) {
                let i;
                for (i = 0; i < previous.children.length; i ++) {
                    renderJDOM(node.childNodes[i], previous.children[i], next.children[i]);
                }
                while (i < next.children.length) {
                    node.appendChild(renderJDOM(undefined, undefined, next.children[i]));
                    i ++;
                }
            } else {
                let i;
                for (i = 0; i < next.children.length; i ++) {
                    renderJDOM(node.childNodes[i], previous.children[i], next.children[i]);
                }
                while (i < previous.children.length) {
                    // @debug
                    render_debug(`Remove child <${node.childNodes[i].tagName}>`);
                    node.removeChild(node.childNodes[i]);
                    i ++;
                }
            }
        }
    }

    pop_render_stack();

    if (render_stack.length === 0) {
        replacePlaceholders();
    }

    return node;
}

/**
 * Unit of UI component
 */
class Component {

    constructor(...args) {
        this.jdom = undefined;
        this.node = undefined;
        this.event = {
            source: null,
            handler: () => {},
        };
        this.init(...args);
        this.render();
    }

    init() {
        // should be overridden
        // Component#init is guaranteed to always be a no-op method
    }

    get record() {
        return this.event.source;
    }

    listen(source, handler) {
        this.unlisten();

        if (source instanceof Evented) {
            this.event = {source, handler};
            source.addHandler(handler);
        } else {
            throw new Error('Event source to listen() is not an instance of Evented');
        }
    }

    unlisten() {
        if (this.event.source) {
            this.event.source.removeHandler(this.event.handler);
        }

        this.event = {
            source: null,
            handler: () => {},
        };
    }

    remove() {
        this.unlisten();
    }

    compose(data) {
        return null;
    }

    preprocess(jdom, data) {
        return jdom;
    }

    render(data) {
        // @debug
        render_debug(`Render Component: ${this.constructor.name}`, true);
        data = data || (this.event.source && this.event.source.serialize())
        const jdom = this.preprocess(this.compose(data), data);
        this.node = renderJDOM(this.node, this.jdom, jdom);
        this.jdom = jdom;
        return this.jdom;
    }

}

const injectedClassNames = new Set();
let styledComponentSheet = null;
const generateUniqueClassName = stylesObject => {
    // Modified from https://github.com/darkskyapp/string-hash/blob/master/index.js
    const str = JSON.stringify(stylesObject);
    let i = str.length;
    let hash = 1989;
    while (i) {
        hash = (hash * 13) ^ str.charCodeAt(--i);
    }
    return '_torus' + (hash >>> 0);
}
const insertCSSDeclarations = (sheet, selector, declarations) => {
    let str = '';
    for (const [prop, val] of Object.entries(declarations)) {
        str += prop + ':' + val + ';';
    }
    const rule = selector + '{' + str + '}';
    sheet.insertRule(rule, sheet.cssRules.length);
}
const insertStylesObjectRecursively = (sheet, selector, stylesObject) => {
    let selfDeclarations = {};
    for (const [key, val] of Object.entries(stylesObject)) {
        if (typeof val === 'object') {
            // key is selector suffix, val is styles object
            if (key[0] === '@') {
                // media query or keyframes or font, which are global CSS names
                insertStylesObjectRecursively(sheet, key, val);
            } else {
                if (key.includes('&')) {
                    const fullSelector = key.replace(/&/g, selector);
                    insertStylesObjectRecursively(sheet, fullSelector, val);
                } else {
                    insertStylesObjectRecursively(sheet, selector + ' ' + key, val);
                }
            }
        } else {
            // key is CSS property, val is value
            selfDeclarations[key] = val;
        }
    }
    insertCSSDeclarations(sheet, selector, selfDeclarations);
}
const injectStyleSheet = (className, stylesObject) => {
    if (!styledComponentSheet) {
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-torus', '');
        document.head.appendChild(styleElement);
        styledComponentSheet = styleElement.sheet;
    }

    insertStylesObjectRecursively(styledComponentSheet, '.' + className, stylesObject);
    injectedClassNames.add(className);
}
const injectStylesOnce = stylesObject => {
    const className = generateUniqueClassName(stylesObject);
    if (!injectedClassNames.has(className)) {
        injectStyleSheet(className, stylesObject);
    }
    return className;
}
const Styled = Base => {
    return class extends Base {
        styles(data) {
            // should be overridden in subclasses
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
const StyledComponent = Styled(Component);

/**
 * Generic list implementation based on stores
 */
class List extends Component {

    get itemClass() {
        return Component; // default value, should be overridden
    }

    init(store) {
        this.items = new Map();
        this.filterFn = null;

        this.listen(store, this.updateItems.bind(this));
        this.updateItems(store.getCurrentSummary());
    }

    updateItems(data) {
        for (const record of this.items.keys()) {
            if (!data.includes(record)) {
                this.items.get(record).remove();
                this.items.delete(record);
            }
        }
        for (const record of data) {
            if (!this.items.has(record)) {
                this.items.set(record, new this.itemClass(record));
            }
        }

        const sorter = [...this.items.entries()];
        if (this.filterFn !== null) {
            sorter.filter(record => filterFn(record));
        }
        sorter.sort((a, b) => data.indexOf(a[0]) - data.indexOf(b[0]));

        this.items = new Map();
        for (const [record, item] of sorter) {
            this.items.set(record, item);
        }

        this.render();
    }

    filter(filterFn) {
        this.filterFn = filterFn;
        this.render();
    }

    unfilter() {
        this.filterFn = null;
        this.render();
    }

    get nodes() {
        return [...this.items.values()].map(item => item.node);
    }

    remove() {
        super.remove();
        for (const c of this.items.values()) {
            c.remove();
        }
    }

    compose(data) {
        return ul(this.nodes.slice());
    }

}

const ListOf = itemClass => {
    return class extends List {
        get itemClass() {
            return itemClass;
        }
    }
}

/**
 * A base class for evented data stores. Not exposed to the public API.
 */
class Evented {

    constructor() {
        this.eventTargets = new Set();
    }

    summarize() {
        throw new Error(`Evented#summarize() not implemented in ${this.constructor.name}`);
    }

    emitEvent() {
        for (const handler of this.eventTargets) {
            handler(this.getCurrentSummary());
        }
    }

    getCurrentSummary() {
        const data = this.summarize();
        if (data instanceof Array) {
            return data.slice();
        } else if (data instanceof Object) {
            return Object.assign({}, data);
        }
    }

    addHandler(handler) {
        this.eventTargets.add(handler);
    }

    removeHandler(handler) {
        this.eventTargets.delete(handler);
    }

}

/**
 * Unit of data
 */
class Record extends Evented {

    constructor(id, data = {}) {
        super();

        if (typeof id === 'object' && !Object.keys(data).length) {
            data = id;
            id = null;
        }

        this.id = id;
        this.data = data;
    }

    update(data) {
        Object.assign(this.data, data);
        this.emitEvent();
    }

    get(name) {
        return this.data[name];
    }

    summarize() {
        return Object.assign(
            {},
            this.data,
            {id: this.id}
        );
    }

    serialize() {
        return this.summarize();
    }

}

/**
 * Collection of like data into a table / collection
 */
class Store extends Evented {

    constructor(records = []) {
        super();

        this.records = new Set(records);
    }

    get recordClass() {
        return Record; // default value, should be overridden
    }

    get comparator() {
        return null;
    }

    create(id, data) {
        this.add(new this.recordClass(id, data));
    }

    add(record) {
        this.records.add(record);
        this.emitEvent();
    }

    remove(record) {
        this.records.delete(record);
        this.emitEvent();
    }

    summarize() {
        const unordered_data = [];
        for (const record of this.records) {
            unordered_data.push({
                comparator: this.comparator ? this.comparator(record) : null,
                record: record,
            });
        }
        const ordered_data = unordered_data.sort((a, b) => {
            if (a.comparator < b.comparator) {
                return -1;
            } else if (a.comparator > b.comparator) {
                return 1;
            } else {
                return 0;
            }
        });
        return ordered_data.map(o => o.record);
    }

    serialize() {
        return this.summarize().map(record => record.serialize());
    }

}

const StoreOf = recordClass => {
    return class extends Store {
        get recordClass() {
            return recordClass;
        }
    }
}

/**
 * Front-end router
 *
 * Router stands in the place of a component somewhere in the DOM tree.
 */
class Router extends Evented {

    get paths() {
        return {};
    }

    summarize() {
        // TODO
    }

    route(path) {
        for (const [pathRegex, composer] of this.paths) {
            const match = pathRegex.exec(path);
            if (match !== null) {
                const parameters = match.slice(1);
                return composer(...parameters);
            }
        }
    }

}

const exposedNames = {
    renderJDOM,
    Styled,
    StyledComponent,
    Component,
    List,
    ListOf,
    Record,
    Store,
    StoreOf,
    // Router,
}
const builtinElements = [
    'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'em', 'strong',
    'img',
    'button',
    'input',
    'label',
    'ul', 'ol', 'li',
];
for (const tagName of builtinElements) {
    exposedNames[tagName] = createNodeFactory(tagName);
}

if (typeof window === 'object') {
    for (const name in exposedNames) {
        window[name] = exposedNames[name];
    }
}

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = exposedNames;
}

