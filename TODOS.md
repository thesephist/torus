# Torus To-dos

- [ ] Make README polished modeled after Preact's Github README. What badges do they use?

- [-] "Saved for later" stories list tab feature on the hn reader. URL should be `/saved`. Use localstorage, save an array of IDs.
    - [ ] No more comments truncated should only show on the top level comment thread, not sub-threads. This is weird in practical UI. Subthreads should show iff the trancated count is not 0.
    - [ ] Open in new tab button in the story listing that's not expanded.
    - [ ] Or set font size on the list, not the comment. Each comment indentation level otherwise gets smaller and smaller fonts on mobile.

- [ ] Error boundaries -- when something in render() call throws an uncaught error, catch it and render either the last render or a placeholder or something. Otherwise errors during render will mess up DOM (though not as badly as RAeact's renderer, which re-renders the whole app).

- [ ] Some way to defer rendering a subtree until contents have loaded / are ready would be great. This would be another great way to remove redundant renders, to get performance up.

- [ ] JDOM -- warn that user should check for valid HTML, closing attrs tags and quotes, etc. when errors happen on invalid template.

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
