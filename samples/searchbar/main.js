// The searchbar sample project demonstrates StyledComponent
//  and communicating small view state between components in a hierarchy.
// More complex or shared state should be stored in Records, and views
//  should listen to events on the view state Records.

class SearchInput extends StyledComponent {

    init({setValue}) {
        this.setValue = setValue;

        this.boundOnInput = this.onInput.bind(this);
    }

    styles() {
        return {
            'height': '100%',
            'width': '100%',

            'input': {
                'height': '100%',
                'width': '100%',
                'line-height': '40px',
                'box-sizing': 'border-box',
                '-webkit-appearance': 'textfield',
                'border': 0,
                'padding': '8px 16px',
                'font-size': '16px',
                'outline': 'none',
                'transform': 'opacity .2s',

                '&:focus': {
                    background: '#f7f7f7',
                },
            }
        };
    }

    onInput(evt) {
        this.setValue(evt.target.value);
    }

    compose() {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'input',
                    attrs: {
                        type: 'search',
                        placeholder: 'Search for something...',
                        autofocus: 'autofocus',
                    },
                    events: {
                        input: this.boundOnInput,
                    },
                },
            ],
        }
    }

}

class SearchButton extends StyledComponent {

    init({searchCallback}) {
        this.searchCallback = searchCallback;
    }

    styles() {
        return {
            'font-size': '16px',
            'background': '#5073f1',
            'color': '#fff',
            'padding': '8px 16px',
            'margin': '0',
            'cursor': 'pointer',
            'transition': 'opacity .2s',
            'border': '0',

            '&:hover': {
                'opacity': '.85',
            },
        };
    }

    compose() {
        return {
            tag: 'button',
            events: {
                click: this.searchCallback,
            },
            children: ['Search'],
        }
    }
}

class App extends StyledComponent {

    init() {
        this.value = '';

        this.input = new SearchInput({
            setValue: str => this.value = str,
        });
        this.button = new SearchButton({
            searchCallback: () => this.search(),
        });
    }

    styles() {
        return {
            'font-family': "'Helvetica', 'Ubuntu', sans-serif",
            'position': 'absolute',
            'top': '36%',
            'left': '50%',
            'transform': 'translate(-50%, -50%)',

            'h1': {
                'font-size': '88px',
                'color': '#333',
                'margin': '36px 0',
                'text-align': 'center',
            },

            '.bar': {
                'height': '40px',
                'max-width': '520px',
                'width': '100%',
                'display': 'flex',
                'flex-direction': 'row',
                'font-size': '16px',
                'border-radius': '8px',
                'box-shadow': '0 2px 6px rgba(0, 0, 0, 0.3)',
                'overflow': 'hidden',
                'margin': '0 auto',
            },
        }
    }

    search() {
        console.log('Searching for:', this.value);
    }

    compose() {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'h1',
                    children: ['Torus Search'],
                },
                {
                    tag: 'div',
                    attrs: {
                        class: 'bar',
                    },
                    children: [this.input.node, this.button.node],
                },
            ],
        }
    }

}

const app = new App();
document.body.appendChild(app.node);
document.body.style.background = '#f7f7f7';
