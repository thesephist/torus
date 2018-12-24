# Torus To-dos

- [-] Flesh out documentation, referencing tests for API surface.

- [-] Add more detailed tests for `Styled[Component]` (media queries?)

- [-] Keep cutting down that bundle size and complexity / speed!

- [ ] Concurrency
    - Yielding to the browser at the component level. Treat each Component#render or renderJDOM() as a separately, always-deferrable async event. This gets the interactivity / CPU time benefits of concurrent React.
    - React uses the defer() function to indicate to the renderer what updates aren't critical. We could try something similar, and have defer be default but indicate high priority updates?

- [ ] Function components
    - We can abstract away pure components that just render data with a function that returns JDOM (or uses jdom to render JSX to JDOM), and call these functions in #compose of larger class components.
    - This feels very native, JavaScripty -- just using the function abstraction, because the JDOM is just JSON objects.
    - But how would we, for example, Style() these components?

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
