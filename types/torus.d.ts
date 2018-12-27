type Summary = JSON | Array<any>

declare interface JDOM {
    tag?: string,
    attrs?: any,
    events?: any,
    children?: JDOM[],
}

declare function renderJDOM(node: HTMLElement, previous: JDOM, next: JDOM): HTMLElement

declare class Component {

    public record: Evented

    constructor(...args: any[])

    static from(fn: Function): Component

    init(...args: any[]): any

    bind(source: Evented, handler: Function): void

    unbind(): void

    remove(): void

    compose(data?: any): JDOM

    preprocess(jdom: JDOM, data?: any): JDOM

    render(data?: any): JDOM

}

declare class StyledComponent extends Component {

    styles(): JSON

}

declare function Styled(Base: Component): StyledComponent

declare class List extends Component {

    public itemClass: Component

    public nodes: HTMLElement[]

    itemsChanged(): void

    filter(filterFn: Function): void

    unfilter(): void

}

declare function ListOf(itemClass: Component): Component

declare class Evented {

    constructor()

    summarize(): Summary

    emitEvent(): void

    addHandler(handler: Function): void

    removeHandler(handler: Function): void

}

declare class Record extends Evented {

    constructor(data?: JSON)
    constructor(id: any, data?: JSON)

    update(data: JSON): void

    get(name: string): any

    serialize(): JSON

}

declare class Store extends Evented {

    public recordClass: Record

    public comparator: Function

    constructor(records: Record[])

    create(data?: JSON): void
    create(id: any, data?: JSON): void

    add(record: Record): void

    remove(record: Record): void

    serialize(): Array<JSON>

}

declare function StoreOf(recordClass: Record): Store

declare class Router extends Evented {

    constructor(routes: any)

    summarize(): Summary

    go(destination: string): void

    route(path: string): void

    remove(): void

}

export {
    JDOM,
    renderJDOM,
    Component,
    Styled,
    StyledComponent,
    List,
    ListOf,
    Record,
    Store,
    StoreOf,
    Router,
}
