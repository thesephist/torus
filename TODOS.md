# Torus To-dos

- [-] Add more detailed tests for `Styled[Component]`

- [-] Keep cutting down that bundle size and complexity / speed!

- [ ] Incorporate sample projects into test, under `test/todo.js` etc. These integration tests will make testing on the whole more robust.

- [ ] Flesh out documentation, referencing tests for API surface.

- [ ] First release (after all the above are complete)

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
