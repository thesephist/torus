declare module 'torus-dom' {

    type Summary = JSON | Array<any>

    interface JDOMElement {
        tag: string,
        attrs?: object,
        events?: object,
        children?: JDOM[],
    }

    type JDOM = JDOMElement | string | number | null;

    class Component {

        public record: Evented | null

        public node: Node

        constructor(...args: any[])

        static from(fn: () => JDOM): Component

        init(...args: any[]): void

        bind(source: Evented, handler: Function): void

        unbind(): void

        remove(): void

        compose(data?: Summary): JDOM

        preprocess(jdom: JDOM, data?: Summary): JDOM

        render(data?: Summary): JDOM

    }

    class StyledComponent extends Component {

        styles(data?: Summary): JSON

    }

    function Styled(Base: Component): StyledComponent

    class List extends Component {

        public itemClass: Component

        public nodes: Node[]

        constructor(store: Store, ...args: any[])

        itemsChanged(): void

        filter(filterFn: (record: Evented) => any): void

        unfilter(): void

    }

    function ListOf(itemClass: typeof Component): typeof List

    class Evented {

        constructor()

        summarize(): Summary

        emitEvent(): void

        addHandler(handler: Function): void

        removeHandler(handler: Function): void

    }

    class Record extends Evented {

        constructor(id: any, data?: JSON)
        constructor(data?: JSON)

        update(data: JSON): void

        get(name: string): any

        summarize(): JSON

        serialize(): JSON

    }

    class Store extends Evented {

        public recordClass: Record

        public comparator: (record: Record) => any

        constructor(records?: Record[])

        create(id: any, data?: JSON): void
        create(data?: JSON): void

        add(record: Record): void

        remove(record: Record): void

        summarize(): Array<JSON>

        serialize(): Array<JSON>

    }

    function StoreOf(recordClass: typeof Record): typeof Store

    class Router extends Evented {

        constructor(routes: {string: string})

        summarize(): Summary

        go(destination: string): void

        remove(): void

    }

    function jdom(templateParts: TemplateStringsArray, ...templateArguments: any[]): JDOM

}
