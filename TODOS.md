# Torus To-dos

- [ ] Make README polished modeled after Preact's Github README. What badges do they use?

- [ ] Async rendering epic
    - Making rendering asynchronous -- rendering a single component's subtree one second after it's asked to render shouldn't break things, as long as renders stay in order. This should be the default rendering behavior.
    - Rather than calling render imperatively, can we make `render()` mean `enqueueComponentForRender()`? This way, we don't have multiple redundant renders if state changes are triggered multiple times on a component and `render()` itself is called multiple times. Otherwise, we have redundant renders.

- [ ] Continuous build during development!

## Planned sample projects

### Markus (markdown parser demo)

Make Markus (the Markdown renderer) an example in the torus repository. This is what we'll use for Sigil and Ligature as well.

```javascript
class Markus extends Component {
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

### Prism (slide framework)

A component library for quickly building rich, web-native slide presentations.
