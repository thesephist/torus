declare module 'torus-dom' {

    type Summary = object | Array<any>

    interface JDOMElement {
        tag: string,
        attrs?: object,
        events?: object,
        children?: JDOM[],
    }

    type JDOM = JDOMElement | string | number | null;

    class Component {

        public record: Record | null

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

        styles(data?: Summary): object

    }

    function Styled(Base: typeof Component): typeof StyledComponent

    class List<T extends Component> extends Component {

        public itemClass: T

        public readonly nodes: Node[]

        constructor(store: Store<any>, ...args: any[])

        itemsChanged(): void

        filter(filterFn: (record: Record) => any): void

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

        constructor(id: any, data?: object)
        constructor(data?: object)

        update(data: object): void

        get(name: string): any

        summarize(): object

        serialize(): object

    }

    class Store<T extends Record> extends Evented {

        public recordClass: T

        public readonly comparator: (record: T) => any

        public readonly records: Set<T>

        constructor(records?: T[])

        create(id: any, data?: object): void
        create(data?: object): void

        add(record: T): void

        remove(record: T): void

        summarize(): Array<object>

        serialize(): Array<object>

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
