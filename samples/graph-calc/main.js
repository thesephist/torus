//> A 2D graphing calculator built with Torus

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> A swatch of colors with enough contrast to be used for graphs and
//  graph panels in the overlay sidebar.
const COLORS = [
    '#e05252',
    '#685ebb',
    '#649c41',
    '#ab589d',
    '#d08b36',
    '#209e9e',
    '#726f84',
    '#58384e',
];
//> We select colors by just cycling through the list, starting with the 0th one.
let colorIdx = -1;

//> We evaluate user input as functions by transforming them into executable
//  JavaScript functions with the `new Function()` constructor. Traditionally,
//  we'd discourage this because running this with untrusted strings is a security risk.
//  But since all inputs here are coming directly from the user's input field, it's ok.
//  This allows us to easily support a rich array of mathematical notations,
//  and here's a simple substitution list so rather than writing `Math.tan(x)` in the
//  input field in the app, which would be weird, we can just write `tan(x)`.
const NOTATION_SUBSTITUTES = {
    'abs': 'Math.abs',
    'sqrt': 'Math.sqrt',
    'log': 'Math.log',
    'tan': 'Math.tan',
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    '\\^': '**',
    'PI': 'Math.PI',
}

//> To get the next color from the swatch, just increment the counter
//  and get the item from the array of colors.
const randomColor = () => {
    colorIdx = (colorIdx + 1) % COLORS.length;
    return COLORS[colorIdx];
}

//> "clamp" a given value to the min and max, so that numbers are
//  bounded by the min/max ranges no matter how big or small, but reflect their
//  true values within the range. This is necessary because, as an optimization,
//  modern browsers don't render lines that are far outside of `<canvas>` viewports.
//  But large graphs can explode in range, so rather than asking the browser to render,
//  say, `(2, 300000)` and having it ignore the command because it's outside of the
//  visible area, we clamp the y-values to the window's width and height areas
//  so they're reasonably close to the visible area and browsers display large values correctly.
const clamp = (val, min, max) => {
    if (val > min) {
        return val < max ? val : max;
    } else {
        return min;
    }
}

//> View model that syncs display settings between the graph
//  controls and the graph itself. This record keeps track of all data about
//  panning/zooming around the graph, and display settings like `resolution` and whether
//  we try to detect and auto-fix vertical asymptotes.
class GraphPropsRecord extends Record {

    constructor() {
        //> `GraphPropsRecord` has centerX, centerY, and zoom properties.
        //  centerX and Y and coordinate values, and zoom
        //  is pixels per unit (i.e. if 20, 20 pixels on canvas
        //  corresponds to one unit in the graph.) We initialize this record
        //  with some default values.
        super({
            centerX: 0,
            centerY: 0,
            zoom: 100,
            //> The units for this is "pixels per sample". i.e. If it's 5,
            //  we'll compute a new value every 5 pixels on the x-axis
            //  and connect the dots.
            resolution: 5,
            //> If this is set to true, we can try to detect large swings across
            //  the y = 0 line and not draw those lines.
            detectAsymptotes: false,
        });
    }

    //> We override the behavior of `Record#update()` so we enforce an upper limit
    //  of zoom level. Otherwise, graphs start to break meaninglessly.
    update(dict) {
        if (dict.zoom !== undefined) {
            dict.zoom = dict.zoom < 10 ? 10 : dict.zoom;
        }
        super.update(dict);
    }

    //> In "high performance" mode, we render a y-value for every single pixel along
    //  the width of the screen. On slower devices this _might_ be an issue with many
    //  functions, though I haven't found any issues yet. This toggles whether we do that,
    //  or just render every 5 pixels like normal.
    toggleHighPerf() {
        this.update({
            resolution: this.get('resolution') === 5 ? 1 : 5,
        });
    }

    toggleDetectAsymptotes() {
        this.update({
            detectAsymptotes: !this.get('detectAsymptotes'),
        });
    }

}

//> This represents a single function the user defines, to be drawn
//  in the graph region.
class FunctionRecord extends Record {

    constructor(...args) {
        super(...args);
        //> By default, functions have a random color, are not hidden, and are not invalid.
        this.update({
            color: randomColor(),
            hidden: false,
            //> `invalid` means the user input was not a valid, computable function.
            invalid: false,
        });
    }

    //> We override this so we can inject two extra values: `jsFunction`, which is a runnable
    //  JavaScript function object that does `f(x) -> y` computation, and `invalid`, which is explained above.
    summarize() {
        let invalid = false;
        let fn = () => 0;
        let substitutedText = this.get('text');
        //> We make the substitutions for things like `sin(x) -> Math.sin(x)` so the JavaScript
        //  engine can run it like normal JS functions.
        for (const [regex, sub] of Object.entries(NOTATION_SUBSTITUTES)) {
            substitutedText = substitutedText.replace(new RegExp(regex, 'g'), sub);
        }
        try {
            //> We try to construct a function that computes the given operation, as a
            //  JavaScript function object.
            fn = new Function('x', 'return ' + substitutedText);
        } catch (e) {
            //> If it fails, the user input is invalid.
            invalid = true;
        }
        return Object.assign(
            super.summarize(),
            {
                jsFunction: fn,
                invalid: invalid,
            },
        );
    }

}

//> This represents a collection of functions, i.e. the list in the overlay panel
//  we see in the UI.
class FunctionStore extends StoreOf(FunctionRecord) {}

//> The `AppBar` is the overlay panel that contains all UI about functions and graph controls.
class AppBar extends StyledComponent {

    init(functionStore, graphProps) {
        this.functionStore = functionStore;
        this.graphProps = graphProps;

        //> We create a new list view to hold panels of function controls.
        this.functionList = new FunctionList(this.functionStore, functionStore);

        //> There are a bunch of methods here that we need to bind, so we can call them
        //  as event listeners in our render step.
        this.addFunction = this.addFunction.bind(this);
        this.resetGraphProps = this.resetGraphProps.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveDown = this.moveDown.bind(this);
        this.moveLeft = this.moveLeft.bind(this);
        this.moveRight = this.moveRight.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.toggleHighPerfMode = this.toggleHighPerfMode.bind(this);
        this.toggleDetectAsymptotes = this.toggleDetectAsymptotes.bind(this);

        //> We want to reference graphProps with `this.records`, but
        //  when props on it updates, we don't really need to re-render.
        //  So we don't, for performance reasons.
        this.bind(graphProps, () => {});
    }

    styles() {
        const CONTROL_SIZE = 34;
        const CONTROL_MARGIN = 4;
        return {
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '320px',
            'display': 'flex',
            'flex-direction': 'column',
            'justify-content': 'flex-start',
            'align-items': 'center',
            'max-height': 'calc(100vh - 18px)',
            'overflow-y': 'auto',
            'padding': '18px',
            'body.graph_dragging &': {
                'pointer-events': 'none',
            },
            '.graphSettings': {
                'padding': '8px',
            },
            'label': {
                'font-size': '14px',
            },
            '.title': {
                'font-weight': 'bold',
                'font-size': '20px',
                'margin-bottom': '12px',
            },
            '.inputGroup': {
                'margin-top': '12px',
            },
            '.controlGroup': {
                'display': 'flex',
                'flex-direction': 'row',
                'justify-content': 'space-around',
                'align-items': 'center',
                'height': (CONTROL_SIZE * 3) + (CONTROL_MARGIN * 2) + 'px',
                'button': {
                    'background': '#fff',
                    'border-radius': '6px',
                    'border': '2px solid #aaa',
                    'font-size': '18px',
                    'text-align': 'center',
                    'box-sizing': 'border-box',
                    'height': CONTROL_SIZE + 'px',
                    'width': CONTROL_SIZE + 'px',
                    'padding': '0',
                    'cursor': 'pointer',
                    'transition': 'transform .2s',
                    '&:hover': {
                        'transform': 'scale(1.1)',
                    },
                },
            },
            //> In the `.panGroup` container, we try to arrange the panning
            //  buttons (for moving around the graph) in a cross shape
            //  using absolute position coordinates.
            '.panGroup': {
                'height': (CONTROL_SIZE * 3) + (CONTROL_MARGIN * 2) + 'px',
                'width': (CONTROL_SIZE * 3) + (CONTROL_MARGIN * 2) + 'px',
                'position': 'relative',
                'button': {
                    'position': 'absolute',
                    'display': 'block',
                },
                '.moveUpButton': {
                    'top': 0,
                    'left': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                },
                '.moveDownButton': {
                    'top': (CONTROL_SIZE * 2) + (CONTROL_MARGIN * 2) + 'px',
                    'left': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                },
                '.moveRightButton': {
                    'top': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                    'left': (CONTROL_SIZE * 2) + (CONTROL_MARGIN * 2) + 'px',
                },
                '.moveLeftButton': {
                    'top': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                    'left': '0px',
                },
            },
            '.zoomGroup': {
                'display': 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'space-between',
                'height': '100%',
            },
            '.resetGroup': {
                'button': {
                    'font-size': '14px',
                    'width': '60px',
                },
            },
            '.toggleInput': {
                'margin-right': '8px',
            },
            '.panel': {
                'flex-shrink': '0',
                'width': '100%',
                'margin-bottom': '18px',
                'border-radius': '8px',
                'overflow': 'hidden',
                'box-shadow': '0 2px 8px -1px rgba(0, 0, 0, .3)',
                'min-height': '36px',
                'box-sizing': 'border-box',
            },
            '.newFunctionPanel, .graphSettings': {
                'background': '#fff',
            },
            '.newFunctionPanel': {
                'transition': 'transform .2s',
                'button': {
                    'height': '100%',
                    'width': '100%',
                    'font-size': '16px',
                    'line-height': '36px',
                    'text-align': 'left',
                    'border': 0,
                    'cursor': 'pointer',
                    'background': 'transparent',
                },
                '&:hover': {
                    'background': '#f8f8f8',
                    'transform': 'translateY(2px)',
                },
            },
        }
    }

    addFunction() {
        //> By default, we create the function _f(x) = x_.
        this.functionStore.create({
            text: 'x',
        });
    }

    resetGraphProps() {
        this.record.update({
            centerX: 0,
            centerY: 0,
            zoom: 100,
        });
    }

    moveUp() {
        this.record.update({
            centerY: this.record.get('centerY') + (100 / this.record.get('zoom')),
        });
    }

    moveDown() {
        this.record.update({
            centerY: this.record.get('centerY') - (100 / this.record.get('zoom')),
        });
    }

    moveLeft() {
        this.record.update({
            centerX: this.record.get('centerX') - (100 / this.record.get('zoom')),
        });
    }

    moveRight() {
        this.record.update({
            centerX: this.record.get('centerX') + (100 / this.record.get('zoom')),
        });
    }

    zoomIn() {
        this.record.update({
            zoom: this.record.get('zoom') * 1.2,
        });
    }

    zoomOut() {
        this.record.update({
            zoom: this.record.get('zoom') / 1.2,
        });
    }

    toggleHighPerfMode() {
        this.record.toggleHighPerf();
    }

    toggleDetectAsymptotes() {
        this.record.toggleDetectAsymptotes();
    }

    compose() {
        return jdom`<div class="appBar">
            <div class="panel graphSettings">
                <div class="title">
                    Graphing Calculator 📈
                </div>
                <div class="inputGroup controlGroup">
                    <div class="panGroup">
                        <button class="moveUpButton" onclick="${this.moveUp}">☝️</button>
                        <button class="moveDownButton" onclick="${this.moveDown}">👇</button>
                        <button class="moveLeftButton" onclick="${this.moveLeft}">👈</button>
                        <button class="moveRightButton" onclick="${this.moveRight}">👉</button>
                    </div>
                    <div class="resetGroup">
                        <button class="resetButton" onclick="${this.resetGraphProps}">Reset</button>
                    </div>
                    <div class="zoomGroup">
                        <button class="zoomInButton" onclick="${this.zoomIn}">🔍</button>
                        <button class="zoomOutButton" onclick="${this.zoomOut}">🔭</button>
                    </div>
                </div>
                <div class="inputGroup">
                    <input class="toggleInput" id="higherPerfCheck" type="checkbox" onchange="${this.toggleHighPerfMode}" />
                    <label for="higherPerfCheck">More accurate graphs (might be slower)</label>
                </div>
                <div class="inputGroup">
                    <input class="toggleInput" id="detectAsymptotes" type="checkbox" onchange="${this.toggleDetectAsymptotes}" />
                    <label for="detectAsymptotes">Try to detect &#38; fix vertical asymptotes</label>
                </div>
            </div>
            ${this.functionList.node}
            <div class="panel newFunctionPanel">
                <button class="newFunctionButton" onclick="${this.addFunction}">
                    + Add another function
                </button>
            </div>
        </div>`;
    }

}

//> This represents a single function list item in the overlay sidebar
class FunctionPanel extends StyledComponent {

    //> Since this is a `List` item, it's given two arguments, the first
    //  the record for this component, and the second a callback to remove
    //  the item from the list. We'll store the latter as a property.
    init(functionRecord, removeCallback, functionStore) {
        this.removeCallback = removeCallback;
        this.functionStore = functionStore;

        this.keyUp = this.keyUp.bind(this);
        this.updateFunctionText = this.updateFunctionText.bind(this);
        this.toggleHidden = this.toggleHidden.bind(this);
        this.duplicate = this.duplicate.bind(this);
        this.updateColor = this.updateColor.bind(this);

        //> We want to re-render this component every time something about
        //  the function changes.
        this.bind(functionRecord, props => this.render(props));
    }

    styles(props) {
        const HEIGHT = 72;
        return {
            'height': HEIGHT + 'px',
            'background': props.color,
            '&.hidden': {
                'opacity': '.45',
            },
            '.caps': {
                'text-transform': 'uppercase',
            },
            '.inputArea, .buttonArea': {
                'height': '50%',
                'display': 'flex',
                'flex-direction': 'row',
                'align-items': 'center',
            },
            '.inputArea': {
                'justify-content': 'space-between',
                '.yPrefix, input': {
                    'display': 'block',
                    'height': '100%',
                },
                '.yPrefix': {
                    'background': 'rgba(255, 255, 255, 0.4)',
                    'width': '40px',
                    'text-align': 'center',
                    'line-height': (HEIGHT / 2) + 'px',
                    'color': '#fff',
                },
                'input': {
                    'flex-grow': '1',
                    'margin': 0,
                    'border-radius': 0,
                    'box-sizing': 'border-box',
                    'padding': '4px 6px',
                    'font-size': '16px',
                    'border': 0,
                    '&:focus': {
                        'background': 'rgba(255, 255, 255, .9)',
                        'outline': 'none',
                    },
                    '&::placeholder': {
                        'color': '#aaa',
                    },
                    '&.invalid': {
                        'box-shadow': 'inset 0 0 0 3px rgba(208, 83, 55, 0.6)',
                        'background': '#eccfcf',
                    },
                },
            },
            '.buttonArea': {
                'justify-content': 'flex-end',
            },
            'button': {
                'margin-right': '6px',
                'color': '#fff',
                'height': '24px',
                'line-height': '22px',
                'background-color': 'rgba(255, 255, 255, 0.4)',
                'font-size': '14px',
                'border-radius': '4px',
                'border': 0,
                'cursor': 'pointer',
                '&:hover': {
                    'background': '#fff',
                    'color': props.color,
                },
            },
        }
    }

    keyUp(evt) {
        if (evt && evt.key === 'Enter') {
            this.updateFunctionText();
        }
    }

    //> This component is not a controlled component, because it doesn't need to be,
    //  and for sake of performance. So when we do need to update the value of the function,
    //  we grab the input from the text field manually, and update the record.
    updateFunctionText() {
        const text = this.node.querySelector('input').value;
        this.record.update({
            text: text,
        });
    }

    toggleHidden() {
        this.record.update({
            hidden: !this.record.get('hidden'),
        });
    }

    duplicate() {
        this.functionStore.create({
            text: this.record.get('text'),
        });
    }

    updateColor() {
        this.record.update({
            color: randomColor(),
        });
    }

    compose(props) {
        return jdom`<div class="panel functionPanel ${props.hidden ? 'hidden' : ''}">
            <div class="inputArea">
                <div class="yPrefix">y =</div>
                <input type="text" value="${props.text}" onblur="${this.updateFunctionText}"
                    onkeyup="${this.keyUp}" placeholder="log(), sqrt(), abs(), trig supported"
                    class="${props.invalid ? 'invalid' : ''}" />
            </div>
            <div class="buttonArea">
                <button onclick="${this.removeCallback}">Delete</button>
                <button onclick="${this.toggleHidden}">${props.hidden ? '🙈 Show' : '👀 Hide'}</button>
                <button onclick="${this.duplicate}">Duplicate</button>
                <button onclick="${this.updateColor}">🎨 Color</button>
            </div>
        </div>`;
    }

}

//> List class that wraps around a collection (Store) of functions.
//  We override this so rather than using `<ul>`s we use `<div>`s.
class FunctionList extends Styled(ListOf(FunctionPanel)) {

    styles() {
        return {
            'width': '100%',
        }
    }

    compose() {
        return jdom`<div>${this.nodes}</div>`;
    }

}

//> This component represents a single graph -- just the curve connecting the y-values.
//  These are then collected into a `GraphCollection` component,
//  which is a `List` that contains multiple canvas elements, one for each
//  function graph. Because canvases are transparent, we can just stack
//  `FunctionGraph`s on top of each other to render the whole, final graph.
class FunctionGraph extends Component {

    //> In addition to the normal arguments, we also get passed down
    //  the graph configs, so we can render the function graphs properly.
    init(functionRecord, _removeCallback, graphProps) {
        this.graphProps = graphProps;

        //> Create a new canvas for this graph and get the 2D drawing context.
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        //> We want to re-draw just this function on the canvas
        //  when anything about the function changes.
        this.bind(functionRecord, () => this.redraw());
    }

    //> Method to wipe and re-draw the function's graph
    //  on the canvas.
    redraw() {
        //> Shorthand so I don't have to keep typing `this.context`
        const ctx = this.context;

        //> We get the window's height and width and make sure our canvas
        //  is sized to fit.
        const width = this.canvas.width = window.innerWidth;
        const height = this.canvas.height = window.innerHeight;

        //> Clear canvas
        ctx.clearRect(0, 0, width, height);

        const functionSummary = this.record.summarize();
        //> If the function is hidden, we don't need to do anything after
        //  clearing the canvas.
        if (functionSummary.hidden) {
            return;
        } else {
            const graphPropsSummary = this.graphProps.summarize();

            //> Destructure properties from graphProps
            const {centerX, centerY, zoom, resolution, detectAsymptotes} = graphPropsSummary;
            const centerXScreen = width / 2;
            const centerYScreen = height / 2;
            //> These values represent min/max values _on the graph_, and help us
            //  determine which x- and y-values we need to worry about computing.
            const minX = ~~(centerX - (centerXScreen / zoom)) - 1;
            const maxX = ~~(centerX + (centerXScreen / zoom)) + 1;
            const minY = ~~(centerY - (centerYScreen / zoom)) - 1;
            const maxY = ~~(centerY + (centerYScreen / zoom)) + 1;

            //> Pair of short functions that map x/y values to their
            //  position on the canvas.
            const xToCoord = xValue => {
                return centerXScreen + ((xValue - centerX) * zoom);
            }
            const yToCoord = yValue => {
                return centerYScreen - ((yValue - centerY) * zoom);
            }

            //> This is the function we need to run on each x-value.
            const f = functionSummary.jsFunction;

            //> Re-draw this function
            ctx.lineWidth = 3;
            //> We want to draw the function graph with the function's color
            ctx.strokeStyle = functionSummary.color;
            ctx.beginPath();
            //> We keep track of the last y value computed, to do potential
            //  asymptote detection
            let lastY = 0;
            const increment = resolution / zoom;
            for (let x = minX; x < maxX; x += increment) {
                //> Try to get a non-asymptotic value of y
                const y = f(x);
                //> Graph it.
                if (!isNaN(y)) {
                    //> There's some complexity here to avoid drawing an incorrect line
                    //  through the middle of the screen when asymptotic limits switch signs.
                    //  Essentially, we consider an asymptote any short increment in X that
                    //  results in a y value that jumps across the y = 0 line, and from
                    //  the bottom of the screen to the top of the screen (`> height`).
                    const diff = y - lastY;
                    const diffSign = y * lastY < 0;
                    lastY = y;
                    if (detectAsymptotes && Math.abs(diff * zoom) > height && diffSign) {
                        //> If there is an asymptote as we've defined it, don't connect from
                        //  the previous point; just go to a new point.
                        ctx.moveTo(xToCoord(x), yToCoord(clamp(y, minY, maxY)));
                    } else {
                        //> Otherwise, connect the line from the previous point.
                        ctx.lineTo(xToCoord(x), yToCoord(clamp(y, minY, maxY)));
                    }
                }
            }
            //> Commit the curve we've just defined to the canvas.
            ctx.stroke();
        }

    }

    //> When we render this component, we just render the canvas element we
    //  keep drawing to.
    compose() {
        return this.canvas;
    }

}

//> `<ul>` of all the functions' canvases.
const GraphCollection = ListOf(FunctionGraph);

//> The `Graph` component holds the graph grid, and manages the rest of the
//  functions' graphs in a `GraphCollection` under it.
class Graph extends StyledComponent {

    init(functionStore, graphProps) {
        this.functionStore = functionStore;
        this.graphProps = graphProps;

        //> Create a canvas for the grid, and get the 2D drawing context.
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        //> Given a collection of functions, create a list of views that
        //  each render their function to their own canvas.
        this.functionGraphs = new GraphCollection(functionStore, this.graphProps);

        //> We bind `redraw` a bit differently than normal here because we want to be
        //  efficient about when we re-render the entire graph from scratch. We really
        //  only ever need to do it once per frame, before the frame is painted. So
        //  we use `requestAnimationFrame()`.
        const boundReDraw = this.redraw.bind(this);
        this.redraw = () => requestAnimationFrame(boundReDraw);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMousedown = this.handleMousedown.bind(this);
        this.handleMouseup = this.handleMouseup.bind(this);
        this.handleMousemove = this.handleMousemove.bind(this);
        this.handleTouchstart = this.handleTouchstart.bind(this);
        this.handleTouchend = this.handleTouchend.bind(this);
        this.handleTouchmove = this.handleTouchmove.bind(this);

        //> When the window is resized, we want to re-draw the graph to fit.
        window.addEventListener('resize', this.redraw);
        //> When anything about the graph settings are updated, we want to re-draw.
        this.bind(this.graphProps, this.redraw);
    }

    //> Make sure to remove the event listener we bound earlier, if we ever remove this component.
    remove() {
        window.removeEventListener('resize', this.redraw);
    }

    styles() {
        return {
            'position': 'fixed',
            'z-index': '-1',
            'top': '0',
            'left': '0',
            'right': '0',
            'bottom': '0',
            'cursor': 'grab',
            '&:active': {
                'cursor': 'grabbing',
            },
            'canvas': {
                'position': 'absolute',
                'top': '0',
                'left': '0',
                'right': '0',
                'bottom': '0',
            },
        }
    }

    //> When the mouse scroll wheel scrolls on the page,
    //  we want to zoom in or out depending on the scroll direction.
    //  We also throttle this with `requestAnimationFrame` to be
    //  efficient about how much we re-render the graph, and when.
    handleWheel(evt) {
        //> Prevent overscroll spring behavior on macOS
        evt.preventDefault();
        const change = evt.deltaY;
        const scaledChange = Math.max(change / 1000, -.3);
        requestAnimationFrame(() => {
            this.record.update({
                zoom: this.record.get('zoom') * (1 + scaledChange),
            });
        });
    }

    //> The next three functions are a standard drag-and-drop implementation
    //  for mouse events. We mark the starting position when we start dragging...
    handleMousedown(evt) {
        this._dragging = true;
        //> When we set this flag, the overlay sidebar becomes
        //  invisible to pointer events, so the graph receives all the mouse
        //  actions and the sidebar can't block it all of a sudden.
        document.body.classList.add('graph_dragging');
        this._lastClientX = evt.clientX;
        this._lastClientY = evt.clientY;
    }

    //> ... and set the flag to false when we stop ...
    handleMouseup() {
        this._dragging = false;
        document.body.classList.remove('graph_dragging');
    }

    //> ... and in between, anytime there's mouse movement over the graph,
    //  we compute how much distance changed between the initial click down
    //  and now, and pan the graph by that amount, again throttled by
    //  `requestAnimationFrame()` to be efficient about when we redraw.
    handleMousemove(evt) {
        evt.preventDefault();
        if (this._dragging) {
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const deltaX = clientX - this._lastClientX;
            const deltaY = clientY - this._lastClientY;

            requestAnimationFrame(() => {
                const props = this.record.summarize();
                this.record.update({
                    centerX: props.centerX - (deltaX / props.zoom),
                    centerY: props.centerY + (deltaY / props.zoom),
                });
            });

            this._lastClientX = clientX;
            this._lastClientY = clientY;
        }
    }

    //> The next three functions are the same as the drag-and-drop code above,
    //  but for touch events on things like Windows laptops and iPad.
    handleTouchstart(evt) {
        this._touchDragging = true;
        document.body.classList.add('graph_dragging');
        this._lastClientX = evt.touches[0].clientX;
        this._lastClientY = evt.touches[0].clientY;
    }

    handleTouchend() {
        this._touchDragging = false;
        document.body.classList.remove('graph_dragging');
    }

    handleTouchmove(evt) {
        evt.preventDefault();
        if (this._touchDragging) {
            const clientX = evt.touches[0].clientX;
            const clientY = evt.touches[0].clientY;
            const deltaX = clientX - this._lastClientX;
            const deltaY = clientY - this._lastClientY;

            requestAnimationFrame(() => {
                const props = this.record.summarize();
                this.record.update({
                    centerX: props.centerX - (deltaX / props.zoom),
                    centerY: props.centerY + (deltaY / props.zoom),
                });
            });

            this._lastClientX = clientX;
            this._lastClientY = clientY;
        }
    }

    //> Re-draw the entire graph, including all the grid lines and coordinate numbers.
    redraw() {
        const graphPropsSummary = this.graphProps.summarize();
        const width = this.canvas.width = window.innerWidth;
        const height = this.canvas.height = window.innerHeight;

        //> Shorthand so I don't have to keep typing `this.context`
        const ctx = this.context;

        //> Clear canvas
        ctx.clearRect(0, 0, width, height);

        //> Destructure properties that matter from the graph settings
        const {centerX, centerY, zoom} = graphPropsSummary;
        const centerXScreen = width / 2;
        const centerYScreen = height / 2;
        const minX = ~~(centerX - (centerXScreen / zoom)) - 1;
        const maxX = ~~(centerX + (centerXScreen / zoom)) + 1;
        const minY = ~~(centerY - (centerYScreen / zoom)) - 1;
        const maxY = ~~(centerY + (centerYScreen / zoom)) + 1;

        //> Much of this is same as above, in `FunctionGraph`'s rendering code.
        const xToCoord = xValue => {
            return centerXScreen + ((xValue - centerX) * zoom);
        }
        const yToCoord = yValue => {
            return centerYScreen - ((yValue - centerY) * zoom);
        }

        //> Draw the horizontal grid lines
        ctx.strokeStyle = '#aaa'; // dark grey
        ctx.beginPath();
        for (let y = minY; y < maxY; y ++) {
            ctx.moveTo(xToCoord(minX), yToCoord(y));
            ctx.lineTo(xToCoord(maxX), yToCoord(y));
        }
        //> Draw the vertical grid lines
        for (let x = minX; x < maxX; x ++) {
            ctx.moveTo(xToCoord(x), yToCoord(minY));
            ctx.lineTo(xToCoord(x), yToCoord(maxY));
        }
        //> Commit the lines to the canvas
        ctx.stroke();

        //> Draw the zero axes, a bit bolder and thicker than the others.
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        //> The y = 0 line
        ctx.moveTo(xToCoord(minX), yToCoord(0));
        ctx.lineTo(xToCoord(maxX), yToCoord(0));
        // The x = 0 line
        ctx.moveTo(xToCoord(0), yToCoord(minY));
        ctx.lineTo(xToCoord(0), yToCoord(maxY));
        ctx.stroke();

        ctx.lineWidth = 2;

        //> We mark some key coordinates on the graph to orient the user.
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#555';
        const markCoord = (x, y) => {
            ctx.fillText(`(${x}, ${y})`, xToCoord(x) + 5, yToCoord(y) + 18);
        }
        markCoord(0, 0);
        markCoord(1, 0);
        markCoord(0, 1);
        markCoord(10, 0);
        markCoord(0, 10);
        markCoord(-10, 0);
        markCoord(0, -10);
        markCoord(50, 0);
        markCoord(0, 50);
        markCoord(-50, 0);
        markCoord(0, -50);

        //> Since this redraw method is called when the window is resized, for example,
        //  we want to tell each graph to also re-render.
        for (const graph of this.functionGraphs.components) {
            graph.redraw();
        }
    }

    compose() {
        //> Bind all the drag-and-drop listeners to the parent container
        //  of all the canvas (graph) elements.
        return jdom`<div id="graphContainer"
            onwheel="${this.handleWheel}"
            onmousedown="${this.handleMousedown}"
            onmouseup="${this.handleMouseup}"
            onmousemove="${this.handleMousemove}"
            ontouchstart="${this.handleTouchstart}"
            ontouchend="${this.handleTouchend}"
            ontouchmove="${this.handleTouchmove}">
            ${this.canvas}
            ${this.functionGraphs.node}
        </div>`;
    }

}

//> The app's root component, also holds all global data.
class App extends StyledComponent {

    init() {
        //> Create our main collection of functions
        this.functionStore = new FunctionStore([
            //> Default, example functions
            new FunctionRecord({text: 'x + 1'}),
            new FunctionRecord({text: 'x * x'}),
            new FunctionRecord({text: 'sqrt(x)'}),
            new FunctionRecord({text: '1 / x'}),
            new FunctionRecord({text: '2.71828 ^ x * sin(5 * x) / 20'}),
        ]);
        //> Create a record to keep graph settings, and sync updates
        //  across the UI.
        this.graphProps = new GraphPropsRecord();
        //> Create nested components: the sidebar overlay, and the graph
        this.appBar = new AppBar(this.functionStore, this.graphProps);
        this.graph = new Graph(this.functionStore, this.graphProps);
    }

    styles() {
        return {
            'font-family': '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            'footer': {
                'position': 'fixed',
                'right': '0',
                'bottom': '0',
                'padding': '6px 8px',
                'color': '#333',
                'opacity': '.5',
                'font-size': '14px',
                'cursor': 'pointer',
                'transition': 'opacity .2s',
                'a': {
                    'color': '#333',
                },
                '&:hover': {
                    'opacity': '.8',
                },
            },
        }
    }

    //> The app itself is pretty simple: the overlay in an overlay container,
    //  and the graph below it.
    compose() {
        return jdom`<main>
            <div class="overlay">
                ${this.appBar.node}
            </div>
            ${this.graph.node}
            <footer>
                Built with
                <a href="https://linus.zone/torus" target="_blank" rel="noopener">Torus</a>
                by <a href="https://linus.zone/now" target="_blank" rel="noopener">Linus</a>
            </footer>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
//> I like it when the page background isn't completely white. This is an off-white
//  shade of very light grey;
document.body.style.backgroundColor = '#fbfbfb';
