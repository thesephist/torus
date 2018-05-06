# Torus

Minimal JS UI framework focused on being lightweight and free of dependencies

## JDOM (JSON DOM)

JDOM is an efficient, lightweight representation of the DOM used for diffing and rendering in Torus.

### Single element

```javascript
const jdom = {
  tag: 'div',
  attrs: {
    'data-ref': 42,
    style: {
      background: '#fff',
    },
  },
  events: {
    'click': <function(event)>,
  },
  children: [...<JDOM>],
};
```

### Nested components

```javascript
const myComponent = new Component();

const jdom = {
  // default 'div' tag
  children: [
    myComponent.render(),
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

