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
            const prefix = repeat('\t', render_stack - 1);
            console.log('%c' + prefix + msg, 'font-weight: bold');
        } else {
            const prefix = repeat('\t', render_stack);
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

let render_stack = 0;

const isObject = o => typeof o === 'object' && o !== null;

const normalizeJDOM = jdom => {
    if (!('tag' in jdom)) jdom.tag = 'div';
    if (!('attrs' in jdom)) jdom.attrs = {};
    if (!('events' in jdom)) jdom.events = {};
    if (!('children' in jdom)) jdom.children = [];
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

    render_stack ++;

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

    render_stack --;

    if (render_stack === 0) {
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
    const str = JSON.stringify(stylesObject).replace(/\s+/g, ' ');
    let i = str.length;
    let hash = 1989;
    while (i) {
        hash = (hash * 13) ^ str.charCodeAt(--i);
    }
    return '_torus' + (hash >>> 0);
}
const brace = (a, b) => a + '{' + b + '}';
const rulesFromStylesObject = (selector, stylesObject) => {
    let rules = [];
    let selfDeclarations = '';
    for (const [prop, val] of Object.entries(stylesObject)) {
        if (prop[0] === '@') {
            if (prop.startsWith('@media')) {
                rules.push(brace(prop, rulesFromStylesObject(selector, val).join('')));
            } else  { // @keyframes or @font-face
                rules.push(brace(prop, rulesFromStylesObject('', val).join('')));
            }
        } else {
            if (typeof val === 'object') {
                if (prop.includes('&')) {
                    const fullSelector = prop.replace(/&/g, selector);
                    rules = rules.concat(rulesFromStylesObject(fullSelector, val));
                } else {
                    rules = rules.concat(rulesFromStylesObject(selector + ' ' + prop, val));
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
const initSheet = () => {
    styleElement = document.createElement('style');
    styleElement.setAttribute('data-torus', '');
    document.head.appendChild(styleElement);
    styledComponentSheet = styleElement.sheet;
}
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
        this.store = store;
        this.items = new Map();
        this.filterFn = null;

        this.listen(this.store, () => this.itemsChanged());
        this.itemsChanged();
    }

    itemsChanged() {
        const data = this.store.getCurrentSummary();
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

        let sorter = [...this.items.entries()];
        if (this.filterFn !== null) {
            sorter = sorter.filter(item => this.filterFn(item[0]));
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
        this.itemsChanged();
    }

    unfilter() {
        this.filterFn = null;
        this.itemsChanged();
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
        return {
            tag: 'ul',
            children: this.nodes,
        }
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
        throw new Error(`#summarize() not implemented in ${this.constructor.name}`);
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
        } else {
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
if (typeof window === 'object') {
    for (const name in exposedNames) {
        window[name] = exposedNames[name];
    }
}
if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = exposedNames;
}
