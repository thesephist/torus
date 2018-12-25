// The tabs sample project demonstrates the jdom tagged template
//  function to construct JDOM more easily, from a JSX-like syntax,
//  and also demonstrates creating function components with Component.from.
// All of the state here is kept within the views for demonstration purposes,
//  but should probably be moved to a Record under the App instance
//  in practice for simplicity.

const Tab = Component.from((number, content) => {
    return jdom`<div>
        <h2>Tab #${number}</h2>
        <p>${content}</p>
    </div>`;
});

class TabButton extends StyledComponent {

    init({number, setActiveTab}) {
        this.number = number;
        this.setActiveTab = setActiveTab;
        this.active = false;
    }

    styles() {
        return {
            '&.active': {
                'background': '#555',
                'color': '#fff',
            }
        }
    }

    markActive(yes) {
        this.active = yes;
        this.render();
    }

    compose() {
        return jdom`<button class="${this.active ? 'active' : ''}"
            onclick="${this.setActiveTab}">Switch to ${this.number}
        </button>`;
    }

}

class App extends StyledComponent {

    init() {
        this.tabs = [
            new Tab(0, 'The first tab\'s content is pretty bland, nothing special here.'),
            new Tab(1, 'The second tab is a bit more interesting, but it\'s really nothing of substance.'),
            new Tab(2, 'The third tab embarks on a dazzling discourse of human fallacies.'),
        ];
        this.tabButtons = this.tabs.map(tab => {
            return new TabButton({
                number: this.tabs.indexOf(tab),
                setActiveTab: () => this.setActiveTab(tab),
            });
        });
        this.setActiveTab(this.tabs[0]);
    }

    styles() {
        return {
            'font-family': 'sans-serif',
        }
    }

    setActiveTab(tab) {
        const tabNumber = this.tabs.indexOf(tab);
        if (this.activeTab) {
            this.tabButtons[tabNumber].markActive(false);
        }
        this.activeTab = tab;
        this.tabButtons[tabNumber].markActive(true);
        this.render();
    }

    compose() {
        return jdom`
            <main>
                <h1>Tabbed View</h1>
                <ul>${this.tabButtons.map(c => c.node)}</ul>
                ${this.activeTab.node}
            </main>
        `;
    }

}

const app = new App();
document.body.appendChild(app.node);
