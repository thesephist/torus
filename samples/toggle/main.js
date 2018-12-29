// The Toggle demo is a sample project using just the UI
//  rendering APIs of Torus.

class Toggle extends Component {

    init() {
        this.state = false;
        this.boundOnToggle = this.onToggle.bind(this);
    }

    onToggle() {
        this.state = !this.state;

        // For now, render calls are manual (state changes do not trigger
        //  render). I'm watching for patterns that emerge before taking
        //  a more opinionated approach here.
        this.render();
    }

    compose() {
        return {
            tag: 'button',
            events: {
                click: this.boundOnToggle,
            },
            children: [
                this.state ? ':D' : ':\'(',
            ],
        }
    }

}

class App extends Component {

    init() {
        this.clickTimes = 0;
        this.toggles = [];
        this.boundButtonClick = this.buttonClick.bind(this);
    }

    buttonClick() {
        this.clickTimes ++;
        this.toggles.push(new Toggle());
        this.render();
    }

    compose() {
        return {
            tag: 'div',
            children: [
                (
                    this.clickTimes % 2 ? {
                        tag: 'h1',
                        children: [
                            'Hello, ',
                            { tag: 'em', children: ['World!'] },
                        ],
                    } : {
                        tag: 'h1',
                        children: [
                            'Hello, World!',
                        ],
                    }
                ),
                {
                    tag: 'p',
                    children: [
                        'Button has been pressed ',
                        this.clickTimes.toString(),
                        ' times.',
                    ],
                },
                {
                    tag: 'button',
                    attrs: {
                        style: {
                            background: 'blue',
                            color: '#fff',
                        },
                    },
                    events: {
                        click: this.boundButtonClick,
                    },
                    children: [
                        'Click me!',
                    ],
                },
                {
                    tag: 'ul',
                    children: [
                        ...this.toggles.map(t => {
                            return {
                                tag: 'li',
                                children: [t.node],
                            }
                        }),
                    ],
                }
            ],
        }
    }
}

const app = new App();
// Add the root element of the root component to the DOM,
//  and subsequent renders will automatically update the page content
document.body.appendChild(app.node);
