//> A Mondrian-style drawing generator.
//  Of the Torus samples, this is one of the few that may
//  not be much easier to write with plain JavaScript. However,
//  relying on Torus's functional way of describing components
//  does simplify the process of recursively generating DOM here.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> Color palette, roughly taken after Mondrian's characteristic paintings.
//  There are two of RYB; this is a cheap way to make sure they occur more
//  often than black.
const MONDRIAN_COLORS = [
    '#c71b1b', // red
    '#23238c', // blue
    '#fbd209', // yellow

    '#c71b1b', // red
    '#23238c', // blue
    '#fbd209', // yellow

    '#181818', // black
];

//> How likely is is that a region is a colored region?
const COLOR_LIKELIHOOD = 0.3;

//> How likely is it that a region will contain subregions?
const RECURSION_LIKELIHOOD = 0.88;

//> Minimum level of recursion required. If this is set to lower values,
//  the resulting painting will tend to look quite sparse / boring.
const RECURSION_MIN = 3;
//> Maximum level of recursion. This is set based on screen width
//  to avoid paintings that are too crowded.
const RECURSION_LIMIT = ~~(Math.max(window.innerHeight, window.innerWidth) / 130);

//> Shorthand for generating a random double.
const rand = () => Math.random();

//> Shorthand for generating a random choice from a list.
const randOf = list => {
    return list[~~(Math.random() * list.length)];
}

//> The Mondrian function component contains the core logic of recursively
//  generating a Mondrian-style drawing. The painting in the app is a single
//  Mondrian component with starting depth 0.
const Mondrian = depth => {

    //> By default, the child of a Mondrian block is `null` (a comment).
    let child = null;
    //> If we're under the recursion limit, then...
    if (depth < RECURSION_LIMIT && (
        //> If we need to traverse down the recursion tree again,
        //  the children of this Mondrian block is two more Mondrian blocks.
        depth < RECURSION_MIN || rand() < Math.pow(RECURSION_LIKELIHOOD, depth)
    )) {
        child = [
            Mondrian(depth + 1),
            Mondrian(depth + 1),
        ];
    }

    //> The default color is an off-white shade.
    let color = '#f3f3f3';
    //> Given the likelihood of a colored block, generate a block color.
    if (rand() < COLOR_LIKELIHOOD) {
        color = randOf(MONDRIAN_COLORS);
    }

    //> Return a Mondrian block with a random split direction,
    //  the generated color, and a random flexbox size.
    return jdom`<div class="block ${randOf(['vertical', 'horizontal'])}"
        style="background:${color};flex-grow:${randOf([1, 2, 3, 4])}">
        ${child}
    </div>`
}

//> Main component of the gallery UI.
class App extends StyledComponent {

    init() {
        //> Allow the user to re-generate drawings by hitting the spacebar.
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
            //> A block is just a flexbox, where the `flex-direction` determines
            //  the direction of split of blocks inside it.
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
            //> Clever method of adding separator lines between blocks,
            //  such that every block has equal sized borders on all sides
            //  regardless of recursion depth.
            '.vertical > .block + .block': {
                'border-top': '8px solid #181818',
            },
            '.horizontal > .block + .block': {
                'border-left': '8px solid #181818',
            },
            //> Gallery artwork plaque.
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
        //> The app includes a Mondrian block at depth 0.
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

