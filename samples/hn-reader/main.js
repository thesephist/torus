//> Hacker News reader in Torus!

const API_ROOT = 'https://hacker-news.firebaseio.com/v0';

const hnFetch = async apiPath => {
    const result = await fetch(API_ROOT + apiPath + '.json');
    return await result.json();
}

const formatTime = date => {
    const pad = num => num.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const formatDate = unix => {
    let result = 'unknown time';
    if (unix) {
        const date = new Date(unix * 1000);
        result = date.toLocaleDateString() + ' ' + formatTime(date);
    }
    return result;
}

const decodeHTML = html => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
}

//> ## Records and Stores

class Item extends Record {

    /* Items have the following attrs we care about:
     *  id: number
     *  deleted: boolean
     *  type: 'job', 'story', 'comment', 'poll/pollopt' (which we ignore)
     *  by: username in string
     *  time: unix
     *  text: text content
     *  dead: boolean
     *  parent: id of parent story or comment
     *  kids: kids in display order ranked
     *  url: string
     *  score: number of votes, or #votes for pollopt
     *  title: string
     *  descendants: total comment count
     */
    fetch() {
        if (!this.loaded) {
            hnFetch(`/item/${this.id}`).then(data => {
                const { id, ...attrs } = data;
                this.update(attrs);
            });
        }
    }

    get loaded() {
        return this.get('type');
    }

}

class Story extends Item {}

class StoryStore extends StoreOf(Story) {

    constructor(slug, limit = 25) {
        super();
        this.slug = slug;
        this.limit = limit;
    }

    fetch() {
        hnFetch('/' + this.slug).then(stories => {
            const storyRecords = stories.slice(0, this.limit)
                .map(id => new Story(id));
            this.reset(storyRecords);
            for (const story of storyRecords) {
                story.fetch();
            }
        });
    }

}

class Comment extends Item {}

class CommentStore extends StoreOf(Comment) {

    constructor(comment_ids = [], limit = 25) {
        super();
        this.resetWith(comment_ids);
        this.limit = limit;
    }

    fetch() {
        for (const comment of this.records) {
            comment.fetch();
        }
    }

    resetWith(comment_ids) {
        this.reset(comment_ids.slice(0, this.limit).map(id => new Comment(id)));
    }

}

//> ## Components

class StoryListing extends StyledComponent {

    init(story) {
        this.bind(story, data => this.render(data));
        this.setActiveStory = this.setActiveStory.bind(this);
    }

    styles() {
        return {
            'display': 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            'justify-content': 'flex-start',
            'margin-bottom': '24px',
            '.mono': {
                'font-family': '"Monaco", "Menlo", monospace',
            },
            '.meta': {
                'font-size': '.9em',
                'opacity': .6,
                'span': {
                    'display': 'inline-block',
                    'margin': '0 4px',
                },
            },
            '.url': {
                'overflow': 'hidden',
                'text-overflow': 'ellipsis',
                'font-size': '.8em',
            },
            '.stats': {
                'height': '100%',
                'width': '52px',
                'flex-shrink': 0,
                'text-align': 'center',
                'display': 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
            },
            '.score, .comments': {
                'background': '#eee',
                'height': '50%',
                'width': '100%',
            },
        }
    }

    setActiveStory() {
        app.setActiveStory(this.record);
    }

    compose(attrs) {
        return jdom`<li data-id=${attrs.id}>
            <div class="stats">
                <div class="score">${attrs.score}</div>
                <div class="comments" onclick="${this.setActiveStory}">
                    ${attrs.descendants}
                </div>
            </div>
            <div class="synopsis">
                <div class="title">${attrs.title}</div>
                <div class="url mono">
                    ${attrs.url ? (
                        jdom`<a href="${attrs.url}" target="_blank" noreferrer>${attrs.url}</a>`
                    ) : (':: text thread')}
                </div>
                <div class="meta">
                    <span class="time mono">${formatDate(attrs.time)}</span>
                    |
                    <span class="author">${attrs.by}</span>
                </div>
            </div>
        </li>`;
    }

}

class CommentListing extends StyledComponent {

    init(comment) {
        this.folded = true;
        this.comments = new CommentStore();
        this.kidsList = new CommentList(this.comments);
        this.bind(comment, data => {
            this.comments.resetWith(data.kids || []);
            if (!this.folded) this.comments.fetch();
            this.render(data);
        });
        this.toggleFolded = this.toggleFolded.bind(this);
    }

    styles() {
        return {
            '.byline': {
                'color': '#777',
            },
            '.children': {
                'margin-top': '12px',
            },
        }
    }

    toggleFolded() {
        this.folded = !this.folded;
        if (!this.folded && this.comments) this.comments.fetch();
        this.render();
    }

    compose(attrs) {
        return jdom`<div class="comment">
            <div class="byline">${formatDate(attrs.time)} | ${attrs.by} | ${attrs.kids ? attrs.kids.length : 0} children</div>
            <div class="text" onclick="${this.toggleFolded}">${decodeHTML(attrs.text)}</div>
            ${!this.folded ? (jdom`<div class="children">
                ${this.kidsList.node}
            </div>`) : ''}
        </div>`;
    }

    remove() {
        super.remove();
        this.kidsList.remove();
    }

}

class CommentList extends Styled(ListOf(CommentListing)) {

}

class StoryList extends Styled(ListOf(StoryListing)) {

    styles() {
        return {
            'padding-left': 0,
        }
    }

}

class StoryPage extends StyledComponent {

    init(story) {
        this.listing = new StoryListing(story);
        this.comments = new CommentStore();
        this.commentList = new CommentList(this.comments);
        this.bind(story, data => {
            this.comments.resetWith(data.kids || []);
            this.comments.fetch();
            this.render(data);
        });
    }

    compose() {
        return jdom`<section>
            ${this.listing.node}
            ${this.commentList.node}
        </section>`;
    }

    remove() {
        super.remove();
        this.commentList && this.commentList.remove();
    }

}

class App extends StyledComponent {

    init() {
        this.activeStory = null;
        this.activePage = null;

        this.stories = new StoryStore('topstories', 20);
        this.list = new StoryList(this.stories);
        this.stories.fetch();
    }

    styles() {
        return {
            'font-family': '"San Francisco", "Helvetica", "Roboto", sans-serif',
            'color': '#333',
            'box-sizing': 'border-box',
            'padding': '24px 48px',
        }
    }

    setActiveStory(story) {
        if (this.activeStory !== story) {
            this.activeStory = story;
            if (story) {
                this.activePage = new StoryPage(story);
            }
            this.render();
        }
    }

    compose() {
        return jdom`<main>
            <h1 onclick="${() => this.setActiveStory(null)}">Hacker News</h1>
            ${this.activeStory ? this.activePage.node : this.list.node}
        </main>`;
    }

}

//> Create the app instance, which we define earlier to be
//  called with a router, and mount it to the DOM.
const app = new App();
document.body.appendChild(app.node);
