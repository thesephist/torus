//> Clones of popular complex web applications to test rendering
//  performance.

//> Original motivation: Build a complex UI (FB5, Twitter, Trello clone) in Torus
//  and actually measure perf in deep trees, using function components
//  liberally to be conservative and not cut Torus any corners in rendering.

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
}

const FBFSItem = label => {
    return jdom`<li class="fsItem">
        <span>ICON</span>
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

class FBFavoritesSidebar extends Styled(Component.from(() => {
    return jdom`<div class="favoritesSidebar column">
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
        width: 200px;
        .fsItem {
            cursor: pointer;
            box-sizing: border-box;
            transition: background .2s, transform .2s;
            padding: 2px 6px;
            &:hover {
                background: rgba(0, 0, 0, .1);
            }
            &:active {
                transform: scale(.96);
            }
        }
        `;
    }
}

const FBPost = ({
    annotation,
    profile,
    date,
    content,
    likes,
    comments,
}) => {
    return jdom`<div class="fbPost panel">
        <div class="fbPostAnnotation">${annotation}</div>
        <div class="fbPostBody">
            <div class="fbPostProfile">${profile}</div>
            <div class="fbPostDate">${date.toLocaleString()}</div>
            <div class="fbPostContent">${content}</div>
        </div>
        <div class="fbPostStats">
            <div class="fbPostLikes">${likes} likes</div>
            <div class="fbPostComments">${comments} comments</div>
        </div>
    <div>`;
}

const FBComposePost = () => {
    return jdom`<div class="fbPost fbCompose panel">
        <div class="postHead">
            Create Post
        </div>
        <div class="postComposer">
            <textarea placeholder="What's on your mind?"></textarea>
        </div>
    </div>`;
}

class FBPostList extends Styled(Component.from(() => {
    return jdom`<div class="fbPostList column">
        ${FBComposePost()}
        ${[
            {
                annotation: 'By linus',
                profile: 'Linus Lee',
                date: new Date(),
                content: 'this is some content',
                likes: '10k',
                comments: '100k',
            },
            {
                annotation: 'By linus',
                profile: 'Linus Lee',
                date: new Date(),
                content: 'this is some content',
                likes: '10k',
                comments: '100k',
            },
            {
                annotation: 'By linus',
                profile: 'Linus Lee',
                date: new Date(),
                content: 'this is some content',
                likes: '10k',
                comments: '100k',
            },
        ].map(FBPost)}
    </div>`;
})) {
    styles() {
        return css`
        min-width: 360px;
        width: 40%;
        .fbPostAnnotation {
            font-weight: bold;
            padding-bottom: 8px;
        }
        .fbPostBody {
            border-top: 1px solid #aaa;
            border-bottom: 1px solid #aaa;
        }
        .fbPostProfile {
            font-weight: bold;
            padding: 8px 0;
        }
        .fbPostDate {
            padding-bottom: 12px 0;
            color: #777;
        }
        .fbPostContent {
            font-size: 1.5em;
            line-height: 1.5em;
        }
        .fbPostStats {
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
        }
        `;
    }
}

const FBStoryItem = (label, description) => {
    return jdom`<div class="fbStoryItem">
        <div class="fbStoryLabel">${label}</div>
        <div class="fbStoryDescription">${description}</div>
    </div>`;
}

class FBPanelSidebar extends Styled(Component.from(() => {
    return jdom`<div class="fbPanelSidebar column">
        <div class="storiesPanel panel">
            <div class="title">Stories</div>
            <div class="fbStoryList">
                ${FBStoryItem('Add to Your Story', 'do it now')}
                ${FBStoryItem('John Smith', '15 hours ago')}
                ${FBStoryItem('Amy Zahn', '12 hours ago')}
            </div>
        </div>
        <div class="fbEventsSidebar panel">
            <div class="title">Events</div>
            <div class="fbEvents">2 events this week</div>
        </div>
        <div class="fbPagesSidebar panel">
            <div class="title">Your Pages</div>
        </div>
        <div class="fbAdSidebar panel">
            <div class="title">Sponsored Ad</div>
        </div>
    </div>`;
})) {

    styles() {
        return css`
        width: 200px;
        .title {
            font-weight: bold;
        }
        .fbStoryItem {
            display: flex;
            flex-direction: column;
            padding: 4px 8px;
        }
        .fbStoryLabel {
            font-weight: bold;
        }
        .fbStoryDescription {
            color: #777;
        }
        `;
    }

}

//> Main Facebook component
CLONES.Facebook = class extends StyledComponent {

    styles() {
        return css`
        display: flex;
        flex-direction: column;
        width: 100%;
        min-height: 100vh;
        .contents {
            margin-top: 50px;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: flex-start;
            background: #f0f0f0;
            flex-grow: 1;
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
        .column {
            padding: 12px;
        }
        .panel {
            background: #fff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, .3);
            border-radius: 4px;
            padding: 12px 16px;
            box-sizing: border-box;
            margin-bottom: 8px;
        }
        `;
    }

    compose() {
        return jdom`<div class="tabRoot">
            ${new FBHeader().node}
            <div class="contents">
                ${new FBFavoritesSidebar().node}
                ${new FBPostList().node}
                ${new FBPanelSidebar().node}
            </div>
        </div>`;
    }

}

//> ## GitHub Clone
CLONES.GitHub = class extends StyledComponent {

    compose() {
        return jdom`GitHub Clone (not built yet)`;
    }

}

//> ## Twitter Clone
CLONES.Twitter = class extends StyledComponent {

    compose() {
        return jdom`Twitter clone (not built yet)`;
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
