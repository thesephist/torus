//> Minimal Conway's Game of Life simulation

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> Constants to determine simulation scale and look
const CELL_SIZE = 10;
const CELL_RADIUS = 3;

//> `GameOfLife` encapsulates the full state of a Game of Life simulation
//  and implements all game logic. It forms the "model" layer of the app.
class GameOfLife {

    constructor() {
        //> Determine how many cells we have in our window, given the cell
        //  sizes and the window size. The `+ 2` makes sure the full canvas
        //  is filled.
        this.xCount = ~~(window.innerWidth / CELL_SIZE) + 2;
        this.yCount = ~~(window.innerHeight / CELL_SIZE) + 2;
        this.count = this.xCount * this.yCount;

        //> We represent the game as a single array of 0's and 1's,
        //  scanning the grid row-by-row, left to right, from the top row
        //  to the bottom row. Cells all begin with the "dead" 0 state.
        this.cells = Array.from({length: this.count});
        //> `this.cells` is double-buffered, so that we don't have to keep creating
        //  new cells arrays with each tick. This is the other "buffer" of the game state.
        this._cells = Array.from({length: this.count});
        this.clear();
    }

    //> Seed the entire game board randomly, without killing live cells.
    seedRandomly() {
        for (let i = 0; i < this.count; i ++) {
            if (this.cells[i] === 0) {
                this.cells[i] = Math.random() < .1 ? 1 : 0;
            }
        }
    }

    //> Clear the entire game board for a new game.
    clear() {
        this.cells.fill(0);
    }

    //> Utility function to get the index of a cell above the given one.
    //  -1 is used as a sentinel value for "no such cell".
    north(i) {
        const result = i - this.xCount;
        return result < 0 ? -1 : result;
    }

    //> Like `north()`, but for the cell below the given one.
    south(i) {
        const result = i + this.xCount;
        return result >= this.count ? -1 : result;
    }

    //> Like `north()`, but for the cell to the right of the given one.
    east(i) {
        //> We have to do this add-one, subtract-one trick here because
        //  remainders should start at 1 but indexes start at 0.
        const remainder = (i + 1) % this.xCount;
        if (remainder === 0) {
            return -1;
        } else {
            return i + 1;
        }
    }

    //> Like `north()`, but for the cell to the left of the given one.
    west(i) {
        const remainder = (i + 1) % this.xCount;
        if (remainder === 1) {
            return -1;
        } else {
            return i - 1;
        }
    }

    //> Given current game state and a cell index, compute the next state of the cell
    //  in the next tick/step. Each tick of the game computes this for each cell on the board.
    cellNextState(i) {
        const live = this.cells[i] === 1;
        const cells = this.cells;

        const west = this.west(i);
        const east = this.east(i);

        //> Compute live/dead state for each of the 8 neighboring cells.
        let liveNeighbors = 0;
        if (this.cells[this.north(i)] === 1) {
            liveNeighbors ++;
        }
        if (this.cells[this.south(i)] === 1) {
            liveNeighbors ++;
        }
        if (cells[east] === 1) {
            liveNeighbors ++;
        }
        if (cells[west] === 1) {
            liveNeighbors ++;
        }
        if (cells[this.north(west)] === 1) {
            liveNeighbors ++;
        }
        if (cells[this.south(west)] === 1) {
            liveNeighbors ++;
        }
        if (cells[this.north(east)] === 1) {
            liveNeighbors ++;
        }
        if (cells[this.south(east)] === 1) {
            liveNeighbors ++;
        }

        //> Literal implementation of Conway's Game of Life
        if (live && liveNeighbors < 2) {
            return 0;
        } else if (live && (liveNeighbors === 2 || liveNeighbors === 3)) {
            return 1;
        } else if (live && liveNeighbors > 3) {
            return 0;
        } else if (!live && liveNeighbors === 3) {
            return 1;
        } else {
            //> If no change, return the original state of the cell.
            return this.cells[i]
        }
    }

    //> Iterate the entire game board for one tick.
    step() {
        //> `this.cells` is double-buffered, so we modify the non-current
        //  buffer of cells with new cell states and swap them out at the end.
        for (let i = 0; i < this.count; i ++) {
            this._cells[i] = this.cellNextState(i);
        }
        const tmpCells = this.cells;
        this.cells = this._cells;
        this._cells = tmpCells;
    }

}

//> `GameCanvas` component represents the canvas on which the game unfolds.
//  It contains just the canvas, and no other UI element, but is controllable
//  via its API (methods).
class GameCanvas extends Component {

    init() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        //> Create a `<canvas>` element for the game itself. We render this
        //  programmatically, not through the `compose()` method, so we can control
        //  exactly how things are painted on the canvas's 2D context.
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        //> Since we only ever paint one thing -- the dots -- we set a single fill
        //  style here and never change it.
        this.ctx.fillStyle = '#333';

        //> New instance of the game state, seeded with a random state to begin
        this.game = new GameOfLife();
        //> This stores the previous "snapshot" of the game state, for dragging / clicking
        //  to toggle cell states. We need to do this because when we drag, we should flip each
        //  cell state from a snapshot before we started dragging, not necessary the state immediately
        //  before the mouse cursor reaches the cell.
        this._prevGameCells = this.game.cells.slice();

        //> Local state that represents whether a mouse or touch pointer is being dragged,
        //  for adding points to the game.
        this._down = false;

        //> Bind UI event listener methods
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        this.canvas.addEventListener('mousedown', this.handleStart);
        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('mouseup', this.handleEnd);
        this.canvas.addEventListener('touchstart', this.handleStart);
        this.canvas.addEventListener('touchmove', this.handleMove);
        this.canvas.addEventListener('touchend', this.handleEnd);

        //> Randomly seed the game state to begin
        this.seedRandomly();
    }

    //> Helper that maps XY coordinates in the screen to an index
    //  in the cells array. There's a slight leak of abstraction here
    //  because we have to worry about the 1-dimensional array representation
    //  of cells, but this gains us a measurable performance impact.
    xyToCellIdx(x, y) {
        return (~~(y / CELL_SIZE) * this.game.xCount) + ~~(x / CELL_SIZE);
    }

    toggleCellStateAt(xCoord, yCoord) {
        const cellIdx = this.xyToCellIdx(xCoord, yCoord);
        //> `(x + 1) % 2` is an easy way to flip between the 0 and 1 states without a conditional
        this.game.cells[cellIdx] = (this._prevGameCells[cellIdx] + 1) % 2;
    }

    handleStart(evt) {
        evt.preventDefault();
        this._down = true;
        //> When the pointer is down, immediately start painting new cells in,
        //  so a "click" will regiter a new live cell.
        if (evt.touches) {
            evt = evt.touches[0];
        }
        this._prevGameCells = this.game.cells.slice();
        this.toggleCellStateAt(evt.clientX, evt.clientY);
        this.render();
    }

    handleMove(evt) {
        evt.preventDefault();
        if (this._down) {
            if (evt.touches) {
                evt = evt.touches[0];
            }
            this.toggleCellStateAt(evt.clientX, evt.clientY);
            this.render();
        }
    }

    handleEnd(evt) {
        evt.preventDefault();
        this._down = false;
    }

    seedRandomly() {
        this.game.seedRandomly();
        this.render();
    }

    clear() {
        this.game.clear();
        this.render();
    }

    //> Main logic for rendering the game's state to the canvas
    redraw() {
        const ctx = this.ctx;
        const {cells, count, xCount} = this.game;

        //> Memoize constants, since it's easy and cheap
        const HALFCELL = CELL_SIZE / 2;
        const TAU = Math.PI * 2;

        //> Clear the canvas. We'll re-draw the entire world each time.
        ctx.clearRect(0, 0, this.width, this.height);

        //> For each cell, if the cell is alive, draw a circle and fill it in.
        for (let i = 0; i < count; i ++) {
            if (cells[i] === 1) {
                const remainder = (i + 1) % xCount;

                ctx.beginPath();
                ctx.arc(
                    ((remainder - 1) * CELL_SIZE) + HALFCELL,
                    ((i - remainder + 1) / xCount * CELL_SIZE) + HALFCELL,
                    CELL_RADIUS,
                    0,
                    TAU
                );
                ctx.fill();
            }
        }
    }

    //> Simulate and render a "tick" in the game. This is the API to progress
    //  the game from components that consume this `GameCanvas` component.
    step() {
        this.game.step();
        this.render();
    }

    //> We override the compose method to also re-draw the frame with each render.
    compose() {
        this.redraw();
        return this.canvas;
    }

}

//> Main app that contains the simulation and a couple of other UI elements.
class App extends StyledComponent {

    init() {
        //> By default, a game in "play" ticks forward every 100ms
        this.INTERVAL = 100;
        //> This is where we store the timer of a game in play, so we can cancel it.
        this.timer = null;
        //> Make a new game canvas to display game state.
        this.gameCanvas = new GameCanvas();
    }

    start() {
        //> Iff game is not playing, start a new interval timer that steps the game
        //  forward each time.
        if (this.timer === null) {
            this.timer = setInterval(() => this.gameCanvas.step(), this.INTERVAL);
            this.render();
        }
    }

    pause() {
        //> To pause, clear the timer and set it back to null, so we can check if
        //  we're playing.
        clearInterval(this.timer);
        this.timer = null;
        this.render();
    }

    styles() {
        return css`
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        menu {
            position: absolute;
            background: #fff;
            box-shadow: 0 3px 6px rgba(0, 0, 0, .4);
            transform: translateX(-50%);
            top: 20px;
            left: 50%;
            border-radius: 40px;
            display: flex;
            margin: 0;
            padding: 8px;
            flex-direction: row;
            button {
                padding: 0 8px;
                font-size: 1em;
                cursor: pointer;
                height: 36px;
                line-height: 34px;
                border-radius: 18px;
                background: #333;
                color: #fff;
                margin-left: 8px;
                transition: transform .2s;
                border: 0;
                &:first-child {
                    margin-left: 0;
                }
                &:hover {
                    opacity: .7;
                    transform: translateY(-2px);
                }
            }
        }
        footer {
            position: absolute;
            right: 4px;
            bottom: 4px;
            padding: 0 6px;
            box-sizing: border-box;
            text-align: right;
            color: #777;
            font-family: system-ui, sans-serif;
            font-size: 14px;
        }
        a {
            color: #777;
            cursor: pointer;
            &:hover {
                opacity: .7;
            }
        }
        `;
    }

    compose() {
        return jdom`<main>
            ${this.gameCanvas.node}
            <menu>
                <button onclick="${() => this.gameCanvas.clear()}">Clear</button>
                <button onclick="${() => this.gameCanvas.seedRandomly()}">Randomize</button>
                <button onclick="${() => this.gameCanvas.step()}">Step</button>
                ${this.timer === null ? (
                        //> Depending on whether the game is in play or not, display
                        // the appropriate button.
                        jdom`<button onclick="${() => this.start()}">Play</button>`
                    ) : (
                        jdom`<button onclick="${() => this.pause()}">Pause</button>`
                )}
            </menu>
            <footer>
                Conway's Game of Life by
                <a href="https://linus.zone/now">Linus</a>,
                built with
                <a href="https://linus.zone/torus">Torus</a>
            </footer>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';
document.body.style.padding = '0';
