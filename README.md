# Torus

Minimal JS Model-View UI framework focused on being lightweight and free of dependencies

## Component

Torus takes after the React and Vue model, breaking down interfaces to reusable components. But components in Torus are much lighter, faster, and closer to vanilla JavaScript compared to the alternatives. (In fact, Using the full set of Torus UI rendering features requires no compilation step; just import `torus.js` with a `<script>` tag and go!)

```javascript
class Toggle extends Component {

  initialize() {
    // initialize is called after the constructor,
    //  before the first render. Set any states here.
    this.state = false;
    // binding any event-bound methods like this allows
    //  the diff algorithm to optimize diffs of event listeners
    //  more efficiently.
    this.boundOnToggle = this.onToggle.bind(this),
  }

  onToggle() {
    this.state = !this.state;
    // for now, render calls are manual (state changes do not
    //  trigger render). I'm watching for patterns that arise
    //  before taking a more opinionated approach.
    this.render();
  }

  compose() {
    // the composer method returns a JDOM object (dictionary)
    //  of the DOM to be rendered. `this.render()` will take this
    //  and efficiently render it to the document.
    return (
      button({}, {
        click: this.boundOnToggle,
      }, [
        this.state ? ':D' : ':\'(',
      ])
    );
  }

}

class App extends Component {

  initialize() {
    this.clickTimes = 0;
    this.toggles = [];
    this.boundButtonClick = this.buttonClick.bind(this);
  }

  buttonClick() {
    this.clickTimes ++;
    this.toggles.push(new Toggle());
    this.render();
  }

  compose() {
    return (
      div([
        h1([
          'Hello, ', em(['World!']),
        ]),
        p([
          'Button has been pressed ', this.clickTimes, ' times.',
        ]),
        button({
          style: {
            background: 'blue',
            color: '#fff',
          },
        }, {
          click: this.boundButtonClick,
        }, [
          'Click me!',
        ]),
        // using just vanilla JavaScript syntax, we can render a dynamic list
        //  with very little boilerplate, since a literal HTML node is a valid JDOM element.
        ul([
          ...this.toggles.map(t => {
            return li([t.node]);
          }),
        ]),
      ])
    );
  }
}

// instantiate the top-level
const app = new App();
// add the root element of the root component to the DOM,
//  and subsequent render calls will automatically update the page content.
document.body.appendChild(app.node);
```

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

