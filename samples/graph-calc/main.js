//> A 2D graphing calculator in Torus

const COLORS = [
    'blue',
    'green',
    'red',
    'purple',
    'brown',
];
let colorIdx = 0;

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
            zoom: 100,
            resolution: 10, // pixels per sample
        });
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
    }

    styles() {
        return {
            'font-family': '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            'h1': {
                'font-weight': 'normal',
            },
        }
    }

    addFunction() {
        this.functionStore.create({
            text: 'x',
        });
    }

    compose() {
        return jdom`<div class="appBar">
            <div class="panel">
                <h1>Torus Graphing Calculator</h1>
                <button class="closeButton">Close</button>
            </div>
            <div class="panel graphSettings">
                <div class="inputGroup">
                    <label>Center X</label>
                    <input type="number" value="0" />
                </div>
                <div class="inputGroup">
                    <label>Center Y</label>
                    <input type="number" value="0" />
                </div>
                <div class="inputGroup">
                    <label>Zoom</label>
                    <input type="number" value="0" />
                </div>
            </div>
            ${this.functionList.node}
            <div class="panel">
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

        this.bind(functionRecord, props => this.render(props));
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

    compose(props) {
        return jdom`<div class="panel">
            <div class="inputArea">
                <div class="yPrefix">y =</div>
                <input type="text" value="${props.text}" onblur="${this.updateFunctionText}" onkeyup="${this.keyUp}"/>
            </div>
            <div class="buttonArea">
                <button onclick="${this.removeCallback}">Close</button>
                <button onclick="${this.toggleHidden}">${props.hidden ? 'Show' : 'Hide' }</button>
                <button onclick="${this.updateFunctionText}">Update</button>
            </div>
        </div>`;
    }

}

class FunctionList extends Styled(ListOf(FunctionPanel)) {}

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
            const { centerX, centerY, zoom, resolution } = graphPropsSummary;
            const centerXScreen = width / 2;
            const centerYScreen = height / 2;
            const minX = ~~(centerX - centerXScreen / zoom) - 1;
            const maxX = ~~(centerX + centerXScreen / zoom) + 1;

            const xToCoord = xValue => {
                return centerXScreen + ((xValue - centerX) * zoom);
            }

            const yToCoord = yValue => {
                return centerYScreen - ((yValue - centerY) * zoom);
            }

            const f = functionSummary.jsFunction;

            //> Re-draw this function
            ctx.lineWidth = 2;
            ctx.strokeStyle = functionSummary.color;
            ctx.beginPath();
            let lastY = 0;
            const increment = resolution / zoom;
            for (let x = minX; x < maxX; x += increment) {
                //> Try to get a non-asymptotic value of y
                let y = f(x);
                if (isNaN(y)) {
                    y = f(x + 0.00001);
                } else if (isNaN(y)) {
                    y = f(x - 0.00001);
                }

                //> Graph it.
                if (!isNaN(y)) {
                    //> There's some complexity here to avoid drawing an incorrect line
                    //  through the middle of the screen when asymptotic limits switch signs.
                    const diff = y - lastY;
                    const diffSign = y * lastY < 0;
                    lastY = y;
                    if (diff > height && diffSign) {
                        ctx.moveTo(xToCoord(x), yToCoord(y));
                    } else {
                        ctx.lineTo(xToCoord(x), yToCoord(y));
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

        this.redraw = this.redraw.bind(this);
        window.addEventListener('resize', this.redraw);
        this.bind(this.graphProps, this.redraw);
    }

    remove() {
        window.removeEventListener('resize', this.redraw);
    }

    styles() {
        return {
            'canvas': {
                'position': 'fixed',
                'z-index': '-1',
                'top': '0',
                'left': '0',
                'right': '0',
                'bottom': '0',
            },
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
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        // y = 0
        ctx.moveTo(xToCoord(minX), yToCoord(0));
        ctx.lineTo(xToCoord(maxX), yToCoord(0));
        // x = 0
        ctx.moveTo(xToCoord(0), yToCoord(minY));
        ctx.lineTo(xToCoord(0), yToCoord(maxY));
        ctx.stroke();

        ctx.lineWidth = 2;

        for (const graph of this.functionGraphs.components) {
            graph.redraw();
        }
    }

    compose() {
        return jdom`<div id="graphContainer">
            ${this.canvas}
            ${this.functionGraphs.node}
        </div>`;
    }

}

class App extends Component {

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

    compose() {
        return jdom`<main>
            <div class="overlay">
                ${this.appBar.node}
            </div>
            ${this.graph.node}
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
