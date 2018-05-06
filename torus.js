/**
 * Unit of UI component
 */
class Component {

    constructor(jdom) {
        this.jdom = jdom;
        this.element = null;
        this.eventSource = null;
    }

    setSource(eventSource, composer) {

    }

    unsetSource(eventSource) {

    }

    render() {

    }

}

/**
 * Unit of data
 */
class Record {

    constructor(id, data) {
        this.id = id;
        this.data = data;

        this.eventTargets = new Set();
    }

    update(data) {

    }

    serialize() {

    }

    emitEvent() {

    }

    addTarget() {

    }

    removeTarget() {

    }

}

/**
 * Collection of like data into a table / collection
 */
class Store {

    constructor(records) {
        this.records = records;

        this.eventTargets = new Set();
    }

    add(record) {

    }

    remove(record) {

    }

    serialize() {

    }

    emitEvent() {

    }

    addTarget() {

    }

    removeTarget() {

    }

}

/**
 * Front-end router
 */
class Router {

    constructor(paths) {
        this.paths = paths;
    }

    route() {

    }

}

/**
 * Persistence management
 */
class Adapter {

    constructor() {

    }

    async save(type, data) {

    }

}

