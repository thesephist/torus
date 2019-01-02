# Torus To-dos

- [-] Make README polished modeled after Preact's Github README. What badges do they use?

- [-] `/samples/slides/` demo

- [ ] Build a JS based fuzzer tool and use it to fuzz jdom -- might be a separate repo project. -- look at examples existing.

- [ ] We need to work on the deploying and to-production story of Torus. Right now, Torus binds to the global (`window`) namespace and has debug statements all throughout. Those should be fixed in a production build. How can we make Torus simple to use as a drop-in script while remaining flexible enough to be bundled properly?

## Demo: Twirl (Trello-like project manager)

- Drag and drop
- Full-stack node application, Torus frontend. Testing sync / data fetching APIs with Torus.
- Bundled with webpack
- Torus versions checked into `./lib/`
