# Torus To-dos

- [ ] Set up browser tests with Karma with multiple browsers, coverage with Istanbul / nyc

- [ ] Find a way to do server-side rendering, and make a sample / demo - Have an alternative renderer that only takes jdom once on a first pass, returns a string.

- [ ] Placeholders for using literal elements -- replace with referenced placeholders, then replace in one fell swoop before function exits. Also should each render or top level tender use rAF? I think that works in principle but requires testing and overhead measuring

- [ ] There's a `HTMLElement.replaceChild()`. Use this where I do previousSibling, etc. to replace children, and also for the placeholder elements technique above.

- [ ] Emphasize in documentation: Portability (across other frameworks especially, since it literally just returns an HTML element with all state encapsulated inside; and modularity, in that it's a tiny package that can be dropped in just for a single component, or used for an entire app architecture.

- [ ] Also provide / write typescript type definitions (`.d.ts`) so we can call Torus safely from a TS codebase.

- [ ] What if there was a way to seamlessly transition between Polymer-type shadow-rooted web components and React-style pre-rendered DOM? Upgrade and downgrade? This would solve the server side render issue for web components while making things like Torus more versatile across both rendering regimes. We can do this with a `ShadowComponent` class that, when pre-rendering, just renders normal, but can also, given a web component tag, render to its shadow root.

- [ ] Think about single-file components -- just import a namespaces component from a single JS file and use it. Does that fit into Torus's rationale and how can we make it work here?

- [ ] For styles: we can make styled components pretty easily by providing a `css()` function (like `github/khan/aphrodite`) that takes a styles object and serializes it into CSS stylesheets or inline style declarations (then the inline styles can be passed to Torus like normal).

- [ ] Make a transpiler for JSX to torus JDOM so I can write JSX instead of pure JDOM.

## Markus (markdown parser demo)

Make Markus (the Markdown renderer) an example in the torus repository. This is what we'll use for Sigil and Ligature as well.

```
Markus extends Component {
    updateMarkdown(string markdownContent) {
        this.markdown = markdownContent;
        this.render();
    }

    compose() {
        return div([
            // render markdown
        ]);
    }
}
```

Support
- * / _
- link with [] / ()
- headers with #'s
- `---` and `***`-based dividers
- quote with > incl. nesting if time
- lists (-, 1)
- double newlines => newlines.

