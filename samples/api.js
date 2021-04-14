//> This is an example-driven documentation for Torus's entire API surface.
//  If you want to know more about Torus as an open-source project, or what it is,
//  check out the [Github repository](https://github.com/thesephist/torus).

//> ## Using Torus with your project

//> If you're in the browser, you can import Torus with a script tag.
<script src="https://unpkg.com/torus-dom/dist/index.min.js"></script>

//> Imported like this, Torus exposes its entire API through these globals.
window.Torus; // contains all of the core library, including `Torus.Component`, etc.
window.jdom; // contains the `jdom` template tag
window.css; // contains the `css` template tag

//> .. so you can create a component, for example, like this.
//  We'll omit the `Torus.` prefix for the rest of this documentation, for
//  sake of brevity.
class MyComponent extends Torus.Component {
    /* ... */
}

//> If you're bundling within NodeJS, the `torus-dom` package contains
//  all the exported names. You can use ES2015 imports...
import { Component, Record, Store, jdom, css } from 'torus-dom';
//> ... or CommonJS require.
const { Component, Record, Store, jdom, css } = require('torus-dom');

//> ## JDOM

//> Torus, like React, Preact, and Vue, uses a virtual DOM to reconcile
//  differences between a previous render of a component and the new render
//  of a component before committing any changes to the DOM. To run the reconciliation
//  algorithm, we need an intermediate representation of the component render tree
//  that's efficient to create and traverse. Torus achieves this with `JDOM`, a JSON
//  format for representing all DOM nodes.

//> `null` values are always translated to comments
null; // <!---->

//> String values represent text (they map to `TextNode`s)
'Hello, World!'; // 'Hello, World!'

//> HTML elements are represented with an object with four keys: **tag**,
//  **attrs**, **events**, and **children**. `tag` is the name of the HTML
//  tag for the element. All fields are optional, except `tag`, which is required.
const el = {
    tag: 'ul',
    attrs: {},
    events: {},
    children: [],
} // <ul></ul>

//> `attrs` is an object containing all attributes and properties of the element.
//  `attrs.class` is a special property, because it can either be a string representation
//  of the element's `className` property, or an array of class names. If it's an array, the
//  members of that array will be joined together during render. Other `attrs` properties
//  should be strings or numbers.
const $input = {
    tag: 'input',
    attrs: {
        class: ['formInput', 'lightblue'],
        'data-importance': 5,
        value: '42.420',
    },
} //<input class="formInput lightblue"
  //       data-importance="5" value="42.420" />

//> Although Torus advocates for using the `Styled()` higher-order component when styling
//  components, sometimes it's useful to have access to inline styles. Inline styles are represented
//  in JDOM as a flat object, using CSS-style camelCase CSS property names.
const $fancyButton = {
    tag: 'button',
    attrs: {
        style: {
            color: 'red',
            backgroundColor: 'blue',
            fontSize: '16px',
        },
    },
} // <button style="color:red;background-color:blue;font-size: 16px"></button>

//> `events` is a dictionary of events and event listeners. Each key in the dictionary
//  is an event name, like `'click'` or `'mouseover'`, and each value is either a single
//  function or an array of functions that are handlers for the event. Torus _does not
//  currently delegate events_. Each event is bound to the given element directly. However,
//  this may change in the future as Torus is used in more complex UIs.
const $button = {
    tag: 'button',
    events: {
        click: () => alert('Button clicked!'),
        mouseover: [
            evt => console.log(evt.clientX),
            evt => console.log(evt.clientY),
        ],
    }
}

//> `children` is a flat array of the element's children, in JDOM format. This means
//  children can be any string, `null`s, or other JDOM "nodes" as objects.
const $container = {
    // Implied 'div'
    children: [
        '👋',
        'Hello, ',
        {
            tag: 'em',
            children: ['World!'],
        },
    ],
} //> <div>👋Hello, <em>World!</em></div>

//> ### The `jdom` template tag

//> These basic rules allow us to compose relatively complex elements
//  that are still readable, but JDOM is an intermediate representation used for
//  reconciliation and rendering, and isn't suitable for writing good code.
//  To help writing component markup easier, Torus comes with a helper function
//  in the form of a [template tag](https://wesbos.com/tagged-template-literals/).

jdom`<p>Hi</p>`; // creates JDOM for <p>Hi</p>

//> This function, called `jdom`, allows us to write in plain HTML markup
//  with variables and dynamic template values mixed in, and it'll translate our
//  markup to valid JDOM _during runtime_. This means there's _no compilation_ and
//  _no build step_. Despite the fact that templates are parsed at runtime, because
//  each template is cached on the first read, rendering remains fast.

let name = 'Dan';
//> We can embed variables into `jdom` templates.
jdom`<strong>
    My name is ${name}
</strong>`;

//> Using the `jdom` template tag, we can express everything that JDOM can represent
//  using HTML-like markup. Here, we bind an event listener to this `<input>` element
//  by passing in a function as an `onchange` value.
jdom`<input
    type="text"
    value="${user_input_value}"
    onchange="${evt => console.log(evt.target.value)}"
/>`;

//> Of course, we can embed children elements inside `jdom` templates. The template
//  tag allows children to be either a single element or JDOM object, or an array
//  of element (HTML node) or JDOM objects. This allows nesting sub-lists in lists
//  easy.
const snippet = jdom`<h1>This is a title</h1>`;
const listPart = [
    document.createElement('li'),
    document.createElement('li'),
    document.createElement('li'),
];
jdom`<div class="container">
    ${snippet}
    <ul>${listPart}</ul>
</div>`;

//> As a bonus, quotes are optional...
jdom`<input type=text value=default-value />`;

//> ... and general closing tags `</>` can close out their corresponding tags, although
//  this can make for less readable code and isn't recommended most of the time. This can
//  come in handy if our tag name changes conditionally.
const tagName = isEven(someNumber) ? 'em' : 'strong';
jdom`<span><${tagName}>${someNumber} is my favorite number.</></span>`;

//> **An important note on security**

//> Inline `<script>` tags are well known to be a source of many tricky security issues,
//  and are generally best avoided unless it's the only way to solve your problem at hand.
//  Inline scripts are especially problematic in templating code like `jdom` because it's easy
//  to write templates and accidentally forget to escape user input when rendering it into DOM.

//> To help alleviate the potential security risks here, **no user-provided input (no variable
//  passed into `jdom` templates inside curly braces) will _ever_ be parsed into HTML** by the
//  template processor. This prevents potential cross-site scripting issues or premature `<script>`
//  tag terminations, for example, but it means that you'll have to wrap any template string in
//  `jdom` tags, even if it's inside another `jdom` tagged template.

//> On a related note, if you _must_ use an inline `<script>` in a template, `jdom` allows this
//  (for now). However, you'll want to escape the entire contents of the script tag, by wrapping
//  the full contents of the tag in curly braces, to avoid security pitfalls around escaping code.
jdom`<script>${'console.log("This is highly discouraged, for security reasons.")'}</script>`;

//> ## Component

//> In Torus, we build user interfaces by composing and connecting reusable components
//  together. A Torus component extends the base `Component` class, and has a `#compose()`
//  method that returns the JDOM representation of the UI component's DOM. Torus uses this
//  method to render the component. Because Torus renders components declaratively, we should
//  avoid calling methods on the component (like mutating the local state) within `#compose()`.
//  Mutating state during render may lead to race conditions or infinite loops, since state mutations
//  are usually linked to more render calls.
class MyFirstComponent extends Component {

    compose() {
        return {
            tag: 'h1',
            children: ['Hello, World!'],
        }
    }

}

//> ... of course, we can simplify this by relying on the `jdom` template tag
class MySecondComponent extends Component {

    compose() {
        return jdom`<h1>Hello, World!</h1>`;
    }

}

//> Now that we've defined a component, we can render that component to our page.
//  Each component has a `#node` property, which always represents the root
//  DOM node of that component. To add our component to the page, we can just create
//  a new instance of our component and add its node to the document.
const first = new MyFirstComponent();
//> We use the native `appendChild()` API to add our node to the page.
document.body.appendChild(first.node);

//> All components have a `#render()` method that's provided by Torus. The render method
//  is owned by Torus, and we rarely need to override it, because we tell torus what to render
//  with `#compose()`. But if we want to tell torus to re-compose and re-render our component,
//  we can do so by calling `Component#render()`.
const second = new MySecondComponent(); // rendered once, by default, on initialization
second.render(); // rendered a second time

//> Torus intelligently only mutates the DOM on the page if anything has changed, so
//  renders are quick and efficient (but not free -- we should still only call render
//  when we have something new to display).

//> Sometimes, we need to create components with different properties each time.
//  We define the initial state of our component in an `#init()` method, which is called
//  with the arguments passed in when we construct an instance of our component.
//  The init method is also a good place to bind methods and listen to event targets.
class Tweet extends Component {

    //> This is called from the parent class's constructor.
    //  Why is it called `init()` and not `constructor()`, you might ask?
    //  There are a few reasons why I made this call. Primarily, this ensured that
    //  components always had a valid and correct `#node` property by allowing
    //  Torus to render all components in the constructor. This allows for the component
    //  system to have a generally more ergonomic API. We can read and override
    //  `Component#super()` if we want to extend Torus's functionality.
    init(author, content) {
        this.author = author;
        this.content = content;
        //> For some reason, if we want this component to update every time
        //  the window is resized, we can do add kinds of listeners here.
        this.render = this.render.bind(this);
        window.addEventListener('resize', this.render);
    }

    //> Since we bound a listener in `init()`, we need to make sure we clean up
    //  after ourselves.
    remove() {
        window.removeEventListener('resize', this.render);
    }

    //> We can access the instance and class variables within our JDOM template,
    //  because it's just a JavaScript method.
    compose() {
        return jdom`<div class="tweet">
            <div>${this.content}</div>
            <cite>${this.author}</cite>
            <p>The window size is now ${window.innerWidth}</p>
        </div>`;
    }

}

//> We can have components with event listeners and other methods
//  that we use to respond to events
class FancyInput extends Component {

    init() {
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onFocus() {
        console.log('Focused input');
    }

    onBlur() {
        console.log('Blurred input');
    }

    compose() {
        return jdom`<input type=text
            onfocus=${this.onFocus}
            onblur=${this.onBlur} />`;
    }

}

//> If we need to fetch data within a component, here's one way to do so, by
//  re-rendering when new data arrives. Let's say we want a component that displays
//  a list of the top 10 winners in some competition, using a JSON API.
class RankingsList extends Component {

    //> Let's say we want this component to display top 10 places by default
    init(limit = 10) {
        this.limit = limit;
        this.rankings = [];
        //> We don't always want to fetch when we create a view, but just for today,
        //  let's say we'll fetch for new data when this view first appears.
        this.fetch();
    }

    async fetch() {
        const data = fetch('/api/v2/rankings?limit=10').then(r = r.json());
        //> Only take the first `this.limit` results
        this.rankings = data.slice(0, this.limit);
        //> Since data's changed, we'll re-render the view
        this.render();
    }

    compose() {
        return jdom`<ol>
            ${this.rankings.map(winner => {
                //> We can nest a template within a template to render
                //  a very simple list like this. For more complex lists,
                //  we'll want to use a `List` component, like the one below,
                //  where each item gets its own component.
                return jdom`<li>
                    ${winner.name}, from ${winner.city}
                </li>`;
            })}
        </ol>`;
    }

}

//> One notable difference between Torus's and React's component API, which this somewhat
//  resembles, is that Torus components are much more self-managing. Torus components
//  are long-lived and have state, and so have no lifecycle methods, but instead call
//  `#render` imperatively whenever the component's DOM tree needs to update (when
//  local state changes or a data source emits an event). This manual render-call replaces
//  React's `shouldComponentUpdate` in a sense, and means that render functions are _never_
//  run unless a re-render is explicitly requested as the result of a state change, even if
//  the component in question is a child of a parent that re-renders frequently.
class AppWithSidebar extends Component {

    init() {
        //> As a downside of that tradeoff, we need to keep track
        //  of children components ourselves...
        this.sidebar = new Sidebar();
        this.main = new MainPanel();
    }

    remove() {
        //> ... but most of that just means instantiating and removing children views
        //  inside parent views, like this.
        this.sidebar.remove();
        this.main.remove();
    }

    compose() {
        //> Because we can embed HTML nodes inside `jdom` templates, we can
        //  include our children components in the parent component's DOM tree easily, like this.
        return jdom`<div class="root">
            ${this.sidebar.node}
            ${this.main.node}
        </div>`;
    }

}

//> ### `Component.from()` and functional components

//> Often, we want to create a new Component class whose rendered result only depends on its
//  initial input. These might be small UI widgets in a design system like buttons and dialogs,
//  for example. In these cases where we don't need a component to keep local state, listen for
//  events, or create side effects, we can describe the component's view with a pure function.

//> Here's an example of a purely functional component. It returns a JDOM representation. To distinguish
//  functional components from class-based Torus components in usage, by convention, we name functional
//  components with a name that begins with a lowercase letter. This distinction is helpful, because
//  we use the `new` keyword with class components, and call their `compose()` method to get JDOM,
//  while we call functional components directly to get JDOM.
const fancyButton = buttonText =>
    jdom`<button class="fancy">${buttonText}</button>`;

//> Because these kinds of function "components" will return valid JDOM, we can compose them
//  into any other `Component#compose()` method. Remember, `fancyButton` is just a JavaScript
//  function! This allows for easy abstraction and code reuse within small parts of our rendering logic.
//  Here, we can just pass the return value of `fancyButton()` off to another template.
class FancyForm extends Component {
    compose() {
        return `<form>
            <h1>Super fancy form!</h1>
            <input name="full_name"/>
            ${fancyButton('Submit!')}
        </form>`;
    }
}

//> But what if we want to compose our `fancyButton` with `Styled()` or use it in more complex views?
//  We can upgrade the function component `fancyButton` to a full-fledged Torus class component with
//  `Component.from()`. These two ways of defining `fancyButton` are equivalent.
//  Here, `ClassyButton` emits exactly the same DOM as `fancyButton` when rendered, but it's gained
//  additional capabilities accessible to a class component in Torus, like persistence across renders of
//  the parent component and better composability with `Styled()` and `ListOf()`.
const ClassyButton = Component.from(fancyButton);
//> This takes a purely functional component and returns a class component whose constructor
//  takes the same arguments (`buttonText` in this case) and renders to the given JDOM.
const ClassyButton = Component.from(buttonText => {
    return jdom`<button class="fancy">${buttonText}</button>`;
});

//> We can use these upgraded components this way, by creating an instance of it and
//  accessing its `#node`.
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

//> ## Advanced topics in components

//> ### Component lifecycles

//> Because Torus components are designed to be long-lived, it's useful to think about
//  the "life cycle" of a component, and what methods are called on it by Torus
//  from its creation to its destruction. Currently, it's a short list.
const comp = new Component();
// 1. Create new component
comp.init()
// 2. Render triggered (can happen through `#bind(...)` binding the component
//      to state updates, or through manual triggers from local state changes)
comp.render();
    comp.compose(); // called by render()
// 3. Remove component (cleanly destroy component to be garbage collected)
comp.remove();
    comp.unbind(); // called by remove()

//> **Note**: It's generally a good idea to call `Component#remove()` when the component
//  no longer becomes needed, like when a model tied to it is destroyed or the user switches to a
//  completely different view. But because Torus components are lightweight, there's no need to use
//  it as a memory management mechanism or to trigger garbage collection. Torus components, unlike
//  React components, are designed to be long-lived and last through a full session or page lifecycle.

//> ### Accessing stateful HTMLElement methods

//> Torus tries to define UI components as declaratively as possible, but the rest of the web,
//  and crucially the DOM, expose stateful APIS, like `VideoElement.play()` and `FormElement.submit()`.
//  React's approach to resolving this conflict is [refs](https://reactjs.org/docs/refs-and-the-dom.html),
//  which are declaratively defined bindings to HTML elements that are later created by React's renderer.
//  Torus's Component API is lower-level, and tries to expose the underlying DOM more transparently.
//  Because we can embed literal DOM nodes within what `Component#compose()` returns, we can do this instead:
class MyVideoPlayer extends Component {

    //> **Option A**
    init() {
        //> Create a new element when the component is created,
        //  and keep track of it.
        this.videoEl = document.createElement('video');
        this.videoEl.src = '/videos/abc';
    }

    play() {
        this.videoEl.play();
    }

    compose() {
        //> We can compose a literal element within the root element
        return jdom`<div id="player">
            ${this.videoEl}
        </div>`;
    }

}

class MyForm extends Component {

    //> **Option B**
    submit() {
        //> Because the root element of this component is
        //  the `<form/>`, this.node corresponds to the form element.
        this.node.submit();
    }

    getFirstInput() {
        //> This isn't ideal. I don't think this will be a commonly
        //  required pattern.
        return this.node.querySelector('input');
    }

    compose() {
        return jdom`<form>
            <input type="text"/>
        </form>`;
    }

}

//> Torus might get a higher-level API later to do something like this, maybe closer to React refs, but this is the current API design while larger Torus-based applications are built and patterns are better established.

//> ### Styled components and `Component#preprocess()`

//> Although you can use Torus perfectly without using CSS in JS,
//  if you like declaring your view styles in your component code, as I do,
//  Torus has an efficient and well-integrated solution, called styled components
//  (not to be confused with React's `styled-components`, which has a similar idea
//  but wildly different API).

//> You can create a styled Torus component by calling `Styled()` on a normal component
class NormalButton extends Component { /*...*/ }
const StyledButton = Styled(NormalButton);

//> But Torus already comes with `StyledComponent`, which is just `Styled(Component)`.
//  You should extend `StyledComponent` for new components, and only use the `Styled()`
//  wrapper if you don't have access to the original component's code, such as when styling
//  the default `List` implementation (below).
const StyledComponent = Styled(Component); // literally what's in Torus's source code

//> Here's a sample of the ways you can define styles this way.
class FancyList extends StyledComponent {

    //> We define all of our styles in a `styles()` method, which returns a JSON
    //  that resembles normal CSS, but with nesting and automagical media query resolution,
    //  as well as downward scoping of CSS rules to this component. That means that when we
    //  style `button` in this component, it won't ever conflict with other `button` elements
    //  anywhere else on the page.
    styles() {
        return {
            //> Normal CSS properties are applied to the root node
            'font-size': '18px',
            'background': 'rgba(0, 0, 0, .4)',

            //> Keyframes and media queries will be scoped globally,
            //  just like in CSS
            '@keyframes some-name': {
                'from': {'opacity': 0},
                'to': {'opacity': 1},
            },

            //> Note that we don't select the element again
            //  inside @media -- that's done for us by styled components.
            '@media (min-width: 600px)': {
                'border-color': 'rgb(0, 1, 2)',
                'p': {
                    'font-style': 'italic',
                },
            },

            //> We can use SCSS-like syntax for hierarchy.
            //  '&' are replaced by the parent selector.
            '&.invalid': { // FancyList.invalid
                'color': 'red',
            },
            '&::after': { // FancyList::after
                'content': '""',
                'display': 'block',
            },
            'p': { // FancyList p
                'font-weight': 'bold',
                'em': { // FancyList p em
                    'color': 'blue',
                }
            }
        }
    }

    compose() { /* ... */ }

}

//> Torus also comes with a template tag, `css`, that makes writing CSS like this
//  less tedioius, by parsing a single block of string into the styles object for you.
//  Using this template tag, `FancyList` can look like this.

//> Styles defined with the `css` template tag are cached for render, so for stylesheets
//  that do not change often between renders, writing styles with the template tag may yield performance
//  benefits over defining styles as objects, like above. For styles that change often, however,
//  code in hot paths may perform better with inline styles in JDOM or with styles defined as objects,
//  not through the template tag.
class FancyList extends StyledComponent {

    styles() {
        //> Write the styles returned as a template literal with `css`.
        return css`
        font-size: 18px;
        background: rgba(0, 0, 0, .4);

        @keyframes some-name {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @media (min-width: 600px) {
            border-color: rgb(0, 1, 2);
            p {
                font-style: italic;
            }
        }

        &.invalid {
            color: red;
        }
        &::after {
            content: "";
            display: block;
        }
        p {
            font-weight: bold;
            em {
                color: blue;
            }
        }
        `;
    }

    compose() { /* ... */ }

}

//> ## Data models

//> ### Record

//> `Record` is how Torus represents a unit of mutable state, whether that's global
//  app state, some user state, or a model fetched from the server. Let's say we want to
//  make a page for a cake shop. We can have a record represent a cake customers can buy.
class CakeProduct extends Record {}

//> To create an instance of a cake...
const cake1 = new CakeProduct({
    // can you tell I know nothing about cakes?
    name: 'Strawberry Cake',
    bread: 'wheat',
    icing: 'strawberry',
    price_usd: 15.99,
});
//> We can also instantiate a record with a unique ID...
const cake2 = new CakeProduct(2, {
    name: 'Chocolate Mountain',
    bread: 'chocolate',
    icing: 'whipped',
    price_usd: 13.99
});
cake1.id; // null
cake2.id; // 2

//> To get a property back from a record, use the `#get()` method
cake1.get('name');
// 'Strawberry Cake'
cake2.get('price_usd');
// 13.99

//> To update something about the record, call '#update()` with a dictionary
//  of the new properties.
cake2.update({
    name: 'Chocolate Volcano',
    price_usd: 12.99,
});
cake2.get('price_usd');
// 12.99

//> `Record#serialize()` will return a JSON-serialized version of the state of the record.
//  Normally, this is the same as the summary, but we can override this behavior as appropriate.
cake1.serialize();
/*
    {
        id: null,
        name: 'Strawberry Cake',
        bread: 'wheat',
        icing: 'strawberry',
        price_usd: 15.99,
    }
*/

//> `Record#summarize()` returns a "summary" of the state of the record,
//  which is a dictionary of all of its properties, plus its id, even if it's null.
cake2.summarize();
/*
    {
        id: 2,
        name: 'Chocolate Mountain',
        bread: 'chocolate',
        icing: 'whipped',
        price_usd: 13.99
    }
*/

//> We can have components whose state is bound to a record's state, so when the record updates
//  its properties, the component can respond appropriately. We do this with `Component#bind()`
class CakeProductListing extends Component {

    init(cakeProduct) {
        //> Bind this component to `cakeProduct`, so that when `cakeProduct`
        //  updates, this callback function is called with the summary of the record.
        //  Usually, we'll want to re-render. Note that when we bind, it immediately
        //  calls the callback (in this case, `this.render(props)`) once. That means
        //  everything we need to run render should be defined before this bind call.
        this.bind(cakeProduct, props => {
            //> `compose()` will be called with `props`, the summary of the cake record.
            //  We don't always have to just re-render when the record updates.
            //  we can also do other things in this callback. But rendering is most common.
            this.render(props);
        });
    }

    //> We can have the component stop listening to a record, by calling `#unbind()`.
    stopUpdating() { // probably wouldn't write something like this normally
        this.unbind();
    }

    //> When we bind a component to a new record, it stops listening to the old one automatically.
    switchCake(newCake)  {
        // implicit `this.unbind()`
        this.bind(newCake, props => this.render(props));
    }

}

const listing = new CakeProductListing(cake1);
//> We can access the record that a component is bound to, with the `record` property
listing.record === cake1; // true

//> ### Store

//> A store represents a (potentially) ordered collection of records. Used in conjunction
//  with lists below, stores are a good way of organizing records into list-like structures.
//  Components can bind to stores just like they can bind to records.

//> We can create a store by giving it an array of records.
const cakes = new Store([cake1, cake2]);
//> `Store#records` points to a `Set` instance with all the records in the collection.
//  If you want to check the size of a store, use `#records.size`.
//  But if you want to access the records in a store, `Store#summarize()` is a better interface,
//  since it can be pre-sorted based on a comparator.
cakes.records; // Set({ cake1, cake2 }), a Set
cakes.records.size; // 2
cakes.summarize(); // [cake1, cake2], an Array
//> We can also iterate over a store, like an array or set. This means we can spread ...
const cakesArray = [...cakes];
//> ...and we can `for...of` loop over stores. These, like `.records`, are not _necessarily_ ordered.
for (const cake of cakes) {
    do_something_with_cake(cake);
}
//> Like records, `Store#serialize()` returns a JSON representation of its contents.
//  For stores, this means it's an array that contains the serialized JSON form of each
//  of its records, sorted by the comparator (below).
cakes.serialize(); // [{ /* cake1 props */ }, { /* cake2 props */ }]

//> We can also add to stores later...
const cakes2 = new Store(); // empty
cakes2.add(cake1); // returns cake1
cakes2.add(cake2); // returns cake2
cakes2.records.size; // 2
//> ... and remove them.
cakes2.remove(cake1);
cakes2.summarize(); // [cake2]

//> We can find records in a store by ID, using `Store#find()`
cakes2.find(2); // returns cake2, which has id: 2
//> ... it'll return `null` if the store doesn't contain a match
cakes2.find(100); // null

//> If we want to refresh the contents of the store
//  with a new set of cakes, we can use `#reset()`.
//  This will also emit an event to any components listening.
cakeA = new CakeProduct(/*...*/);
cakeB = new CakeProduct(/*...*/);
cakes2.reset([cakeA, cakeB]);
cakes2.summarize(); // [cakeA, cakeB]

//> In practice, we'll want to define a custom store that knows
//  how to sort the collection in some order, and what record the collection
//  contains. We can extend `Store` to do this.
class CakeProductStore extends Store {

    //> The `recordClass` getter tells the Store
    //  what this store contains.
    get recordClass() {
        return CakeProduct;
    }

    //> The `comparator` getter returns a function that maps a record
    //  to the property it should be sorted _by_. So if we wanted to sort
    //  cakes by their names, we'd write:
    get comparator() {
        return cake => cake.get('name');
    }

    //> If you're looking for more advanced sorting behavior, you're welcome
    //  to override `Store#summarize()` in your subclass based on Torus's implementation.

}

//> Since our store now knows what it contains and how to sort it,
//  it can do two more things.
const cakes = new CakeProductStore([cake1, cake2]);
//> First, it can create new cakes from its properties
const fruitCake = cakes.create(3, {
    name: 'Tropical Fruit',
    price: 16.49,
});
// fruitCake is the newly created cake Record
cakes.records.size; // 3
//> Second, it can also sort them by the comparator when providing a summary
cakes.summarize(); // [cake2, cake1, cake3], sorted by 'name'

//> Rather than overriding `get recordClass()` each time you subclass `Store`,
//  Torus provides a `StoreOf()` shorthand, so you can write the above like this.
class CakeProductStore extends StoreOf(CakeProduct) {

    get comparator() {
        return cake => cake.get('name');
    }

}

//> ## List

//> 80% of user interface development is about building lists, and the best
//  UI platforms like iOS and (as of recently) Android come with great list view
//  primitives like `UICollectionView` on iOS or `RecyclerView` on Android.
//  The web doesn't, but Torus comes with a basic list view implementation that works
//  well with Torus components for small lists, up to hundreds of items. (I might
//  build a more performance-focused collection view later.)

//> To define our own list component, we first create a component for each item
//  in the list. Let's say we want to reimplement the `RankingsList` above
//  as a Torus list component.
class WinnerListing extends Component {

    init(winner, removeCallback) {
        //> We can store the winner's properties here
        this.winner = winner;
        //> When we want to remove this item from the list
        //  (from a user event, for example), we can run this callback
        //  passed from `List`.
        this.removeCallback = removeCallback;
    }

    compose() {
        return jdom`<li>
            ${this.winner.name}, from ${this.winner.city}
        </li>`;
    }

}
//> We also need to define a Store for our winners, so we can have
//  something the list can sync its contents with. Let's also give it a `fetch()` method.
class WinnerRecord extends Record {}
class WinnerStore extends StoreOf(WinnerRecord) {

    async fetch() {
        const data = fetch('/api/v2/rankings').then(r => r.json());
        const rankings = data.slice(0, this.limit);
        //> When new data comes back, reset the collection with the new
        //  list of winners.
        this.reset(rankings.map(winner => new this.recordClass(winner)));
    }

};
//> Our list component extends `List`, which already implements creating
//  and managing our `WinnerListing` views from a Store it's given on creation.
//  Note that `List` is not styled by default. You can extend the styled version
//  of the list component by extending from `Styled(List)`.
class WinnerList extends List {

    get itemClass() {
        return WinnerListing;
    }

}
//> Create a new store for winners
const winners = new WinnerStore();
//> Create a new list view based on the store. This list will now stay in sync
//  with the store's data until it's removed.
const winnerList = new WinnerList(winners);
winners.fetch(); // fetch new data, so the list updates
                 // when we get it back from the server

//> Torus also has a composable, higher-order component called
//  `ListOf` that allows us to write the above like this instead.
//  This creates and returns a `List` component with the item
//  component class set to the class we give it.
const WinnerList = ListOf(WinnerListing); // same as class WinnerList extends ...

//> Like stores, we can iterate over `List` instances to get an _unfiltered,_ _ordered_
//  sequence of components inside the list. This means we can e.g. `for...of` loop over the list's components.
for (const winnerListing of winnerList) {
    do_something_with_each_item_view(winnerListing);
}

//> By default, `List` will render the children into a `<ul></ul>`.
//  But we'll usually want to customize that. To do so, we can just override
//  `List#compose()` with our custom behavior. The `List#nodes` property
//  always evaluates to a sorted array of the children nodes, so we can
//  use that in our compose method.
class WinnerList extends ListOf(WinnerListing) {

    compose() {
        // We want the list to have a header, and a wrapper element.
        return jdom`<div class="winner-list">
            <h1>Winners!</h1>
            <ul>${this.nodes}</ul>
        </div>`;
    }

}

//> We can set and remove a filter function that Torus lists will run on each
//  record before rendering that record's listing in the view. Each time we change
//  the filter, the list will automatically re-render. This is useful for searching
//  through or filtering lists rendered with `List`.
class MovieView extends Component { /*...*/ }
const movieList = new (ListOf(MovieView))(movies);

//> Let's only show movies that start with 'A' or 'a'
movieList.filter(movie => movie.get('name').toLowerCase()[0] === 'a');
//> Let's switch the filter to movies that are rated above 80%
//  this _unsets the last filter_, and sets a new filter.
movieList.filter(movie => movie.get('rating') > 80);
//> Show all the movies again
movieList.unfilter();

//> ## Router

//> Torus comes with a Router that implements basic client-side routing
//  and works well with Torus components. To use `Router` on your page, just
//  create an instance of it with your routes
const router = new Router({
    //> We pass in a JSON dictionary of routes when we create a new router.
    //  it'll automatically start listening to page navigations.
    tabPage: '/tab/:tabID/page/:pageNumber',
    tab: '/tab/:tabID',
    about: '/about',
    contact: '/contact',
    //> `Router` matches routes top-down, so always put your more general routes later.
    default: '/',
});

//> When we later create our top-level app view (or whatever view is in charge of routing)
//  we can listen to events from the router and re-render accordingly.
class App extends Component {

    init(router) {
        //> We bind to a router just like we'd bind to a record or store.
        //  the event summary will contain two values in an array: the name of the
        //  route, as defined in the router, and the route parameters, like `:tabID`.
        this.bind(router, ([name, params]) => {
            //> You can write your routing logic however you like, but
            //  I personally found switch cases based on the name of the route
            //  to be a good pattern.
            switch (name) {
                case 'tabPage':
                    this.activeTab = params.tabID;
                    this.activePage = params.pageNumber;
                    // render the tab and page
                    break;
                case 'tab':
                    this.activeTab = params.tabID;
                    // render the tab
                    break;
                // ...
                default:
                    // render the default page
            }
        });
    }

}

//> When we create the app later, we can pass it our page router
const app = new App(router);

//> The router has a method, `#go()`, that we can call to navigate to a new route.
//  For example, if we want some method to redirect the page to tab 'shop', page 3,
//  we can just call...
router.go('/tab/shop/page/3');

//> If you want the new history entry to _replace_ the old one (rather than
//  get added to the history as a new entry), pass the `{replace: true}` option
//  to the `router.go()` method.
router.go('/tab/shop/page/4', {replace: true});

//> We can also write a component that abstracts this away from us
const RoutedLink = (route, children) => {
    return jdom`<a onclick="${() => router.go(route)}">${children}</a>`;
};
//> ... so we can write later in a nav bar, something like this.
class NavBar extends Component {

    compose() {
        return jdom`<nav>
            ${[
                RoutedLink('/', 'Home'),
                RoutedLink('/about', 'About Us'),
                RoutedLink('/contact', 'Contact')
            ]}
        </nav>`;
    }

}

//> ## Conclusions

//> That's it! That's all of Torus's API. It's pretty small. Torus tries to be
//  simple, lightweight, and extensible, so rather than being opinionated about
//  how to do common things, it provides a set of powerful extensible APIs on top
//  of a simple component and data model system.

//> I hope you found this page useful, and I hope Torus helps you build something
//  awesome. If you have any questions or come across bugs, please find me on
//  Github or Twitter at @thesephist :) Thanks for checking out Torus!
torus.build('🚀');
