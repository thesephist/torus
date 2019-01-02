# Roadmap

- [-] `/samples/slides/` demo

- [ ] Publish 0.2.0 release on Github.
    - NEW APIs / breaking changes
        - remove callback and passed arguments in lists
        - Names exported under Torus global
    - Fixes
        - Fix bugs around styling -- comma separated selectors
        - Fix bugs that broke the renderer when a raw node or textnode was rendered multiple times
        - Refactored to more easily support concurrent/asynchronous rendering.
        - Improvements to debugging messages on development mode
    - Performance improvements in parsing templates and rendering
    - Typescript type definitions
    - Proper node import / bundling support
    - Bundle size work -- still 4.6kB!

- [ ] Make README polished modeled after Preact's Github README. What badges do they use?

- [ ] Build a JS based fuzzer tool and use it to fuzz jdom -- might be a separate repo project. -- look at examples existing.

## Demo: Twirl (Trello-like project manager)

- Drag and drop
- Full-stack node application, Torus frontend. Testing sync / data fetching APIs with Torus.
- Bundled with webpack
- Torus versions checked into `./lib/`
