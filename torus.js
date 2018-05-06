const renderJDOM = (node, previous, next) => {
    // TODO: do some diffing to figure out what to change, change them

    return node;
}

/**
 * Unit of UI component
 */
class Component {

    constructor() {
        this.jdom = null;
        this.node = null;
        this.event = {
            source: null,
            composer: () => {},
        };
    }

    listen({source, composer}) {
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
    }

    render(data) {
        renderJDOM(this.node, this.jdom, this.compose(data));
        this.jdom = jdom;
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

