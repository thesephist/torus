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

class FBHeader extends Styled(Component.from(() => {
    return jdom`<header>
        <div class="left">
            <div class="logo">f</div>
            <div class="searchArea">
                <input type="search" placeholder="Search"/>
                <button class="searchButton">Search</button>
            </div>
        </div>
        <div class="right">
            <div class="wordLinks">
                <div class="profile link">Linus</div>
                <div class="link">Home</div>
                <div class="link">Create</div>
            </div>
            |
            <div class="notifications">
                <div class="notif icon link">Friends</div>
                <div class="notif icon link">Messages</div>
                <div class="notif icon link">Notifications</div>
            </div>
            |
            <div class="settings">
                <div class="icon link">Help</div>
            </div>
        </div>
    </header>`;
})) {
    styles() {
        return css`
        background: navy;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
        padding: 8px 16px;
        color: #fff;

        .left,
        .right,
        .searchArea,
        .wordLinks,
        .notifications,
        .settings {
            display: flex;
            flex-direction: row;
            align-items: center;
        }
        .right {
            .link {
                font-weight: bold;
                padding: 2px 6px;
                &:hover {
                    opacity: .7;
                    cursor: pointer;
                }
            }
        }

        .logo {
            font-weight: bold;
            color: navy;
            height: 28px;
            width: 28px;
            background: #fff;
            font-size: 30px;
            margin-right: 6px;
            text-align: center;
            border-radius: 4px;
        }
        .searchArea {
            height: 28px;
            border-radius: 4px;
            overflow: hidden;
            input {
                color: #333;
                padding: 2px 6px;
                font-size: 1em;
                border: 0;
                height: 100%;
            }
            .searchButton {
                background: #eee;
                height: 100%;
                border: 0;
                font-size: 1em;
            }
        }
        `;
    }
};

const FBFSItem = (label) => {
    return jdom`<li class="fsItem">
        ${label}
    </li>`;
}

const FBFSSection = (title, labels) => {
    return jdom`<div class="fsSection">
        <div class="fsSectionTitle">
            ${title}
        </div>
        <ul>
            ${labels.map(FBFSItem)}
        </ul>
    </div>`;
}

const FBPost = (
    annotation,
    profile,
    content,
    likes,
    comments,
) => {
    return jdom`<div class="fbPost">
        post
    <div>`;
}

const FBComposePost = () => {
    return jdom`<div class="fbPost fbCompose">
        <div class="postHead">Create Post</div>
    </div>`;
}

class FBPostList extends Styled(Component.from(() => {
    return jdom`<div class="fbPostList">
        ${FBComposePost()}
    </div>`;
})) {
    styles() {
        return css`
        background: pink;
        `;
    }
}

class FBFavoritesSidebar extends Styled(Component.from(() => {
    return jdom`<div class="favoritesSidebar">
        ${FBFSSection('Main', [
            'News Feed',
            'Messenger',
            'Watch',
            'Marketplace',
        ])}
        ${FBFSSection('Shortcuts', [
            'Cal Hacks 2019 Fellows',
            'Berkeley STEP',
            'BearX',
            'Cal Hacks',
            'BearX Community',
            'Hackathon Hackers',
            'The Anvil',
            'React DeCal Alum',
            'subtle asian traits',
            'Berkeley Kairos Society',
        ])}
        ${FBFSSection('Explore', [
            'Events',
            'Groups',
            'Oculus',
            'Pages',
            'Fundraisers',
            'Manage Apps',
            'Jobs',
            'Messenger Kids',
            'Town Hall',
            'Ads Manager',
        ])}
    </div>`;
})) {
    styles() {
        return css`
            background: #eee;
        `;
    }
};

//> Main Facebook component
CLONES.Facebook = class extends StyledComponent {

    styles() {
        return css`
        width: 100%;
        .contents {
            margin-top: 50px;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: flex-start;
        }
        ul {
            padding-left: 0;
        }
        .fsSectionTitle {
            font-weight: bold;
        }
        li {
            list-style: none;
        }
        `;
    }

    compose() {
        return jdom`<div class="tabRoot">
            ${new FBHeader().node}
            <div class="contents">
                ${new FBFavoritesSidebar().node}
                ${new FBPostList().node}
            </div>
        </div>`;
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
        .tabHeader,
        nav {
            display: flex;
            flex-direction: row;
            align-items: center;

            button {
                background: #fff;
                color: #333;
                border-radius: 6px;
                padding: 4px 6px;
                margin-left: 8px;
                box-shadow: none;
                font-size: 1em;
                border: 1px solid #aaa;
                cursor: pointer;

                &:hover {
                    background: #ddd;
                }
                &:active {
                    background: #aaa;
                }
            }
        }
        .tabHeader {
            justify-content: space-between;
            box-sizing: border-box;
            padding: 16px;
            height: 40px;
            border: 1px solid #333;
            position: fixed;
            bottom: 8px;
            left: 8px;
            background: #fff;

            h1 {
                font-size: 20px;
            }
        }
        `;
    }

    compose() {
        return jdom`<main>
            <header class="tabHeader">
                <h1>Clones</h1>
                <nav>
                    <button onclick="${this.switchView.bind(this, 'Facebook')}">Facebook</button>
                    <button onclick="${this.switchView.bind(this, 'GitHub')}">GitHub</button>
                    <button onclick="${this.switchView.bind(this, 'Twitter')}">Twitter</button>
                </nav>
            </header>
            <div id="cloneContainer">
                ${new this.activeClone().node}
            </div>
        </main>`;
    }

}

//> Create an instance of the app, and append to the DOM.
const app = new App();
document.body.appendChild(app.node);
