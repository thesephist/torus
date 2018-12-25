# Torus To-dos

- [ ] Think about using streams / observables to abstract data models and events. Also consider l3 concepts in the context of Torus. They should map well.

- [ ] Concurrency
    - Yielding to the browser at the component level. Treat each Component#render or renderJDOM() as a separately, always-deferrable async event. This gets the interactivity / CPU time benefits of concurrent React.
    - React uses the defer() function to indicate to the renderer what updates aren't critical. We could try something similar, and have defer be default but indicate high priority updates?
    - We can split the render process of each component (each render() call ) into two parts: part 1, up to and including the `#compose()` call, and part 2, everything from when `#compose()` returns, to flushing all changes to the DOM and letting the browser render.
        - Let's make everything in part 2 asynchronous and collaboratively concurrent (through `requestIdleCallback`) by default, and part 1 opt-in asynchronous.
        - This makes sense within the larger scope of Torus's architecture. The data layer is meant to be imperative, which makes it hard to be async by default. But the presentation layer is declarative, which makes it easy to be async by default.
        - Using this method, at each subtree in the `renderJDOM` render tree, we can choose to defer the render of that subtree, a la concurrent React and React suspense.
        - As a part of this consideration, maybe we should also make all bulk `replaceChild` calls in the render step asynchronous with rAF? Does that have any benefits?
    - Like concurrent React, we should support the ability to halt rendering and cancel a render pass, render the next render call if render was called before the previous render call began flushing to DOM / being rendered. Multiple calls to `#render()` in succession should result in a single `#render()` call.

- [ ] Finish Torus `Router`

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
