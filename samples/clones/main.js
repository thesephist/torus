//> Clones of popular complex web applications to test rendering
//  fidelity.

//> Task: Build a complex UI (FB5, Twitter, Trello clone) in Torus
//  and actually measure perf in depe trees, using function components
//  liberally to be conservative and not cut Torus any corners.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

const CLONES = {};

//> ## Facebook Clone
CLONES.Facebook = class extends StyledComponent {

    compose() {
        return jdom`Facebook`;
    }

}

//> ## GitHub Clone
CLONES.GitHub = class extends StyledComponent {

    compose() {
        return jdom`GH`;
    }

}

//> ## Twitter Clone
CLONES.Twitter = class extends StyledComponent {

    compose() {
        return jdom`Twitter`;
    }

}

class App extends StyledComponent {

    init() {
        this.activeClone = CLONES.Facebook;
    }

    switchView(cloneName) {
        this.activeClone = CLONES[cloneName];
        this.render();
    }

    styles() {
        return css`
        font-family: system-ui, sans-serif;
        `;
    }

    compose() {
        return jdom`<main>
            <h1>Clones</h1>
            <nav>
                <button onclick="${this.switchView.bind(this, 'Facebook')}">Facebook</button>
                <button onclick="${this.switchView.bind(this, 'GitHub')}">GitHub</button>
                <button onclick="${this.switchView.bind(this, 'Twitter')}">Twitter</button>
            </nav>
            <div id="cloneContainer">
                ${new this.activeClone().node}
            </div>
        </main>`;
    }

}

//> Create an instance of the app, and append to the DOM.
const app = new App();
document.body.appendChild(app.node);
