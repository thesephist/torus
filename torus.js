const createNodeFactory = tag => {
    return function(attrs, events, ...children) {
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

    if (next === null) {
        if (previous === null) {
            // both are comments, do nothing
        } else {
            replacePreviousNode(document.createComment(''));
        }
    } else if (typeof next === 'string') {
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

        // Compare tag
        if (previous.tag !== next.tag) {
            replacePreviousNode(document.createElement(next.tag));
        }

        // Compare attrs
        for (const attrName in next.attrs) {
            if (next.attrs[attrName] !== previous.attrs[attrName]) {
                node.setAttribute(attrName, next.attrs[attrName]);
            }
        }
        for (const attrName in previous.attrs) {
            if (!(attrName in next.attrs)) {
                node.removeAttribute(attrName);
            }
        }

        // Compare events
        for (const eventName in next.events) {
            if (next.events[eventName] !== previous.events[eventName]) {
                node.removeEventListener(eventName);
                node.addEventListener(eventName, next.events[eventName]);
            }
        }
        for (const eventName in previous.events) {
            if (!(eventName in next.events)) {
                node.removeEventListener(eventName);
            }
        }

        // Render children
        if (next.children.length > 0 || previous.children.length > 0) {
            // TODO improve / optimize with key-based reconciliation
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
        this.render({});
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
        if (data) {
            const jdom = this.compose(data);
            this.node = renderJDOM(this.node, this.jdom, jdom);
            this.jdom = jdom;
        }
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

