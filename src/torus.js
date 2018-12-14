// @begindebug
const DEBUG_RENDER = true;
let render_stack = [];
const push_render_stack = component => render_stack.push(component);
const pop_render_stack = () => render_stack.pop();
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

const normalizeJDOM = jdom => {
    if (typeof jdom === 'object') {
        if (!('tag' in jdom)) jdom.tag = 'div';
        if (!('attrs' in jdom)) jdom.attrs = {};
        if (!('events' in jdom)) jdom.events = {};
        if (!('children' in jdom)) jdom.children = [];
    }
    return jdom;
}

const tmpNode = () => document.createComment('');

const renderJDOM = (node, previous, next) => {

    const placeholders = new Map();
    function replacePreviousNode(newNode) {
        if (node !== undefined && node.parentNode) {
            const tmp = tmpNode();
            placeholders.set(tmp, newNode);
            node.parentNode.replaceChild(tmp, node);
        }
        node = newNode;
    };
    function replacePlaceholders() {
        for (const [tmp, newNode] of placeholders.entries()) {
            tmp.parentNode.replaceChild(newNode, tmp);
        }
    }

    // @debug
    push_render_stack(next);

    if (next instanceof Node) {
        if (previous === next) {
            // pass, it's the same element
        } else {
            // @begindebug
            if (node === undefined) {
                render_debug(`Add literal element <${next.tagName}>`);
            } else {
                render_debug(`Replace literal element <${previous.tagName}> with literal element <${next.tagName}>`);
            }
            // @enddebug
            replacePreviousNode(next);
        }
    } else if (next === null) {
        if (previous === null) {
            // both are comments, do nothing
        } else {
            // @begindebug
            if (node === undefined) {
                render_debug('Add comment node');
            } else {
                render_debug(`Replace previous node <${node.tagName}> with comment node`);
            }
            // @enddebug
            replacePreviousNode(document.createComment(''));
        }
    } else if (['string', 'number'].includes(typeof next)) {
        if (previous !== next) {
            // @begindebug
            if (node === undefined) {
                render_debug(`Add text node "${next}"`);
            } else {
                render_debug(`Replace previous node "${previous}" with text node "${next}"`);
            }
            // @enddebug
            replacePreviousNode(document.createTextNode(next));
        }
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
            // @begindebug
            if (node === undefined) {
                render_debug(`Add <${next.tag}>`);
            } else {
                render_debug(`Replace previous node <${node.tagName}> with <${next.tag}`);
            }
            // @enddebug
            replacePreviousNode(document.createElement(next.tag));
        }

        // Compare attrs
        for (const attrName in next.attrs) {
            if (attrName === 'class'){
                const prevClass = previous.attrs.class || [];
                const nextClass = next.attrs.class;

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
            } else if (attrName === 'style') {
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
            } else {
                if (next.attrs[attrName] !== previous.attrs[attrName]) {
                    // @debug
                    render_debug(`Set <${next.tag}> attribute "${attrName}" to "${next.attrs[attrName]}"`);
                    node.setAttribute(attrName, next.attrs[attrName]);
                }
            }

        }
        for (const attrName in previous.attrs) {
            if (!(attrName in next.attrs)) {
                // @debug
                render_debug(`Remove <${next.tag}> attribute ${attrName}`);
                node.removeAttribute(attrName);
            }
        }

        // Compare events
        for (const eventName in next.events) {
            if (next.events[eventName] !== previous.events[eventName]) {
                // @debug
                render_debug(`Set new ${eventName} event listener on <${next.tag}>`);
                node.removeEventListener(eventName, previous.events[eventName]);
                node.addEventListener(eventName, next.events[eventName]);
            }
        }
        for (const eventName in previous.events) {
            if (!(eventName in next.events)) {
                // @debug
                render_debug(`Remove ${eventName} event listener on <${next.tag}>`);
                node.removeEventListener(eventName, previous.events[eventName]);
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

    replacePlaceholders();

    // @debug
    pop_render_stack();

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

    listen({source, handler}) {
        if (this.event.source !== null) {
            this.unlisten();
        }

        if (source instanceof Evented) {
            this.event = { source, handler};
            source.addHandler(handler);
        } else {
            throw new Error('Event source to listen() is not an Evented');
        }
    }

    unlisten() {
        this.event.source.removeHandler(this.event.handler);
        this.event = {
            source: null,
            handler: () => {},
        };
    }

    compose(data) {
        // no-op, will be overridden to return a composed JDOM
        return null;
    }

    render(data) {
        // @debug
        render_debug(`Render Component: ${this.constructor.name}`, true);
        const jdom = this.compose(
            data
            || this.event.source && this.event.source.serialize()
            || undefined
        );
        this.node = renderJDOM(this.node, this.jdom, jdom);
        this.jdom = jdom;
        return this.jdom;
    }

}

/**
 * Generic list implementation based on stores
 */
class List extends Component {

    get itemClass() {
        return Component; // default value, should be overridden
    }

    init(store) {
        this.source = store;
        this.items = new Map();

        this.listen({
            source: this.source,
            handler: this.updateItems.bind(this),
        });

    }

    updateItems(data) {
        for (const [record, item] of this.items.entries()) {
            if (!data.includes(record)) {
                this.items.delete(record);
            }
        }
        for (const record of data) {
            if (this.items.has(record)) {
                // taken care of, pass
            } else {
                this.items.set(record, new this.itemClass(record));
            }
        }

        const sorter = [...this.items.entries()];
        sorter.sort((a, b) => data.indexOf(a[0]) - data.indexOf(b[0]));

        this.items = new Map();
        for (const [record, item] of sorter) {
            this.items.set(record, item);
        }

        this.render();
    }

    get nodes() {
        return [...this.items.values()].map(item => item.node);
    }

    compose(data) {
        return (
            ul(this.nodes)
        );
    }

}

const ListOf = itemClass => {
    class TmpList extends List {
        get itemClass() {
            return itemClass;
        }
    }

    return TmpList;
}

/**
 * A base class for evented data stores
 */
class Evented {

    constructor() {
        this.eventTargets = new Set();
    }

    summarize() {
        throw new Error('summarize() should be implemented independently in subclasses');
    }

    emitEvent() {
        const data = this.summarize();
        if (data instanceof Array) {
            for (const handler of this.eventTargets) {
                handler(data.slice());
            }
        } else if (data instanceof Object) {
            for (const handler of this.eventTargets) {
                handler(Object.assign({}, data));
            }
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
        handler(this.getCurrentSummary());
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
            {
                id: this.id
            }
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
    class TmpStore extends Store {
        get recordClass() {
            return recordClass;
        }
    }

    return TmpStore;
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
    Component,
    List,
    ListOf,
    Evented,
    Record,
    Store,
    StoreOf,
    Router,
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

