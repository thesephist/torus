//> This counter example is a demonstration of the power of
//  declaratively defined views, JDOM templates' expressive power,
//  and how to compose simple functions together to form interesting Torus components.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> This component represents a single digit in the counter. This digit will
//  slide between different vertical positions to only show the correct digit
//  through the "window" of the containing element.
const Digit = d => {
    return jdom`<div class="digit" style="transform:translateY(-${d}em)">
        <div class="digitSlice">0</div>
        <div class="digitSlice">1</div>
        <div class="digitSlice">2</div>
        <div class="digitSlice">3</div>
        <div class="digitSlice">4</div>
        <div class="digitSlice">5</div>
        <div class="digitSlice">6</div>
        <div class="digitSlice">7</div>
        <div class="digitSlice">8</div>
        <div class="digitSlice">9</div>
        <div class="digitSlice"> </div>
    </div>`;
}

//> The `Counter` component is the container window through which all the digits
//  are shown. We take in a number, convert it to a string, and reduce it to add
//  commas in the thousandths places while mapping digits to the `Digit` components.
const Counter = number => {
    return jdom`<div class="counter">
        ${[
            //> this is a padding digit to balance out the leading padding digit
            Digit(10),
            ...number.toString()
                .split('')
                //> We reverse the digits so the digits begin filling out on the lower places
                .reverse()
                .map(d => Digit(+d))
                .reduce((acc, cur, i) => {
                    //> Quick, concise way to comma-separate
                    //  the thousands places.
                    if (i % 3 === 0 && i > 0) {
                        acc.push(',');
                    }
                    return acc.concat(cur);
                }, []),
            //> Padding digit so a newly added digit will slide into place,
            //  rather than blink into existence.
            Digit(10),
        ]}
    </div>`;
}

//> Main counter application.
class App extends StyledComponent {

    init() {
        this.value = 1024;
        this.handleInput = this.handleInput.bind(this);
        this.handleMinus = this.handleMinus.bind(this);
        this.handlePlus = this.handlePlus.bind(this);
    }

    handleInput(evt) {
        this.value = Math.max(~~evt.target.value, 0);
        this.render();
    }

    handleMinus() {
        this.value = Math.max(this.value - 1, 0);
        this.render();
    }

    handlePlus() {
        this.value ++;
        this.render();
    }

    styles() {
        return css`
        font-family: system-ui, sans-serif;
        height: 100vh;
        width: 96%;
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .counter {
            display: flex;
            flex-direction: row-reverse;
            height: 1em;
            overflow: hidden;
            font-size: 24vw;
        }
        .digit {
            transition: transform .4s ease-out;
        }
        .digitSlice {
            height: 1em;
            text-align: center;
        }
        .inputGroup {
            margin-top: 6vh;
            input,
            button {
                font-size: 1.6em;
                padding: 6px 10px;
                border-radius: 6px;
                box-shadow: none;
                border: 2px solid #777;
                background: #fff;
                cursor: pointer;
            }
            input {
                margin-left: 8px;
                margin-right: 8px;
                text-align: right;
            }
            button {
                padding-left: 12px;
                padding-right: 12px;
            }
        }
        `;
    }

    compose() {
        return jdom`<main>
            ${Counter(this.value)}
            <div class="inputGroup">
                <button onclick="${this.handleMinus}">-</button>
                <input type="number" value="${this.value}" oninput="${this.handleInput}" autofocus/>
                <button onclick="${this.handlePlus}">+</button>
            </div>
        </main>`;
    }

}

//> Create an instance of the app, and append to the DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.padding = '0';
document.body.style.margin = '0';
