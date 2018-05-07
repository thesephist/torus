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
        }

        const jdom = {
            tag: tag,
        };
        if (attrs !== undefined) jdom.attrs = attrs;
        if (events !== undefined) jdom.events = events;
        if (children.length > 0) jdom.children = children;
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
    function replacePreviousNode(newNode) {
        if (node !== undefined) {
            for (const eventName in previous.events) {
                node.removeEventListener(eventName);
            }

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
                render_debug('Replace previous node', node, 'with comment node');
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
                    render_debug('Replace previous node', node, `with <${next.tag}>`);
                }
            replacePreviousNode(document.createElement(next.tag));
        }

        // Compare attrs
        for (const attrName in next.attrs) {
            // "key" is used for key based list reconciliation
            if (attrName === 'key') continue;

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
                    render_debug(`Set <${next.tag}> attribute`, attrName, 'to', next.attrs[attrName]);
                    node.setAttribute(attrName, next.attrs[attrName]);
                }
            }

        }
        for (const attrName in previous.attrs) {
            if (!(attrName in next.attrs)) {
                render_debug('Remove attribute', attrName);
                node.removeAttribute(attrName);
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
            // TODO improve / optimize with key-based reconciliation

            // Key-based list reconciliation
            // 1. identify carried-over elements
            // 2. Modify the rest as if we had no keys
            // 3. Insert the keyed items in the right indices

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
                    node.appendChild(renderJDOM(undefined, previous.children[i], null));
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

    constructor() {
        this.jdom = undefined;
        this.node = undefined;
        this.event = {
            source: null,
            composer: () => {},
        };
        this.initialize();
        this.render();
    }

    initialize() {
        // no-op, will be overridden
    }

    listen({source, composer}) {
        if (this.event.source !== null) {
            this.unlisten();
        }

        if (source instanceof Evented) {
            this.event = { source, composer };
            source.addHandler(composer);
        } else {
            throw new Error('event source to listen() is not an Evented');
        }
    }

    unlisten() {
        this.event.source.removeHandler(this.event.composer);
        this.event = {
            source: null,
            composer: () => {},
        };
    }

    compose(data) {
        // return a JDOM
        return null;
    }

    render(data) {
        const jdom = this.compose(data);
        render_debug(`Render pass for <${jdom.tag}>:`, true);
        this.node = renderJDOM(this.node, this.jdom, jdom);
        this.jdom = jdom;
        return this.jdom;
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
        const data = this.serialize();
        for (const handler of this.eventTargets) {
            handler(Object.assign({}, data));
        }
    }

    addHandler(target, handler) {
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

    constructor(id = null, data = {}) {
        super();
        this.id = id;
        this.data = data;
    }

    update(data) {
        this.data = data;
        this.emitEvent();
    }

    serialize() {
        return Object.assign({}, this.data);
    }

}

/**
 * Collection of like data into a table / collection
 */
class Store extends Evented {

    constructor(records = [], comparator = null) {
        super();
        this.records = new Set(records);
        this.comparator = comparator;
    }

    add(record) {
        this.records.add(record);
        this.emitEvent();
    }

    remove(record) {
        this.records.delete(record);
        this.emitEvent();
    }

    serialize() {
        const unordered_data = [];
        for (const record of this.records) {
            unordered_data.push({
                comparator: comparator(record),
                data: record.serialize(),
            });
        }
        const ordered_data = unordered_data.sort((a, b) => {
            if (b > a) {
                return 1;
            } else if (a < b) {
                return -1;
            } else {
                return 0;
            }
        });
        return ordered_data.map(o => o.data);
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

