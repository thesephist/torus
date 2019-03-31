//> Conway's Game of Life

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

const CELL_SIZE = 8;
const CELL_RADIUS = 3;

class GameOfLife {

    constructor() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.xCount = ~~(width / CELL_SIZE) + 2;
        this.yCount = ~~(height / CELL_SIZE) + 2;
        this.count = this.xCount * this.yCount;

        this.cells = new Array(this.xCount * this.yCount).fill(0);
    }

    seedRandomly() {
        for (let i = 0; i < this.count; i ++) {
            if (this.cells[i] === 0) {
                this.cells[i] = Math.random() < .1 ? 1 : 0;
            }
        }
    }

    clear() {
        this.cells.fill(0);
    }

    north(i) {
        const result = i - this.xCount;
        return result < 0 ? -1 : result;
    }

    south(i) {
        const result = i + this.xCount;
        return result >= this.count ? -1 : result;
    }

    east(i) {
        const remainder = (i + 1) % this.xCount;
        if (remainder === 0) {
            return -1;
        } else {
            return i + 1;
        }
    }

    west(i) {
        const remainder = (i + 1) % this.xCount;
        if (remainder === 1) {
            return -1;
        } else {
            return i - 1;
        }
    }

    cellNextState(i) {
        const live = this.cells[i] === 1;
        let liveNeighbors = 0;
        const cells = this.cells;

        const west = this.west(i);
        const east = this.east(i);
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

        if (live && liveNeighbors < 2) {
            return 0;
        } else if (live && (liveNeighbors === 2 || liveNeighbors === 3)) {
            return 1;
        } else if (live && liveNeighbors > 3) {
            return 0;
        } else if (!live && liveNeighbors === 3) {
            return 1;
        } else {
            return this.cells[i]
        }
    }

    step() {
        const nextCells = new Array(this.count);
        for (let i = 0; i < this.count; i ++) {
            nextCells[i] = this.cellNextState(i);
        }
        this.cells = nextCells;
    }

}

class GameCanvas extends Component {

    init() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');

        this.game = new GameOfLife();

        this._down = false;

        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        this.canvas.addEventListener('mousedown', this.handleStart);
        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('mouseup', this.handleEnd);
        this.canvas.addEventListener('touchstart', this.handleStart);
        this.canvas.addEventListener('touchmove', this.handleMove);
        this.canvas.addEventListener('touchend', this.handleEnd);
    }

    handleStart(evt) {
        evt.preventDefault();
        this._down = true;
        if (evt.touches) {
            evt = evt.touches[0];
        }
        const [xCoord, yCoord] = this.xyToCoords(evt.clientX, evt.clientY);
        this.game.cells[yCoord * this.game.xCount + xCoord] = 1;
        this.render();
    }

    handleMove(evt) {
        evt.preventDefault();
        if (this._down) {
            if (evt.touches) {
                evt = evt.touches[0];
            }
            const [xCoord, yCoord] = this.xyToCoords(evt.clientX, evt.clientY);
            this.game.cells[yCoord * this.game.xCount + xCoord] = 1;
            this.render();
        }
    }

    handleEnd(evt) {
        evt.preventDefault();
        this._down = false;
    }

    xyToCoords(x, y) {
        return [
            ~~(x / CELL_SIZE),
            ~~(y / CELL_SIZE),
        ];
    }

    randomize() {
        this.game.seedRandomly();
        this.render();
    }

    clear() {
        this.game.clear();
        this.render();
    }

    redraw() {
        const ctx = this.ctx;
        const {cells, count, xCount} = this.game;

        ctx.clearRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#333';

        for (let i = 0; i < count; i ++) {
            if (cells[i] === 1) {
                const remainder = (i + 1) % xCount;

                ctx.beginPath();
                ctx.arc(
                    (remainder - 1) * CELL_SIZE + (CELL_SIZE / 2),
                    (i - remainder + 1) / xCount * CELL_SIZE + (CELL_SIZE / 2),
                    CELL_RADIUS,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }

    step() {
        this.game.step();
        this.render();
    }

    compose() {
        this.redraw();
        return this.canvas;
    }

}

//> Main app that contains the simulation and a couple of other UI elements.
class App extends StyledComponent {

    init() {
        this.INTERVAL = 100;
        this.timer = null;
        this.gameCanvas = new GameCanvas();
    }

    start() {
        if (this.timer === null) {
            this.timer = setInterval(() => this.gameCanvas.step(), this.INTERVAL);
            this.render();
        }
    }

    pause() {
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
            box-shadow: 0 3px 6px rgba(0, 0, 0, .3);
            transform: translateX(-50%);
            left: 50%;
            bottom: 12px;
            height: 40px;
            display: flex;
            margin: 0;
            padding: 8px;
            flex-direction: row;
            button {
                padding: 4px 8px;
                font-size: 1em;
                cursor: pointer;
            }
        }
        footer {
            position: absolute;
            right: 4px;
            bottom: 4px;
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
                ${this.timer === null ? (
                        jdom`<button onclick="${() => this.start()}">Play</button>`
                    ) : (
                        jdom`<button onclick="${() => this.pause()}">Pause</button>`
                )}
                <button onclick="${() => this.gameCanvas.randomize()}">Randomize</button>
                <button onclick="${() => this.gameCanvas.step()}">Step</button>
                <button onclick="${() => this.gameCanvas.clear()}">Clear</button>
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

