# Torus

Minimal JS Model-View UI framework focused on being small, efficient, and free of dependencies.

## Features

### Simplicity

Torus has no production dependencies and weighs in at under 2.5kb gzipped. This makes it simple to adopt and ship, for anything from rendering a single component on the page to building full-scale applications.

### Portability

Torus's architecture encapsulates all of the rendering and updating logic within the component itself, so it's safe to take `someComponent.node` and treat it as a simple pointer to the root DOM element of the component. You can move it around the page, take it in and out of the document, embed it in React or Vue components, and otherwise use it anywhere a vanilla DOM element can be used. This allows you to include Torus components and apps in lots of other frontends.

**Note**: Sometimes, like when the tag of the root element changes, `someComponent.node` can change as Torus needs to replace one element fully with a new element. For this reason, always use `#node` referenced from the component object, rather than caching the actual element `#node` points to at one point in time.

Combined with the small size of Torus, this makes it reasonable to ship torus with only one or a few components for a larger project that includes elements from other frameworks, if you don't want to or can't ship an entire Torus application.

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
    //  which torus takes and renderes efficiently through its virtual DOM.
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

For a more detailed and real-world example tying in models, please reference `samples/`.

## JDOM (JSON DOM)

JDOM is an efficient, lightweight representation of the DOM used for diffing and rendering in Torus.

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

## `List` Component

80% of building user interfaces consists of building list interfaces. To increase developer productivity here, Torus comes with a default implementation of `List` that inherits from the base Component class.

```javascript
// TODO document List API
```

## Data models (`Record`, `Store`)

```javascript
// TODO
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

## Contributing

If you find bugs, please open an issue or put in a pull request with a test to recreate the bug against what you expected Torus to do.

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

This **won't generate a coverage report**, but will run the tests against a minified, production build at `dist/torus.min.js` to verify no compilation bugs occured.

