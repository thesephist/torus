const DEBUG_RENDER = true;
const render_debug = (msg, bold = false) => {
    if (DEBUG_RENDER) {
        if (bold) {
            console.log('%c' + msg, 'font-weight: bold');
        } else {
            console.log(msg);
        }
    }
}

const HTML_REFLECTED_PROPERTIES = [
    'value',
    'checked',
    'indeterminate',
];

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

const div = createNodeFactory('div');
const h1 = createNodeFactory('h1');
const h2 = createNodeFactory('h2');
const h3 = createNodeFactory('h3');
const p = createNodeFactory('p');
const a = createNodeFactory('a');
const em = createNodeFactory('em');
const strong = createNodeFactory('strong');
const img = createNodeFactory('img');
const button = createNodeFactory('button');
const input = createNodeFactory('input');
const label = createNodeFactory('label');
const ul = createNodeFactory('ul');
const ol = createNodeFactory('ol');
const li = createNodeFactory('li');

const normalizeJDOM = jdom => {
    if (typeof jdom === 'object') {
        if (!('tag' in jdom)) jdom.tag = 'div';
        if (!('attrs' in jdom)) jdom.attrs = {};
        if (!('events' in jdom)) jdom.events = {};
        if (!('children' in jdom)) jdom.children = [];
    }
    return jdom;
}

const renderJDOM = (node, previous, next) => {
    // TODO: can we make this more effective with requestAnimationFrame?

    function replacePreviousNode(newNode) {
        if (node !== undefined) {
            const parentNode = node.parentNode;
            const nextSibling = node.nextSibling;
            if (parentNode) {
                parentNode.removeChild(node);
                if (nextSibling) {
                    parentNode.insertBefore(newNode, nextSibling);
                } else {
                    parentNode.appendChild(newNode);
                }
            }
        }

        node = newNode;
    };

    if (next instanceof Node) {
        if (previous === next) {
            // pass, it's the same element
        } else {
            if (node === undefined) {
                render_debug(`Add literal element <${next.tagName}>`);
            } else {
                render_debug(`Replace literal element <${previous.tagName}> with literal element <${next.tagName}>`);
            }
            replacePreviousNode(next);
        }
    } else if (next === null) {
        if (previous === null) {
            // both are comments, do nothing
        } else {
            if (node === undefined) {
                render_debug('Add comment node');
            } else {
                render_debug(`Replace previous node <${node.tagName}> with comment node`);
            }
            replacePreviousNode(document.createComment(''));
        }
    } else if (['string', 'number'].includes(typeof next)) {
        if (previous !== next) {
            if (node === undefined) {
                render_debug(`Add text node "${next}"`);
            } else {
                render_debug(`Replace previous node "${previous}" with text node "${next}"`);
            }
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

        // Compare tag
        if (previous.tag !== next.tag) {
            if (node === undefined) {
                render_debug(`Add <${next.tag}>`);
            } else {
                render_debug(`Replace previous node <${node.tagName}> with <${next.tag}`);
            }
            replacePreviousNode(document.createElement(next.tag));
        }

        // Compare attrs
        for (const attrName in next.attrs) {
            if (HTML_REFLECTED_PROPERTIES.includes(attrName)) {
                render_debug(`Set <${next.tag}> property ${attrName} to "${next.attrs[attrName]}"`);
                node[attrName] = next.attrs[attrName];
                continue;
            }

            if (attrName === 'style') {
                const prevStyle = previous.attrs.style || {};
                const nextStyle = next.attrs.style;

                for (const styleKey in nextStyle) {
                    if (nextStyle[styleKey] !== prevStyle[styleKey]) {
                        render_debug(`Set <${next.tag}> style ${styleKey}: ${nextStyle[styleKey]}`);
                        node.style[styleKey] = nextStyle[styleKey];
                    }
                }
                for (const styleKey in prevStyle) {
                    if (!(styleKey in next.attrs.style)) {
                        node.style[styleKey] = '';
                    }
                }
            } else {
                if (next.attrs[attrName] !== previous.attrs[attrName]) {
                    render_debug(`Set <${next.tag}> attribute "${attrName}" to "${next.attrs[attrName]}"`);
                    node.setAttribute(attrName, next.attrs[attrName]);
                }
            }

        }
        for (const attrName in previous.attrs) {
            if (!(attrName in next.attrs)) {
                if (HTML_REFLECTED_PROPERTIES.includes(attrName)) {
                    render_debug(`Remove <${next.tag}> property ${attrName}`);
                    node[attrName] = ''; // TODO: might not be the best way to unset properties
                    continue;
                } else {
                    render_debug(`Remove <${next.tag}> attribute ${attrName}`);
                    node.removeAttribute(attrName);
                }
            }
        }

        // Compare events
        for (const eventName in next.events) {
            if (next.events[eventName] !== previous.events[eventName]) {
                render_debug(`Set new ${eventName} event listener on <${next.tag}>`);
                node.removeEventListener(eventName, previous.events[eventName]);
                node.addEventListener(eventName, next.events[eventName]);
            }
        }
        for (const eventName in previous.events) {
            if (!(eventName in next.events)) {
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
                    render_debug(`Remove child <${node.childNodes[i].tagName}>`);
                    node.removeChild(node.childNodes[i]);
                    i ++;
                }
            }
        }
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
        this.initialize(...args);
        this.render();
    }

    initialize() {
        // no-op, will be overridden
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
        const jdom = this.compose(
            data
            || this.event.source && this.event.source.serialize()
            || undefined
        );
        render_debug(`Render pass for <${jdom.tag}>:`, true);
        this.node = renderJDOM(this.node, this.jdom, jdom);
        this.jdom = jdom;
        return this.jdom;
    }

}

/**
 * Generic list implementation based on stores
 */
class List extends Component {

    // TODO: add searchability

    constructor(...args) {
        super(...args);
        this.listen({
            source: this.source,
            handler: this.updateItems.bind(this),
        });
    }

    initialize() {
        // Override when extending
        this.source = new Store();
        this.itemClass = Component;
        this.items = new Map();
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

/**
 * A base class for evented data stores
 */
class Evented {

    constructor() {
        this.eventTargets = new Set();
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

    constructor(records = [], comparator = null) {
        super();
        this.recordClass = this.recordClass || Record;
        this.records = new Set(records);
        this.comparator = comparator;
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

/**
 * Front-end router
 *
 * Router stands in the place of a component somewhere in the DOM tree.
 */
class Router {

    constructor(paths) {
        this.paths = paths;
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

/**
 * Persistence management
 */
class Adapter {

    constructor() {

    }

    async save(type, data) {
        switch (type) {
            case 'read':
                break;
            case 'create':
                break;
            case 'delete':
                break;
            case 'update':
                break;
        }
    }

}

