# Torus To-dos

- [ ] Flesh out documentation, referencing tests for API surface.

- [ ] Coverage with Istanbul / nyc

- [ ] For styles: we can make styled components pretty easily by providing a `css()` function (like `github/khan/aphrodite`) that takes a styles object and serializes it into CSS stylesheets or inline style declarations (then the inline styles can be passed to Torus like normal).

- [ ] Improve performance of inserting a node at the top of a long sorted list. Currently, it replaces every element going down.

- [ ] Make a template tag for JSX to torus JDOM so I can write JSX instead of pure JDOM -- Experiment with using `<template>` to make the browser render with replaced attributes, then walking the resulting tree.

- [ ] Add searchability / filterability to the default `List` implementation.

- [ ] Find a way to do server-side rendering, and make a sample / demo - Have an alternative renderer that only takes jdom once on a first pass, returns a string.

- [ ] What if there was a way to seamlessly transition between Polymer-type shadow-rooted web components and React-style pre-rendered DOM? Upgrade and downgrade? This would solve the server side render issue for web components while making things like Torus more versatile across both rendering regimes. We can do this with a `ShadowComponent` class that, when pre-rendering, just renders normal, but can also, given a web component tag, render to its shadow root.

- [ ] Incorporate sample projects into test, under `test/todo.js` etc. These integration tests will make testing on the whole more robust.

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

