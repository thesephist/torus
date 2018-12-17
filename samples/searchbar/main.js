// The searchbar sample project demonstrates StyledComponent

class SearchInput extends StyledComponent {

    styles() {
        return {
            background: 'blue',
        };
    }

    compose() {
        return div([
            input({
                type: 'search',
            }),
        ]);
    }

}

class SearchButton extends StyledComponent {

    styles() {
        return {
            background: 'red',
        };
    }

    compose() {
        return button([
            'Search',
        ]);
    }
}

class App extends StyledComponent {

    init() {
        this.input = new SearchInput();
        this.button = new SearchButton();
    }

    compose() {
        return (
            div({
                style: {
                    fontFamily: "'Helvetica', 'Ubuntu', sans-serif",
                    width: '100%',
                    maxWidth: '500px',
                    margin: '0 auto',
                },
            }, [
                this.input.node,
                this.button.node,
            ])
        );
    }

}

const app = new App();
document.body.appendChild(app.node);

