//> A Mondrian-style drawing generator

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

const MONDRIAN_COLORS = [
    'red',
    'blue',
    'yellow',
];

const COLOR_LIKELIHOOD = 0.25;

const RECURSION_LIKELIHOOD = 0.84;

const RECURSION_LIMIT = 9;

const rand = () => Math.random();

const randOf = list => {
    return list[~~(Math.random() * list.length)];
}

const coinflip = (a, b) => rand() < 0.5 ? a : b;

const Mondrian = depth => {
    let child = null;
    if (depth < RECURSION_LIMIT) {
        if (rand() < Math.pow(RECURSION_LIKELIHOOD, depth)) {
            child = [
                Mondrian(depth + 1),
                Mondrian(depth + 1),
            ];
        }
    }

    let color = '#fff';
    if (rand() < COLOR_LIKELIHOOD) {
        color = randOf(MONDRIAN_COLORS);
    }

    return jdom`<div class="block ${coinflip('vertical', 'horizontal')}"
        style="background:${color}">
        ${child}
    </div>`
}

class App extends StyledComponent {

    styles() {
        return {
            'height': '100vh',
            'width': '100vw',
            'display': 'flex',
            'flex-direction': 'row',
            '.block': {
                'display': 'flex',
                'flex-grow': '1',
                'flex-shrink': '0',
                '&.vertical': {
                    'flex-direction': 'column',
                },
                '&.horizontal': {
                    'flex-direction': 'row',
                },
            },
            '.vertical > .block + .block': {
                'border-top': '8px solid #000',
            },
            '.horizontal > .block + .block': {
                'border-left': '8px solid #000',
            },
        }
    }

    compose() {
        return jdom`<main>
            ${Mondrian(0)}
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';

