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

        // The composer method returns a JDOM object (dictionary representation)
        //  of the DOM to be rendered. `this.render()` will take this and
        //  efficiently render it to the document.
        return (
            button({}, {
                click: this.boundOnToggle,
            }, [
                this.state ? ':D' : ':\'(',
            ])
        );
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
        return (
            div([
                (
                    this.clickTimes % 2 ? (
                        h1([
                            'Hello, ', em(['World!']),
                        ])
                    ) : (
                        h1(['Hello, World!'])
                    )
                ),
                p([
                    'Button has been pressed ', this.clickTimes, ' times.',
                ]),
                button({
                    style: {
                        background: 'blue',
                        color: '#fff',
                    },
                }, {
                    click: this.boundButtonClick,
                }, [
                    'Click me!',
                ]),

                // Torus's API allows us to use just vanilla JavaScript syntax to render
                //  dynamic list with very little boilerplate, since a literal HTML
                //  node is a valid JDOM node.
                ul([
                    ...this.toggles.map(t => {
                        return li([t.node]);
                    }),
                ]),
            ])
        );
    }
}

const app = new App();
// Add the root element of the root component to the DOM,
//  and subsequent renders will automatically update the page content
document.body.appendChild(app.node);

