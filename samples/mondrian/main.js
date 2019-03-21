//> A Mondrian-style drawing generator

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

const MONDRIAN_COLORS = [
    '#c71b1b', // red
    '#23238c', // blue
    '#fbd209', // yellow

    '#c71b1b', // red
    '#23238c', // blue
    '#fbd209', // yellow

    '#181818', // black
];

const COLOR_LIKELIHOOD = 0.3;

const RECURSION_LIKELIHOOD = 0.88;

const RECURSION_MIN = 3;
const RECURSION_LIMIT = ~~(Math.max(window.innerHeight, window.innerWidth) / 150);

const rand = () => Math.random();

const randOf = list => {
    return list[~~(Math.random() * list.length)];
}

const coinflip = (a, b) => rand() < 0.5 ? a : b;

const Mondrian = depth => {
    let child = null;
    if (depth < RECURSION_LIMIT) {
        if (depth < RECURSION_MIN || rand() < Math.pow(RECURSION_LIKELIHOOD, depth)) {
            child = [
                Mondrian(depth + 1),
                Mondrian(depth + 1),
            ];
        }
    }

    let color = '#f3f3f3';
    if (rand() < COLOR_LIKELIHOOD) {
        color = randOf(MONDRIAN_COLORS);
    }

    return jdom`<div class="block ${coinflip('vertical', 'horizontal')}"
        style="background:${color};flex-grow:${coinflip(1, 2)}">
        ${child}
    </div>`
}

class App extends StyledComponent {

    init() {
        document.body.addEventListener('keyup', evt => {
            if (evt.key === ' ') {
                this.render();
            }
        });
    }

    styles() {
        return {
            'height': '100vh',
            'width': '100vw',
            'overflow': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'space-around',
            'background': '#f1f1f1',
            'main': {
                'height': '90vh',
                'width': '94vw',
                'margin': '0',
                'box-shadow': '0 4px 10px 0px rgba(0, 0, 0, .3)',
                'border-radius': '3px',
                'overflow': 'hidden',
                'display': 'flex',
                'flex-direction': 'row',
            },
            '.block': {
                'display': 'flex',
                'flex-grow': '1',
                'flex-shrink': '0',
                'min-width': '2vw',
                'min-height': '2vh',
                '&.vertical': {
                    'flex-direction': 'column',
                },
                '&.horizontal': {
                    'flex-direction': 'row',
                },
            },
            '.vertical > .block + .block': {
                'border-top': '8px solid #181818',
            },
            '.horizontal > .block + .block': {
                'border-left': '8px solid #181818',
            },
            '.plaque': {
                'font-family': '"San Francisco", "Helvetica", "Segoe UI", sans-serif',
                'display': 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'margin': '0',
                'padding': '.5vh 20px',
                'background': '#ddd',
                'border-radius': '4px',
                'box-shadow': '0 3px 2px rgba(0, 0, 0, .4)',
                'margin-top': '-2vh',
                'h1, p': {
                    'font-size': '1.5vh',
                    'margin': '0',
                },
            },
        }
    }

    compose() {
        return jdom`<div class="root">
            <main onclick="${() => this.render()}">
                ${Mondrian(0)}
            </main>
            <div class="plaque">
                <h1>Untitled</h1>
                <p>Piet Mondrian (1872 - 1944)</p>
            </div>
        </div>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';

