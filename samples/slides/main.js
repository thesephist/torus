//> Slides framework demo. This showcases a super simple
//  slide deck library for the web, written as Torus
//  components (mostly function components).

//> Since this is more of a library than an app, there's
//  going to be lots of unused vars
/* eslint no-unused-vars: 0 */

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> ## In-slide components

const Title = (content = 'Title') => {
    return {
        tag: 'h1',
        children: [content],
    }
}

const Subtitle = (content = 'Subtitle') => {
    return {
        tag: 'h2',
        attrs: {
            class: 'subtitle',
        },
        children: [content],
    }
}

const Paragraph = content => {
    return {
        tag: 'p',
        attrs: {
            style: {
                width: '100%',
            },
        },
        children: [content],
    }
}

//> Internal List implementation. `BulletList` and `NumberedList`
//  compose this.
const List = (type, children) => {
    return {
        tag: type,
        attrs: {
            style: {
                width: '100%',
            },
        },
        children: children.map(comp => {
            return {
                tag: 'li',
                children: [comp],
            }
        }),
    }
}

const BulletList = (...children) => {
    return List('ul', children);
}

const NumberedList = (...children) => {
    return List('ol', children);
}

//> An Image component, with alt text and some basic styles
const Image = ({
    src = '#',
    alt = 'Image placeholder',
} = {}) => {
    return {
        tag: 'img',
        attrs: {
            src: src,
            alt: alt,
            style: {
                maxWidth: '100%',
                maxHeight: '100%',
                boxShadow: '0 3px 6px rgba(0, 0, 0, .3)',
            },
        },
    }
}

//> `Row` and `Column` are flexbox-type containers
//  that align the children vertically or horizontally. As
//  a general pattern function components that take children should
//  accept them as spread arguments, like this.
const Row = (...children) => {
    return {
        tag: 'div',
        attrs: {
            style: {
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'flex-start',
            },
        },
        children: children,
    }
}

const Column = (...children) => {
    return {
        tag: 'div',
        attrs: {
            style: {
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                alignItems: 'flex-start',
            },
        },
        children: children,
    }
}

//> A general component to center things vertically and horizontally,
//  by using flexboxes centering and taking up all available space.
const Center = ({
    horizontal =  true,
    vertical = true,
} = {}, ...children) => {
    return {
        tag: 'div',
        attrs: {
            style: {
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: horizontal ? 'center' : 'flex-start',
                alignItems: vertical ? 'center' : 'flex-start',
            },
        },
        children: children,
    }
}

//> # Slide component, that takes up the whole page each time.

const Slide = (...children) => {
    return {
        tag: 'section',
        attrs: {
            class: 'slide',
            style: {
                height: '100vh',
                width: '100vw',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '5vw',
            },
        },
        children: children,
    }
}

//> ## Slide deck component, that controls the entire presentation.
class Deck extends StyledComponent {

    //> We start the presentation at slide 0, and keep track of the list of slides.
    //  Every time we advance or rewind, we increment/decrement the slide index
    //  and only display that particular slide.
    init(...slides) {
        this.slideIndex = 0;
        this.slides = slides;

        this.setSlideIndex = this.setSlideIndex.bind(this);
        this.handleAdvanceClick = this.handleAdvanceClick.bind(this);
        this.handleRewindClick = this.handleRewindClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);

        //> In order to also advance/rewind slides when the user presses
        //  left/right arrow keys, we listen for the `keydown` DOM event.
        document.addEventListener('keydown', this.handleKeydown);
    }

    remove() {
        document.removeEventListener('keydown', this.handleKeydown);
    }

    setSlideIndex(idx) {
        this.slideIndex = Math.max(
            Math.min(
                this.slides.length - 1,
                idx
            ), 0);
        this.render();
    }

    advance() {
        this.setSlideIndex(this.slideIndex + 1);
    }

    rewind() {
        this.setSlideIndex(this.slideIndex - 1);
    }

    handleAdvanceClick(evt) {
        this.advance();
    }

    handleRewindClick(evt) {
        this.rewind();
    }

    //> When the user presses a key, we advance or rewind if it's either of the
    //  left/right arrow keys.
    handleKeydown(evt) {
        switch (evt.key) {
            case 'ArrowLeft':
                this.rewind();
                break;
            case 'ArrowRight':
                this.advance();
                break;
        }
    }

    styles() {
        return {
            '.navButton': {
                'position': 'fixed',
                'top': 0,
                'bottom': 0,
                'background': 'rgba(0, 0, 0, .1)',
                'color': '#fff',
                'font-size': '100px',
                'transition': 'opacity .3s',
                'transition-delay': '.6s',
                'width': '10vw',
                'border-radius': 0,
                'border': 0,
                'cursor': 'pointer',
                'opacity': 0,
                'outline': 'none',
                '&:hover': {
                    'opacity': '1',
                    'transition-delay': '0s',
                },
                '&:active': {
                    'background': 'rgba(0, 0, 0, .2)',
                },
            },
            '.advanceButton': {
                'right': 0,
            },
            '.rewindButton': {
                'left': 0,
            },
            '.indicators': {
                'position': 'fixed',
                'bottom': '2vh',
                'left': '50vw',
                'transform': 'translateX(-50%)',
                'display': 'flex',
                'opacity': '.7',
            },
            '.indicatorDot': {
                'width': '12px',
                'height': '12px',
                'border-radius': '6px',
                'background': '#eee',
                'margin': '0 6px',
                'box-shadow': '0 2px 4px rgba(0, 0, 0, .6)',
                'transition': 'transform .1s',
                'cursor': 'pointer',
                '&.active': {
                    'background': '#f8f8f8',
                    'transform': 'scale(1.3)',
                    'margin': '0 8px',
                },
                '&:hover': {
                    'box-shadow': '0 2px 8px rgba(0, 0, 0, .8)',
                },
            },
        }
    }

    compose() {
        return jdom`<main>
            ${this.slides[this.slideIndex]}
            <button class="navButton advanceButton" onclick="${this.handleAdvanceClick}">${'>'}</button>
            <button class="navButton rewindButton" onclick="${this.handleRewindClick}">${'<'}</button>
            <div class="indicators">
                ${this.slides.map((s, idx) => {
                    //> We could make these place indicator dots individual components, but because
                    //  they're so simple, they work better as simple functions embedded in another component,
                    //  like this. Even so, we can still attach event listeners, like this one for example,
                    //  that brings the user directly to the clicked slide.
                    return jdom`<div class="indicatorDot ${idx === this.slideIndex ? 'active' : ''}"
                        onclick="${() => this.setSlideIndex(idx)}"></div>`;
                })}
            </div>
        </main>`;
    }

}

//> App wrapper around the slide deck, that defines the content.
class App extends Component {

    init() {
        //> Because the slide deck is one big functional component, we can define
        //  our presentation as nested function calls that construct a tree of components
        //  to be rendered by the `Deck`.
        this.deck = new Deck(
            Slide(
                Title('Torus Slide Deck Demo'),
                Subtitle('This is about this demo!')
            ),
            Slide(
                Title('Building with Torus'),
                Paragraph('This entire presentation is composed of Torus function components. As you can see, it\'s very easy to compose together components written in this way.'),
                Paragraph('This ability to create simple units of UI that can be used together and within each other is one of the strengths of following React\'s lead in reusable, composable component-based UI frameworks.')
            ),
            Slide(
                //> This pattern of nesting functional components' children as ES2015
                //  spread arguments makes nested functional component code
                //  quite readable.
                Title('Split slide'),
                Paragraph('This is a split slide, with a more complex layout.'),
                Row(
                    Column(
                        Paragraph('Inspirations for Torus'),
                        NumberedList(
                            Paragraph('React'),
                            Paragraph('Backbone'),
                            Paragraph('Preact'),
                            Paragraph('lit-html')
                        )
                    ),
                    Center(
                        {
                            horizontal: true,
                        },
                        Image({
                            src: 'https://www.ocf.berkeley.edu/~linuslee/pic.jpg',
                            alt: 'A picture of me',
                        })
                    )
                )
            )
        );
    }

    compose() {
        return this.deck.node;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';
