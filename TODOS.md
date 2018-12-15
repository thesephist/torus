# Torus To-dos

- [ ] Flesh out documentation, referencing tests for API surface.

- [ ] Improve performance of inserting a node at the top of a long sorted list. Currently, it replaces every element going down.

- [ ] Make a template tag for JSX to torus JDOM so I can write JSX instead of pure JDOM -- Experiment with using `<template>` to make the browser render with replaced attributes, then walking the resulting tree.

- [ ] Add searchability / filterability to the default `List` implementation.

- [ ] Find a way to do server-side rendering, and make a sample / demo - Have an alternative renderer that only takes jdom once on a first pass, returns a string.

- [ ] What if there was a way to seamlessly transition between Polymer-type shadow-rooted web components and React-style pre-rendered DOM? Upgrade and downgrade? This would solve the server side render issue for web components while making things like Torus more versatile across both rendering regimes. We can do this with a `ShadowComponent` class that, when pre-rendering, just renders normal, but can also, given a web component tag, render to its shadow root.

- [ ] Incorporate sample projects into test, under `test/todo.js` etc. These integration tests will make testing on the whole more robust.

- [ ] First release (after all the above are complete)

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

1. NO parsing inline links unless they’re markdown-style explicitly
2. /italic/, *bold*, _underline_, and ~strikethrough~
3. #-denominated headers, and no other headers
4. —- for horizontal dividers (and nothing else)
5. backticks for code blocks, both inline and multiline, like Markdown
6. Blockquotes with > (including multilevel quotes)
7. Number- and dash-enumerated lists
8. Double newlines -> newlines

This standard should permeate all polyx apps, including Sigil and Ligature2

