//> A 2D graphing calculator in Torus

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
let colorIdx = -1;

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

const randomColor = () => {
    colorIdx = (colorIdx + 1) % COLORS.length;
    return COLORS[colorIdx];
}

const clamp = (val, min, max) => {
    return val > min ? (val < max ? val : max) : min;
}

//> View model that syncs display settings between the graph
//  controls and the graph itself.
class GraphPropsRecord extends Record {

    constructor() {
        //> GPR has centerX, centerY, and zoom properties.
        //  centerX and Y and coordinate values, and zoom
        //  is pixels per unit (i.e. if 20, 20 pixels on canvas
        //  corresponds to one unit in the graph.)
        super({
            centerX: 0,
            centerY: 0,
            zoom: 100, // for some reason a whole number causes graphs to disappear
            resolution: 5, // pixels per sample
            detectAsymptotes: false,
        });
    }

    update(dict) {
        if (dict.zoom !== undefined) {
            dict.zoom = dict.zoom < 10 ? 10 : dict.zoom;
        }
        super.update(dict);
    }

}

class FunctionRecord extends Record {

    constructor(...args) {
        super(...args);
        this.update({
            color: randomColor(),
            hidden: false,
            invalid: false,
        });
    }

    summarize() {
        let invalid = false;
        let fn = () => 0;
        let substitutedText = this.get('text');
        for (const [regex, sub] of Object.entries(NOTATION_SUBSTITUTES)) {
            substitutedText = substitutedText.replace(new RegExp(regex, 'g'), sub);
        }
        try {
            fn = new Function('x', 'return ' + substitutedText);
        } catch (e) {
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

class FunctionStore extends StoreOf(FunctionRecord) {}

class AppBar extends StyledComponent {

    init(functionStore, graphProps) {
        this.functionStore = functionStore;
        this.graphProps = graphProps;

        this.functionList = new FunctionList(this.functionStore);

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
            'justify-content': 'flex=start',
            'align-items': 'center',
            'max-height': 'calc(100vh - 18px)',
            'overflow-y': 'auto',
            'padding': '18px', // so the shadows of each panel aren't clipped
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
                'height': CONTROL_SIZE * 3 + CONTROL_MARGIN * 2 + 'px',
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
            '.panGroup': {
                'height': CONTROL_SIZE * 3 + CONTROL_MARGIN * 2 + 'px',
                'width': CONTROL_SIZE * 3 + CONTROL_MARGIN * 2 + 'px',
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
                    'top': CONTROL_SIZE * 2 + CONTROL_MARGIN * 2 + 'px',
                    'left': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                },
                '.moveRightButton': {
                    'top': CONTROL_SIZE + CONTROL_MARGIN + 'px',
                    'left': CONTROL_SIZE * 2 + CONTROL_MARGIN * 2 + 'px',
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
            '& .newFunctionPanel, & .graphSettings': {
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
                }
            }
        }
    }

    addFunction() {
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
            // scroll by 100px
            centerY: this.record.get('centerY') + 100 / this.record.get('zoom'),
        });
    }

    moveDown() {
        this.record.update({
            // scroll by 100px
            centerY: this.record.get('centerY') - 100 / this.record.get('zoom'),
        });
    }

    moveLeft() {
        this.record.update({
            centerX: this.record.get('centerX') - 100 / this.record.get('zoom'),
        });
    }

    moveRight() {
        this.record.update({
            centerX: this.record.get('centerX') + 100 / this.record.get('zoom'),
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
        this.record.update({
            resolution: this.record.get('resolution') == 5 ? 1 : 5,
        });
    }

    toggleDetectAsymptotes() {
        this.record.update({
            detectAsymptotes: !this.record.get('detectAsymptotes'),
        });
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
                    + New Function
                </button>
            </div>
        </div>`;
    }

}

class FunctionPanel extends StyledComponent {

    init(functionRecord, removeCallback) {
        this.removeCallback = removeCallback;

        this.keyUp = this.keyUp.bind(this);
        this.updateFunctionText = this.updateFunctionText.bind(this);
        this.toggleHidden = this.toggleHidden.bind(this);
        this.updateColor = this.updateColor.bind(this);

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
            '& .inputArea, & .buttonArea': {
                'height': '50%',
                'display': 'flex',
                'flex-direction': 'row',
                'align-items': 'center',
            },
            '.inputArea': {
                'justify-content': 'space-between',
                '& .yPrefix, & input': {
                    'display': 'block',
                    'height': '100%',
                },
                '.yPrefix': {
                    'background': 'rgba(255, 255, 255, 0.4)',
                    'width': '40px',
                    'text-align': 'center',
                    'line-height': HEIGHT / 2 + 'px',
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
                    }
                },
            },
            '.buttonArea': {
                'justify-content': 'flex-end',
            },
            'button': {
                'margin-right': '8px',
                'color': '#fff',
                'height': '24px',
                'line-height': '24px',
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
        if (evt && evt.keyCode === 13) {
            this.updateFunctionText();
        }
    }

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
                    onkeyup="${this.keyUp}" placeholder="log(), sqrt(), abs(), trig supported"/>
            </div>
            <div class="buttonArea">
                <button onclick="${this.removeCallback}">Delete</button>
                <button onclick="${this.toggleHidden}">${props.hidden ? '🙈 Show' : '👀 Hide' }</button>
                <button onclick="${this.updateColor}">🎲 Shuffle color</button>
            </div>
        </div>`;
    }

}

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

class FunctionGraph extends Component {

    init(functionRecord, _removeCallback, graphProps) {
        this.graphProps = graphProps;

        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        this.bind(functionRecord, () => this.redraw());
    }

    redraw() {
        //> Shorthand so I don't have to keep typing `this.context`
        const ctx = this.context;

        const width = this.canvas.width = window.innerWidth;
        const height = this.canvas.height = window.innerHeight;

        //> Clear canvas
        ctx.clearRect(0, 0, width, height);

        const functionSummary = this.record.summarize();
        if (functionSummary.hidden) {
            return;
        } else {
            const graphPropsSummary = this.graphProps.summarize();

            // get properties from graphProps
            const { centerX, centerY, zoom, resolution, detectAsymptotes } = graphPropsSummary;
            const centerXScreen = width / 2;
            const centerYScreen = height / 2;
            const minX = ~~(centerX - centerXScreen / zoom) - 1;
            const maxX = ~~(centerX + centerXScreen / zoom) + 1;
            const minY = ~~(centerY - centerYScreen / zoom) - 1;
            const maxY = ~~(centerY + centerYScreen / zoom) + 1;

            const xToCoord = xValue => {
                return centerXScreen + ((xValue - centerX) * zoom);
            }

            const yToCoord = yValue => {
                return centerYScreen - ((yValue - centerY) * zoom);
            }

            const f = functionSummary.jsFunction;

            //> Re-draw this function
            ctx.lineWidth = 3;
            ctx.strokeStyle = functionSummary.color;
            ctx.beginPath();
            let lastY = 0;
            const increment = resolution / zoom;
            for (let x = minX; x < maxX; x += increment) {
                //> Try to get a non-asymptotic value of y
                let y = f(x);
                //> Graph it.
                if (!isNaN(y)) {
                    //> There's some complexity here to avoid drawing an incorrect line
                    //  through the middle of the screen when asymptotic limits switch signs.
                    const diff = y - lastY;
                    const diffSign = y * lastY < 0;
                    lastY = y;
                    if (detectAsymptotes && Math.abs(diff * zoom) > height && diffSign) {
                        ctx.moveTo(xToCoord(x), yToCoord(clamp(y, minY, maxY)));
                    } else {
                        ctx.lineTo(xToCoord(x), yToCoord(clamp(y, minY, maxY)));
                    }
                }
            }
            ctx.stroke();
        }

    }

    compose() {
        return this.canvas;
    }

}

const GraphCollection = ListOf(FunctionGraph);

class Graph extends StyledComponent {

    init(functionStore, graphProps) {
        this.functionStore = functionStore;
        this.graphProps = graphProps;

        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        this.functionGraphs = new GraphCollection(functionStore, this.graphProps);

        const boundReDraw = this.redraw.bind(this);
        this.redraw = () => requestAnimationFrame(boundReDraw);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMousedown = this.handleMousedown.bind(this);
        this.handleMouseup = this.handleMouseup.bind(this);
        this.handleMousemove = this.handleMousemove.bind(this);
        this.handleTouchstart = this.handleTouchstart.bind(this);
        this.handleTouchend = this.handleTouchend.bind(this);
        this.handleTouchmove = this.handleTouchmove.bind(this);

        window.addEventListener('resize', this.redraw);
        this.bind(this.graphProps, this.redraw);
    }

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

    handleWheel(evt) {
        evt.preventDefault();
        const change = evt.deltaY;
        const scaledChange = Math.max(change / 1000, -.3);
        requestAnimationFrame(() => {
            this.record.update({
                zoom: this.record.get('zoom') * (1 + scaledChange),
            });
        });
    }

    handleMousedown(evt) {
        this._dragging = true;
        document.body.classList.add('graph_dragging');
        this._lastClientX = evt.clientX;
        this._lastClientY = evt.clientY;
    }

    handleMouseup(evt) {
        this._dragging = false;
        document.body.classList.remove('graph_dragging');
    }

    handleMousemove(evt) {
        if (this._dragging) {
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const deltaX = clientX - this._lastClientX;
            const deltaY = clientY - this._lastClientY;

            requestAnimationFrame(() => {
                const props = this.record.summarize();
                this.record.update({
                    centerX: props.centerX - deltaX / props.zoom,
                    centerY: props.centerY + deltaY / props.zoom,
                });
            });

            this._lastClientX = clientX;
            this._lastClientY = clientY;
        }
    }

    handleTouchstart(evt) {
        this._touchDragging = true;
        document.body.classList.add('graph_dragging');
        this._lastClientX = evt.touches[0].clientX;
        this._lastClientY = evt.touches[0].clientY;
    }

    handleTouchend(evt) {
        this._touchDragging = false;
        document.body.classList.remove('graph_dragging');
    }

    handleTouchmove(evt) {
        if (this._touchDragging) {
            const clientX = evt.touches[0].clientX;
            const clientY = evt.touches[0].clientY;
            const deltaX = clientX - this._lastClientX;
            const deltaY = clientY - this._lastClientY;

            requestAnimationFrame(() => {
                const props = this.record.summarize();
                this.record.update({
                    centerX: props.centerX - deltaX / props.zoom,
                    centerY: props.centerY + deltaY / props.zoom,
                });
            });

            this._lastClientX = clientX;
            this._lastClientY = clientY;
        }
    }

    redraw() {
        const graphPropsSummary = this.graphProps.summarize();
        //> Called when functions are added or removed from canvas.
        //  Should probably re-draw the entire graph surface when any
        //  functions are added and removed.
        const width = this.canvas.width = window.innerWidth;
        const height = this.canvas.height = window.innerHeight;

        //> Shorthand so I don't have to keep typing `this.context`
        const ctx = this.context;

        //> Clear canvas
        ctx.clearRect(0, 0, width, height);

        // get properties from graphProps
        const {centerX, centerY, zoom, resolution} = graphPropsSummary;
        const centerXScreen = width / 2;
        const centerYScreen = height / 2;
        const minX = ~~(centerX - centerXScreen / zoom) - 1;
        const maxX = ~~(centerX + centerXScreen / zoom) + 1;
        const minY = ~~(centerY - centerYScreen / zoom) - 1;
        const maxY = ~~(centerY + centerYScreen / zoom) + 1;

        const xToCoord = xValue => {
            return centerXScreen + ((xValue - centerX) * zoom);
        }

        const yToCoord = yValue => {
            return centerYScreen - ((yValue - centerY) * zoom);
        }

        //> Draw the horizontal grid lines
        ctx.strokeStyle = '#aaa';
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
        ctx.stroke();

        //> Draw the zero axes
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        // y = 0
        ctx.moveTo(xToCoord(minX), yToCoord(0));
        ctx.lineTo(xToCoord(maxX), yToCoord(0));
        // x = 0
        ctx.moveTo(xToCoord(0), yToCoord(minY));
        ctx.lineTo(xToCoord(0), yToCoord(maxY));
        ctx.stroke();

        ctx.lineWidth = 2;

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#555';
        ctx.fillText('(0, 0)', xToCoord(0) + 5, yToCoord(0) + 16);
        ctx.fillText('(1, 0)', xToCoord(1) + 5, yToCoord(0) + 16);
        ctx.fillText('(0, 1)', xToCoord(0) + 5, yToCoord(1) + 16);
        ctx.fillText('(10, 0)', xToCoord(10) + 5, yToCoord(0) + 16);
        ctx.fillText('(0, 10)', xToCoord(0) + 5, yToCoord(10) + 16);
        ctx.fillText('(-10, 0)', xToCoord(-10) + 5, yToCoord(0) + 16);
        ctx.fillText('(0, -10)', xToCoord(0) + 5, yToCoord(-10) + 16);
        ctx.fillText('(50, 0)', xToCoord(50) + 5, yToCoord(0) + 16);
        ctx.fillText('(0, 50)', xToCoord(0) + 5, yToCoord(50) + 16);
        ctx.fillText('(-50, 0)', xToCoord(-50) + 5, yToCoord(0) + 16);
        ctx.fillText('(0, -50)', xToCoord(0) + 5, yToCoord(-50) + 16);

        for (const graph of this.functionGraphs.components) {
            graph.redraw();
        }
    }

    compose() {
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

class App extends StyledComponent {

    init() {
        //> Create our main collection of functions
        this.functionStore = new FunctionStore([
            //> Default, example function
            new FunctionRecord({ text: 'x + 1' }),
            new FunctionRecord({ text: 'x * x' }),
            new FunctionRecord({ text: 'sqrt(x)' }),
            new FunctionRecord({ text: '1 / x' }),
            new FunctionRecord({ text: '2.71828 ^ x * sin(5 * x) / 20' }),
        ]);
        this.graphProps = new GraphPropsRecord();
        //> Create nested components
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
document.body.style.backgroundColor = '#fbfbfb';
