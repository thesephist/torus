# Torus

Minimal JS Model-View UI framework focused on being lightweight and free of dependencies

## Features

### Simplicity

Torus has no production dependencies, no build step to ship, and weighs in at under 3kb gzipped. This makes it simple to adopt and ship.

### Portability

Torus's architecture encapsulates all of the rendering and updating logic within the component itself, so it's safe to take `someComponent.node` and treat it as a static value that just points to the root DOM element of the component. You can move it around the page, take it in and out of the document, embed it in React or Vue components, and otherwise use it anywhere a vanilla DOM element can be used. This allows you to include Torus components and apps in lots of other frontends.

Combined with the small size of Torus, this makes it reasonable to ship torus with only one or a few components for a larger project that includes elements from other frameworks, if you don't want to or can't ship an entire Torus application.

## Component

Torus takes after the React and Vue model, breaking down interfaces to reusable components. But components in Torus are much lighter, faster, and closer to vanilla JavaScript compared to the alternatives. (In fact, Using the full set of Torus UI rendering features requires no compilation step; just import `torus.js` with a `<script>` tag and go!)

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

