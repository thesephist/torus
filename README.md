# Torus

Minimal JS Model-View UI framework focused on being tiny, efficient, and free of dependencies.

## Features

### Simplicity and size

Torus has no production dependencies, requires no build step to take advantage of all of its features, and weighs in at under 5kb gzipped including the templating engine, renderer, component system, and CSS-in-JS wrapper. This makes it simple to adopt and ship, for anything from rendering a single component on the page to building full-scale applications.

### Portability

Torus's architecture encapsulates all of the rendering and updating logic within the component itself, so it's safe to take `Component#node` and treat it as a simple pointer to the root DOM element of the component. You can move it around the page, take it in and out of the document, embed it in React or Vue components, and otherwise use it anywhere a vanilla DOM element can be used. This allows you to include Torus components and apps in lots of other frontends.

**Note**: Sometimes, like when the tag of the root element changes, `Component#node` can change as Torus needs to replace one element fully with a new element. For this reason, always use `#node` referenced from the component object, rather than caching the actual element `#node` points to at one point in time.

Combined with the small size of Torus, this makes it reasonable to ship torus with only one or a few components for a larger project that includes elements from other frameworks, if you don't want to or can't ship an entire Torus application.

## Influences

Torus's API is a mixture of declarative interfaces for defining user interfaces and views, and imperative patterns for state management, which I personally find is the best balance of the two styles when building large applications.

Torus's design is inspired by React's component-driven architecture, and borrows common concepts from the React ecosystem, like the idea of diffing in virtual DOM before rendering, composition with higher order components, and mixing CSS and markup into JavaScript to separate concerns for each component into a single class. But Torus builds on those ideas by providing a more minimal, less opinionated lower-level APIs, and opting for a stateful data model rather than a view/controller layer that strives to be purely functional.

Torus also borrows from [Backbone](http://backbonejs.org) in its data models design, for Records and Stores, for having an event-driven design behind how data updates are bound to views and other models.

Lastly, Torus's `jdom` template tag was inspired by [htm](https://github.com/developit/htm) and [lit-html](https://github.com/Polymer/lit-html), both template tags to process HTML markup into virtual DOM.

## Component model

Torus takes after the React and Vue model, breaking down interfaces to reusable components. But components in Torus are much lighter, faster, and closer to vanilla JavaScript compared to the alternatives. (In fact, Using the full set of Torus UI rendering features requires no compilation step; just import `torus.js` with a `<script>` tag and go!)

Torus components, in addition to the standard benefits of component-based UI models, have an additional benefit that we need no build step to run! The component below can be dropped verbatim into the browser console as plain JavaScript, and if the Torus library is in scope, it'll be rendered perfectly into the DOM.

Here's an example of a Torus Component, from the `samples/tabs/` sample project.

```javascript
class TabButton extends StyledComponent {

    // #init() is the customizable constructor for Component. We don't use
    //  the default #constructor, because torus needs to hook in both before
    //  and after the #init() call is made on a new component.
    init({number, setActiveTab}) {
        this.number = number;
        this.setActiveTab = setActiveTab;
        this.active = false;
    }

    // because we inherit from StyledComponent (which inherits
    //  from Component), we can define styles like this, using
    //  the [S]CSS syntax we know.
    styles() {
        return {
            '&.active': {
                'background': '#555',
                'color': '#fff',
            }
        }
    }

    markActive(yes) {
        this.active = yes;
        this.render();
    }

    // Think of #compose() like the #render() in React or Backbone.
    //  #compose() declaratively returns the DOM for the UI component,
    //  which torus takes and renders efficiently through its virtual DOM.
    //
    // We can return a vanilla, JSON representation of the DOM (see
    //  "JDOM" section in the README), but we can also rely on the
    //  tiny jdom`` template tag to transform JSX-like syntax (with very
    //  minor differences) to JDOM, so we can write JSX or HTML that we're used to.
    compose() {
        return jdom`<button class="${this.active ? 'active' : ''}"
            onclick="${this.setActiveTab}">Switch to ${this.number}
        </button>`;
    }

}
```

One notable difference between Torus's and React's component API, which this resembles, is that Torus components are much more self-managing. Torus components are long-lived and stateful, and so have no lifecycle methods, but instead call `#render` imperatively whenever the component's DOM tree needs to update (when local state changes or a data source emits an event). This manual render-call replaces React's `shouldComponentUpdate` in a sense, and means that render functions are _never_ run unless a re-render is explicitly required as the result of a state change, even if the component in question is a child of a parent that re-renders frequently.

For a more detailed and real-world example tying in models, please reference `samples/`.

### Pure functional components with `Component.from()`

Often, we want to create a new Component class whose rendered result only depends on its initial input. These might be small UI widgets in a design system like buttons and dialogs, for example. In these cases where we don't need a component to keep local state, listen for events, or create side effects, we can describe the component's view with a pure function.

```javascript
const FancyButton = buttonText => jdom`<button class="fancy">${buttonText}</button>`;
```

Because these kinds of function "components" will return valid JDOM, we can compose them into any other `Component#compose()` method. Remember, `FancyButton` is just a JavaScript function! This allows for easy abstraction and code reuse within small parts of our rendering logic.

```javascript
// compose with a basic function component
class FancyForm extends Component {
    compose() {
        return {
            tag: 'form',
            children: [
                jdom`<h1>Super fancy form!</h1>`,
                jdom`<input name="full_name"/>`,
                FancyButton('Submit!'),
            ],
        }
    }
}
```

But what if we want to compose our `FancyButton` with `Styled()` or use it in more complex views? We can upgrade the function component `FancyButton` to a full-fledged Torus class component with `Component.from()`.

```javascript
const ClassyButton = Component.from(FancyButton);
// equivalent to
const ClassyButton = Component.from(buttonText => {
    return jdom`<button class="fancy">${buttonText}</button>`;
});

class FancyForm extends Component {
    init() {
        this.button = new ClassyButton('Submit!');
    }
    compose() {
        return `<form>
            <h1>Super fancy form!</h1>
            <input name="full_name"/>
            ${this.button.node}
        </form>`;
    }
}
```

Here, `ClassyButton` emits exactly the same DOM as `FancyButton` when rendered, but it's gained additional capabilities accessible to a class component in Torus, like persistence across renders of the parent component and better composability. Once we upgrade the function component into a class with `Component.from()`, we can use it in all the places we can use class components, including inside higher-order component calls like `Styled(FancyButton)`.

### `Styled()` and `StyledComponent`

By default, Torus components are only styled through inline CSS, through the `attrs.style` field in the JDOM. However, Torus also comes with a higher order component to produce a version of any given Torus component that understands an SCSS-like syntax for declaring styles, `Styled()`, and the `StyledComponent` class, which is equivalent to `Styled(Component)`.

The `TabButton` example at the beginning of this README demonstrates how these styled Torus components work. Rather than defining inline styles in the compose function, which is tedious and can cost performance, we define a new `#styles()` method that returns a JSON representation of the SCSS for that component. These styles will be scoped to just the component with a `_torus???` class name and applied to the component DOM before it's rendered to the page, and will efficiently update when the defined styles change.

The `Styled` higher order component allows us to take vanilla Torus components and give them the ability to understand SCSS styles. For example, the default `List` component inherits purely from `Component`, but we can create a list component that we can style with CSS, by declaring:

```javascript
const MyStyledList = Styled(List);

// or

class MyFancyList extends Styled(List) {

    styles() {
        return {
            // normal CSS properties scoped to the root node
            'font-size': '18px',
            'background': 'rgba(0, 0, 0, 0.4)',

            // Keyframes and media queries will be scoped globally
            '@keyframes some-name': {
                'from': {'opacity': 0},
                'to': {'opacity': 1},
            },
            // note that we don't select the element again
            //  inside @media -- that's done for us
            '@media (min-width: 0px)': {
                'border-color': 'rgb(0, 1, 2)',
                'p': {
                    'font-style': 'italic',
                },
            },

            // We can use SCSS-like syntax for hierarchy.
            //  '&' are replaced by the parent selector.
            '&.invalid': {
                'color': 'red',
            },
            '&::after': {
                'display': 'block',
            },
            'p': {
                'font-weight': 'bold',
            }
        }
    }

}
```

### Component lifecycle

1. Create new component
    - call `#init()`
    - call `#render()` (which calls `#compose()` in the process)
2. Render triggered (can happen through `#listen(...)` binding the component to state updates, or through manual triggers from local state changes)
    - call `#render()` (which calls `#compose()`)
3. Remove component (cleanly destroy component to be garbage collected)
    - call `#remove()`, cleans up any event listeners attached with `#listen(...)`

**Note**: It's generally a good idea to call `Component#remove()` when the component no longer becomes needed, like when a model tied to it is destroyed or the user switches to a completely different view. But because Torus components are lightweight, there's no need to use it as a memory management mechanism or to trigger garbage collection. Torus components, unlike React components, are designed to be long-lived and last through a full session or page lifecycle.

### Accessing stateful HTMLElement methods

Torus tries to define UI components as declaratively as possible, but the rest of the web, and crucially the DOM, expose stateful APIS, like `VideoElement.play()` and `FormElement.submit()`.

React's approach to resolving this conflict is [refs](https://reactjs.org/docs/refs-and-the-dom.html), which are declaratively defined bindings to HTML elements that are later created by React's renderer.

Torus's Component API is lower-level, and tries to expose the underlying DOM more transparently. Because we can embed literal DOM nodes within what `Component#compose()` returns, we can do this instead:

```javascript
// Option A
class MyVideoPlayer extends Component {

    init() {
        this.videoEl = document.createElement('video');
        this.videoEl.src = '/videos/abc';
    }

    play() {
        this.videoEl.play();
    }

    compose() {
        // compose a literal element within the root element
        return jdom`<div id="player">
            ${this.videoEl}
        </div>`;
    }

}

// Option B
class MyForm extends Component {

    submit() {
        // Because the root element of this component is
        //   the <form/>, this.node corresponds to the form element.
        this.node.submit();
    }

    getFirstInput() {
        // This isn't ideal. I don't think this will be a commonly
        //  required pattern, but if it becomes common, we might need
        //  to establish a better way of doing this.
        return this.node.querySelector('input');
    }

    compose() {
        return jdom`<form>
            <input type="text"/>
        </form>`;
    }

}
```

Torus might get a higher-level API later to do something like this, maybe closer to React refs, but this is the current API design while larger Torus-based applications are built and patterns are better established.

## `List` Component

80% of building user interfaces consists of building lists of models. To increase developer productivity here, Torus comes with a default implementation of `List` that inherits from the base Component class. The default `List` renders instances of a given view to a `<ul>` given a collection of models, but because it's just a Torus component, it's completely extensible. Torus lists re-render efficiently when the underlying data from the store updates.

Here's an example of an app that uses `List`. The default List component's key advantage is that it efficiently renders its contents without our having to write much boilerplate code at all to manage it. We just define a `Store` where our data will live and be sorted, hand that off to a `List` constructor, define our custom `List#compose()` function if we want, and drop the list's DOM node into the page.

React and similar virtual-dom view libraries depend on [key-based reconciliation](https://reactjs.org/docs/reconciliation.html) during render to efficiently render children of long lists. Torus doesn't (yet) have a key-aware reconciler in the diffing algorithm, but `List`'s design obviates the need for keys. Rather than giving the renderer a flat virtual DOM tree to render, `List` instantiates each individual item component and hands them off to the renderer as full DOM Node elements, so each list item manages its own rendering, and the list component only worries about displaying the list wrapper and a flat list of children items.

```javascript
// This represents the collection of todo items.
//  Updates to a Store is reflected in any List listening to it by default.
class Task extends Record {}
// The StoreOf(<RecordClass>) syntax creates a Store class that defaults to
//  the given record type. (StoreOf is a higher order class constructor)
class TaskStore extends StoreOf(Task) {
    get comparator() {
        return task => task.get('description').toLowerCase();
    }
}

class TaskItem extends Component {

    // ... (imagine some more component code here)

}

// These 7 lines define our entire list view. Like StoreOf(...) above,
//  the ListOf(<ItemComponentClass>) defines a list view where new models
//  in our collection will be inserted into our list as ItemComponentClass
//  views.
class TaskList extends ListOf(TaskItem) {
    compose() {
        return jdom`<ul style="padding:0">
            // this.nodes is the array of sorted DOM nodes of the collection
            /   items. We can drop this object in here to render the list here.
            ${this.nodes}
        </ul>`;
    }
}

const tasks = new TaskStore([
    new Task(1, {description: 'Do this', completed: false,}),
    new Task(2, {description: 'Do that', completed: false,}),
]);
const list = new TaskList(tasks);
```

As an alternative to calling the `ListOf()` API, we can also just extend `List` with a different `#itemClass` getter:

```javascript
class MyList extends ListOf(MyView) {}
// equivalent to
class MyList extends List {
    get itemClass() {
        return MyView;
    }
}
```

Note that `List` is not styled by default. You can extend the styled version of the list component by extending from `Styled(List)`.

### List API

When we create a list view from `List`, we need to tell it two things: 1) what component each of its children items are going to be, and 2) what it source of data is going to be. All together, this looks like:

```javascript
// define our data models first
const movies = new Store();
class MovieView extends Component { /*...*/ }

// define our list view
class MovieListView extends ListOf(MovieView) { /*...*/ }
// or
const MovieListView = ListOf(MovieView);

// instantiate our list
const movieList = new MovieListView(movies);
```

Here, we make a new Store called `movies`, which is going to hold all our movie models in a list. We also define `MovieView`, which is a component that displays one movie in our list.

When we define `MovieListView` as `ListOf(MovieView)`, we're telling Torus that we want `MovieListView` to behave like a `List`, but we want each individual child view to be a `MovieView` we defined earlier.

Lastly, we can create an instance of the list view that listens to our `movies` store for changes, and updates the view accordingly by rendering a list of the movies that are in that list.

By default, a `List` is going to render the children inside a `<ul>...</ul>` wrapper element, but we can fully customize how our list is rendered by overriding `List#compose()`. For example, this is going to add the children to a container element, and add a header at the top of the list.

```javascript
class MovieListView extends ListOf(MovieView) {
    compose() {
        return jdom`<div class="list-container">
            <h1>My favorite movies</h1>
            ${this.nodes}
        </div>`;
    }
}
```

We can access the array of children components' nodes in a Torus List component with `this.nodes`, and embed it anywhere in our markup to customize the look of our list.

### Filter

We can set and remove a filter function that Torus lists will run on each record before rendering that record's listing in the view. Each time we change the filter, the list will automatically re-render. This is useful for searching through or filtering lists rendered with `List`.

```javascript
const movieList = new (ListOf(MovieView))(movies);

// let's only show movies that start with 'A' or 'a'
movieList.filter(movie => movie.get('name').toLowerCase()[0] === 'a');
// let's switch the filter to movies that are rated above 80%
//  this unsets the last filter, and sets a new filter
movieList.filter(movie => movie.get('rating') > 80);
// show all the movies again
movieList.unfilter();
```

## Data models (`Record`, `Store`)

### Records

An instance of `Record` represents a single source of data, and we can bind a Torus component to a record to have the component perform some action (usually re-compose and render) when the record emits an event (usually data update).

When we create a record, we can give it an optional id (key), and any initial attributes we want it to have.

We can access attributes from the record with `#get`, and set or update values with `#update`.

```javascript
class Movie extends Record {}
const movie1 = new Movie({ // omitted the ID
    name: 'Avengers: Endgame',
});
const movie2 = new Movie('1234ab', { // specified an ID
    name: 'Wonder',
});
movie1.id; // null
movie2.id; // '1234ab'

movie1.get('name'); // 'Avengers: Endgame'
movie1.update({
    release_year: 2019,
});
movie1.get('release_year'); // 2019
```

When we call `#update()` to set new values on a record, any components listening to the record will be notified after the new attributes are set.

When we want to serialize the record for rendering or sharing on the network, we can use one of two methods. By default, both of these methods, `#serialize()` and `#summarize`, return the same, JSON representation of the record's attributes.

`#serialize()` is meant to be used when we need a completely string-like format for transferring data, like sending over the network. `#summarize` is used to share state within our app, like when the record emits an event. It can contain data structures that aren't JSON-serializable into a string.

### Stores

An instance of `Store` represents a collection of records, or a table in a relational sense. We can bind Torus components to stores, but stores are usually best used with `List` or a list-like component to display an entire list of records.

Like lists, we can construct custom Store classes in two ways:

```javascript
class City extends Record {}
class CityStore extends StoreOf(City) { /*...*/ }
// equivalent to
class CityStore extends Store {
    get recordClass() {
        return City;
    }
}
```

When we create a new store, we can give it an initial array of records to contain. Stores are not strictly required to be homogeneous (it can contain records of multiple different types), but it's not recommended that you create heterogenous stores.

Like records, stores have `#serialize()` and `#summarize()` methods used for sharing in a flat string format and for internally sharing a snapshot of the data, respectively. For more about serialize vs. summarize in Torus data models, see the Records section above.

```javascript
const destinations = new CityStore([
    new City({name: 'Dublin'}),
    new City({name: 'Melbourne'}),
]);
destinations.serialize(); // [{name: 'Dublin'}, {name: 'Melbourne'}]
```

We can add new records to our store in two ways, and remove with `#remove()`. All of these operations update the underlying data, so they'll fire individual events for any components listening to updates.

```javascript
// create an instance of destinations.recordClass (City)
destinations.create({
    name: 'Vancouver',
});
// add the given record to the end of the list.
const london = new City({name: 'London'});
destinations.add(london);
destinations.serialize(); /* [
    {name: 'Dublin'},
    {name: 'Melbourne'},
    {name: 'Vancouver'},
    {name: 'London'}
] */

destinations.remove(london);
destinations.serialize(); /* [
    {name: 'Dublin'},
    {name: 'Melbourne'},
    {name: 'Vancouver'}
] */
```

Often, we want the records in a store to be ordered by a specific property regardless of when we added them to the list. For this, we can modify the store's `#comparator` function, which _maps a record to the property that should be used for sorting_.

```javascript
class CityStore extends StoreOf(City) {
    get comparator() {
        // sort in lexicographical order by the name
        return city => city.get('name').toLowerCase();
    }
}
```

## Client-side routing: Components bound to `Router`

>// TODO: the Router API is still being built

## A supplement about JDOM (JSON DOM)

JDOM is an efficient, lightweight (usually internal) representation of the DOM used for diffing and rendering in Torus. While the `jdom` template tag provides an ergonomic, JSX-like templating syntax, we need a more efficient and lightweight format for Torus's internal representation of components, and JDOM fills that role!

Whenever you `#compose()` a component in Torus, you can use the `jdom` template tag to define your DOM, or return the lower-level, JDOM representation of your tree. In the future, we might compile away the `jdom` template processor at build time, inspired by `developit/htm`.

JDOM also bears a resemblance in motivation to [hyperscript](https://github.com/hyperhype/hyperscript). Both try to create a nice interface for describing DOM hierarchies, but hyperscript is more of an authoring interface, whereas JDOM is more of an intermediate representation for rendering markup in Torus components. In JDOM, object hierarchies replace call stacks of `h()` in hyperscript.

### Single element

```javascript
const jdom = {
  tag: 'div',
  attrs: {
    'data-ref': 42,
    class: [
      'firstClass',
      'second_class',
      'third-class',
    ],
    style: {
      background: '#fff',
    },
  },
  events: {
    'click': () => counter ++,
    'mouseover': [
        () => console.log('hi'),
        () => console.log('hello'),
    ],
  },
  children: [...<JDOM>],
};
```

### Nested components

```javascript
const myComponent = new Component();
const myComponent2 = new Component();

const jdom = {
  // defaults to 'div' tag
  children: [
    myComponent.node,
    myComponent2.node,
  ],
};
```

### Text nodes

```javascript
const jdom = 'Some text';
// => TextNode
```

### Empty nodes

```javascript
const jdom = null;
// => CommentNode
```

### Literal Elements

```javascript
const jdom = document.createElement('div');
// => <div></div>
```

### JDOM factory functions

For development ergonomics, Torus suggests using and creating shortcut factory functions when writing JDOM.

In general, a JDOM factory function has the signatures:

```javascript
tagName([... <children JDOM>])
tagName({...attributes}, [... <children JDOM>])
tagName({...attributes}, {...events}, [... <children JDOM>])
```

## Installation and usage

Torus is still in active development (now making sure we have good test coverage, and then testing it out on larger projects before marking a release). So we aren't on NPM yet. But you can install `torus` locally and import it via node's require:

```javascript
const { Component, Record, Store } = require('torus-vdom');
```

Note that, used this way, Torus will print all debug statements. To use Torus without debug statements, build a version of Torus (section below), and import a development or production build with debug disabled into your project.

Alternatively, you can also just import Torus with:

```html
<script src="/path/to/your/torus.js"></script>
```

Torus will export all of its default globals to `window`, so they're accessible as global names to your scripts. This isn't recommended, but great for experimenting.

## Internationalization

Torus doesn't concern itself with internationalization, but as developers, we can use the APIs available to us make internationalization possible inside our Torus components. Torus exposes much of the rendering process and the DOM, and importantly allows you us create a `preprocessor` that can take in JDOM, and modify it before it reaches the renderer, so we can make modifications to the DOM that the renderer sees with our own code. This makes Torus highly extensible and ideal for i18n. In fact, the component preprocessor API is what makes `Styled()` possible.

>// TODO

## Accessibility

>// TODO

## Contributing

If you find bugs, please open an issue or put in a pull request with a test to recreate the bug against what you expected Torus to do.

### Generating documentation from comments

Torus has a unique system for generating documentation from code comments that begin with `//>`. To generate comment docs, run

```sh
~$ npm run docs
# or
~$ yarn docs
```

Docs files will be generated at `./docs/` and are viewable on a web browser.

![Torus annotated source](docs/screenshot.png);

### Builds

To build Torus, run

```sh
~$ npm build
# or
~$ yarn build
```

This will run `./src/torus.js` through a custom toolchain, first removing any debug function calls and running that result through Webpack, through both `development` and `production` modes. Both outputs, as well as the vanilla version of Torus without Webpack processing, are saved to `./dist/`.

### Running tests

To run Torus's unit tests and generate a coverage report to `coverage/`, run

```sh
~$ npm test
# or
~$ yarn test
```

This will run the basic test suite on a development build of Torus. More comprehensive integration tests using full user interfaces like todo apps is on the roadmap.

We can also run tests on the production build, with:

```sh
~$ npm test-prod
# or
~$ yarn test-prod
```

This **won't generate a coverage report**, but will run the tests against a minified, production build at `dist/torus.min.js` to verify no compilation bugs occurred.
