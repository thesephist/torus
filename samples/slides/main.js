//> Slides framework demo

//> ## Slide components

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

const Paragraph = (content) => {
    return {
        tag: 'p',
        children: [content],
    }
}

//> Internal List implementation. `BulletList` and `NumberedList`
//  compose this.
const List = (type, children) => {
    return {
        tag: type,
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

const Image = ({
    src = '#',
    alt = 'Image placeholder',
} = {}) => {
    return {
        tag: 'img',
        attrs: {
            src: src,
            alt: alt,
        },
    }
}

const Row = (...children) => {
    return {
        tag: 'div',
        attrs: {
            style: {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'flex-start',
            }
        },
        children: children,
    }
}

const Column = (...children) => {
    return {
        tag: 'div',
        attrs: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                alignItems: 'flex-start',
            }
        },
        children: children,
    }
}

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

//> # Slide primitive

const Slide = (...children) => {
    return {
        tag: 'section',
        attrs: {
            class: 'slide',
            style: {
                height: '100vh',
                width: '100vw',
                boxSizing: 'border-box',
                overflow: 'hidden',
            },
        },
        children: children,
    }
}

//> ## Slide layouts

const TitleSlide = () => {

}

//> ## Deck

class Deck extends StyledComponent {

    init(...slides) {
        this.slideIndex = 0;
        this.slides = slides;
    }

    advance() {
        this.slideIndex = Math.max(
            Math.min(
                this.slides.length - 1,
                this.slideIndex + 1
            ), 0);
        this.render();
    }

    rewind() {
        this.slideIndex = Math.max(
            Math.min(
                this.slides.length - 1,
                this.slideIndex - 1
            ), 0);
        this.render();
    }

    compose() {
        return {
            tag: 'main',
            children: [this.slides[this.slideIndex]],
        }
    }

}

class App extends Component {

    init() {
        this.deck = new Deck(
            Slide(
                Title('My Presentation'),
                Subtitle('This is about this demo!')
            ),
            Slide(
                Title('Building with Torus'),
                Paragraph('This entire presentation is composed of Torus function components')
            ),
            Slide(
                Title('Split slide'),
                Row(
                    Column(
                        NumberedList(
                            Paragraph('First item'),
                            Paragraph('Second item')
                        ),
                        Paragraph('This is a test'),
                    ),
                    BulletList(
                        Paragraph('First item'),
                        Paragraph('Second Item')
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
