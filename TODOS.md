# Torus To-dos

- [-] `/samples/slides/` demo

- [-] We need to work on the deploying and to-production story of Torus. Right now, Torus binds to the global (`window`) namespace and has debug statements all throughout.
    - Torus should expose a single `Torus` global that wraps the individual components Fix this in all samples and tests.

- [ ] Make README polished modeled after Preact's Github README. What badges do they use?
    - Update to include the new bundling style / import / usage from NPM.

- [ ] Build a JS based fuzzer tool and use it to fuzz jdom -- might be a separate repo project. -- look at examples existing.

## Demo: Twirl (Trello-like project manager)

- Drag and drop
- Full-stack node application, Torus frontend. Testing sync / data fetching APIs with Torus.
- Bundled with webpack
- Torus versions checked into `./lib/`
