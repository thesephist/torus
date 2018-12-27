//> The tabs sample project demonstrates the Torus Router and `Component.from()`.
//  All of the state here is kept within the views for demonstration purposes,
//  but should probably be moved to a Record under the App instance
//  in practice for simplicity.

//> This is a single tab page. Because we want tab contents to be long-lived,
//  we define it as a function, but make a class component out of it with `Component.from()`
//  This makes a class component that can be constructed with the arguments `number`, `content`,
//  whose compose function produces the given DOM.
const Tab = Component.from((number, content) => {
    return jdom`<div>
        <h2>Tab #${number}</h2>
        <p>${content}</p>
    </div>`;
});

//> The tab buttons are nav buttons to switch between tabs using the Torus router.
//  Because it's such a simple component, we just write it as a function to reuse in `App`.
const TabButton = (number, active) => {
    const link = `/tab/${number}`;

    //> We can tell the router to go to a specific location with `Router#go()`.
    return jdom`<button style="${active ? 'background:#555;color:#fff' : ''}"
        onclick="${() => router.go(link)}">Switch to tab #${number}
    </button>`;
}

//> The app contains all 3 tabs and a row of tab buttons.
class App extends StyledComponent {

    init(router) {
        //> We want to keep the tabs around even if they aren't visible, so we create them here.
        this.tabs = [
            new Tab(0, 'The first tab\'s content is pretty bland, nothing special here.'),
            new Tab(1, 'The second tab is a bit more interesting, but it\'s really nothing of substance.'),
            new Tab(2, 'The third tab embarks on a dazzling discourse of human fallacies.'),
        ];

        //> By default the active tab is the 0th tab.
        this.setActiveTab(0);

        //> Rather than binding this component to some model, we bind it to the router.
        //  This means every time the URL changes, an event will fire with the name we gave
        //  the matching route, and any parameters we gave the route.
        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'tab':
                    this.setActiveTab(params.tabNumber);
                    break;
                default:
                    //> If no routes match, let's make tab 0 active
                    router.go('/tabs/0');
                    break;
            }
        });
    }

    styles() {
        return {
            'font-family': 'sans-serif',
        }
    }

    setActiveTab(tabNumber) {
        //> `this.activeTab` will always point to the current active tab component
        this.activeTab = this.tabs[tabNumber];
        this.render();
    }

    compose() {
        return jdom`
            <main>
                <h1>Tabbed View</h1>
                <ul>${this.tabs.map((tab, number) => {
                    return TabButton(number, tab === this.activeTab)
                })}</ul>
                ${this.activeTab.node}
            </main>
        `;
    }

}

//> We define the app's router here, by giving it a dictionary
//  of the routes we want, keyed by unique names.
const router = new Router({
    tab: '/tab/:tabNumber',
    default: '/',
});

//> Create the app instance, which we define earlier to be
//  called with a router, and mount it to the DOM.
const app = new App(router);
document.body.appendChild(app.node);
