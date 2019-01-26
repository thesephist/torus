//> The searchbar sample project demonstrates `StyledComponent`
//  and communicating small view state between components in a hierarchy.
//  More complex or shared state should be stored in Records, and views
//  should listen to events on the view state Records.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> Input component for the searchbar!
class SearchInput extends StyledComponent {

    init({setValue}) {
        this.setValue = setValue;
        this.boundOnInput = this.onInput.bind(this);
    }

    //> Here's how the input component should look, in CSS
    styles() {
        return {
            'height': '100%',
            'width': '100%',

            //> We can nest styles, like SCSS
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
                    'background': '#f7f7f7',
                },
            },
        };
    }

    onInput(evt) {
        this.setValue(evt.target.value);
    }

    compose() {
        return jdom`<div>
            <input type="search" placeholder="Search for something..." oninput="${this.boundOnInput}" autofocus/>
        </div>`;
    }

}

//> Component for the button that says "Search"
//  making this a separate component might be overkill,
//  but it's here for demonstration purposes.
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
        //> When the user clicks the search button, we just call the callback
        //  passed in from our parent component.
        return jdom`<button onclick="${this.searchCallback}>Search</button>`;
    }
}

//> Component for our app's whole screen.
class App extends StyledComponent {

    init() {
        this.value = '';

        //> Create both our input and button components
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
        //> For this demo, when you search, instead of bringing you
        //  useful information, we'll just pop up an alert
        //  with what you searched for.
        window.alert('You searched for: ' + this.value);
    }

    compose() {
        return jdom`<div>
            <h1>Torus Search</h1>
            <div class="bar">
                ${this.input.node}
                ${this.button.node}
            </div>
        </div>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.background = '#f7f7f7';
