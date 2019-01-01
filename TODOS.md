# Torus To-dos

- [ ] React's reactive state components are basically Torus components + a record attached by default to each component. Can we emulate that with a `ReactiveComponent` that comes with a record by default?

- [ ] Keep working on that bundle size -- Goal is 4.5kB, 4kB would be great.

- [ ] We need to work on the deploying and to-production story of Torus. Right now, Torus binds to the global (`window`) namespace and has debug statements all throughout. Those should be fixed in a production build. How can we make Torus simple to use as a drop-in script while remaining flexible enough to be bundled properly?

- [ ] Make README polished modeled after Preact's Github README. What badges do they use?

## Planned sample projects

### Prism (slide framework)

A component library for quickly building rich, web-native slide presentations.

```javascript
const Slide1 = () => {
    return TitleSlide(
        Title('Virtual DOM in 900 Lines of JS'),
        Subtitle(Image('./img/vdom.js'))
    );
}
const Slide2 = () => {
    return ContentSlide(
        Title('The Framework Wars'),
        VerticalSplit(
            Body(
                List(
                    'React',
                    'Vue',
                    'Ember',
                )
            )
            Image('./img/starwars.jpg')
        )
    );
}
```

### Twirl (Trello-like project manager)

- Drag and drop
- Full-stack node application, Torus frontend. Testing sync / data fetching APIs with Torus.
- Bundled with webpack
- Torus versions checked into `./lib/`
