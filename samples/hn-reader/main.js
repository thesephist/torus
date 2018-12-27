//> Hacker News reader in Torus!

const API_ROOT = 'https://hacker-news.firebaseio.com/v0';
const NOW = new Date();

const BRAND_COLOR = '#1fada2';

const hnFetch = async apiPath => {
    const result = await fetch(API_ROOT + apiPath + '.json');
    return await result.json();
}

const formatTime = date => {
    const pad = num => num.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const formatDate = unix => {
    if (!unix) return 'unknown';

    const date = new Date(unix * 1000);
    const delta = (NOW - date) / 1000;
    if (delta < 60) {
        return '&#60;1 min';
    } else if (delta < 3600) {
        return `${~~(delta / 60)} min`;
    } else if (delta < 86400) {
        return `${~~(delta / 3600)} hr`;
    } else if (delta < 86400 * 2) {
        return 'yesterday';
    } else if (delta < 86400 * 3) {
        return '2 days ago';
    } else {
        return date.toLocaleDateString() + ' ' + formatTime(date);
    }
}

const decodeHTML = html => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value.replace(/&/g, '&#38;');
}

const userLink = username => {
    const href = `https://news.ycombinator.com/user?id=${username}`;
    return jdom`<a href="${href}" target="_blank" noreferrer>${username}</a>`;
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
        this.start = 0;
    }

    fetch() {
        hnFetch('/' + this.slug).then(stories => {
            const storyRecords = stories.slice(
                this.start * this.limit,
                (this.start + 1) * this.limit
            ).map((id, idx) => {
                return new Story(id, {
                    order: this.start * this.limit + 1 + idx,
                })
            });
            this.reset(storyRecords);
            for (const story of storyRecords) {
                story.fetch();
            }
        });
    }

    nextPage() {
        this.start ++;
        this.fetch();
    }

    previousPage() {
        this.start = Math.max(0, this.start - 1);
        this.fetch();
    }

}

class Comment extends Item {}

class CommentStore extends StoreOf(Comment) {

    constructor(comment_ids = [], limit = 25) {
        super();
        this.resetWith(comment_ids);
        this.hiddenCount = 0;
        this.limit = limit;
    }

    fetch() {
        for (const comment of this.records) {
            comment.fetch();
        }
    }

    resetWith(comment_ids) {
        this.hiddenCount = Math.max(comment_ids.length - this.limit, 0);
        this.reset(comment_ids.slice(0, this.limit).map(id => new Comment(id)));
    }

}

//> ## Components

class StoryListing extends StyledComponent {

    init(story, expanded = false) {
        this.expanded = expanded;
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
            'width': '100%',
            'cursor': 'pointer',
            '.mono': {
                'font-family': '"Monaco", "Menlo", monospace',
            },
            '.meta': {
                'font-size': '.9em',
                'opacity': .7,
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
                'height': '64px',
                'width': '64px',
                'flex-shrink': 0,
                'text-align': 'center',
                'display': 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                'overflow': 'hidden',
                'border-radius': '6px',
                'background': '#eee',
                'transition': 'background .2s, transform .2s',
                'position': 'relative',
                '&::after': {
                    'content': '""',
                    'display': 'block',
                    'height': '1px',
                    'background': '#555',
                    'width': '52px',
                    'position': 'absolute',
                    'top': '31.5px',
                    'left': '6px',
                },
            },
            '&:hover .stats': {
                'background': BRAND_COLOR,
                'color': '#fff',
                'transform': 'translate(0, -4px)',
                '&::after': {
                    'background': '#fff',
                },
            },
            '.score, .comments': {
                'height': '32px',
                'width': '100%',
                'line-height': '32px',
            },
            '.synopsis': {
                'margin-left': '12px',
                'flex-shrink': 1,
                'overflow': 'hidden',
            },
        }
    }

    setActiveStory() {
        app.setActiveStory(this.record);
    }

    compose(attrs) {
        const text = this.expanded ? decodeHTML(attrs.text) : ':: text post ::';

        return jdom`<li data-id=${attrs.id} onclick="${this.setActiveStory}">
            <div class="stats mono" title="${attrs.score} upvotes, ${attrs.descendants} comments">
                <div class="score">${attrs.score}</div>
                <div class="comments">
                    ${attrs.descendants}
                </div>
            </div>
            <div class="synopsis">
                <div class="title">${attrs.order ? attrs.order + '.' : ''} ${attrs.title}</div>
                <div class="url ${attrs.url || this.expanded ? 'mono' : ''}">
                    ${attrs.url ? (
                        jdom`<a href="${attrs.url}" target="_blank" noreferrer>${attrs.url}</a>`
                    ) : text}
                </div>
                <div class="meta">
                    <span class="time">${formatDate(attrs.time)}</span>
                    |
                    <span class="author">${userLink(attrs.by)}</span>
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
            'background': '#eee',
            'margin-bottom': '12px',
            'padding': '12px',
            'border-radius': '6px',
            'cursor': 'pointer',
            'overflow': 'hidden',
            '.byline': {
                'background': '#aaa',
                'padding': '1px 8px',
                'border-radius': '6px',
                'color': '#fff',
                'display': 'inline-block',
                'margin-bottom': '8px',
                'font-size': '.9em',
                'a': {
                    'color': '#fff',
                },
            },
            '.children': {
                'margin-top': '12px',
                'margin-left': '12px',
            },
            '@media (max-width: 600px)': {
                '.text': {
                    'font-size': '.9em',
                    'line-height': '1.4em',
                },
            },
        }
    }

    toggleFolded() {
        this.folded = !this.folded;
        if (!this.folded && this.comments) this.comments.fetch();
        this.render();
    }

    compose(attrs) {
        return jdom`<div class="comment" onclick="${this.toggleFolded}">
            <div class="byline">
                ${formatDate(attrs.time)}
                |
                ${userLink(attrs.by)}
                |
                ${attrs.kids ? attrs.kids.length : 0} replies</div>
            <div class="text">${decodeHTML(attrs.text)}</div>
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

    styles() {
        return {
            'padding-left': 0,
        }
    }

    compose() {
        return jdom`<ul>
            ${this.nodes}
            ...${this.record.hiddenCount || 'no'} more comments truncated
        </ul>`;
    }

}

class StoryList extends Styled(ListOf(StoryListing)) {

    styles() {
        return {
            'padding-left': 0,
        }
    }

}

class StoryPage extends StyledComponent {

    init(story, expanded = false) {
        this.listing = new StoryListing(story, expanded);
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
            <a href="https://news.ycombinator.com/item?id=${this.record.id}" target="_blank" noreferrer>
                See on news.ycombinator.com
            </a>
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

        this.nextPage = this.nextPage.bind(this);
        this.previousPage = this.previousPage.bind(this);
    }

    styles() {
        return {
            'font-family': '"San Francisco", "Helvetica", "Roboto", sans-serif',
            'color': '#333',
            'box-sizing': 'border-box',
            'padding': '14px',
            'padding-bottom': '24px',
            'line-height': '1.5em',
            'max-width': '800px',
            'margin': '0 auto',
            'h1': {
                'cursor': 'pointer',
            },
            'a': {
                'color': BRAND_COLOR,
            },
            'button': {
                'color': '#fff',
                'background': BRAND_COLOR,
                'padding': '6px 10px',
                'border': 0,
                'font-size': '1em',
                'margin-right': '12px',
                'border-radius': '6px',
                'cursor': 'pointer',
                'transition': 'opacity .2s',
                '&:hover': {
                    'opacity': '.7',
                },
            },
        }
    }

    setActiveStory(story) {
        if (this.activeStory !== story) {
            this.activeStory = story;
            if (story) {
                this.activePage = new StoryPage(story, true);
            } else {
                this.activePage = null;
            }
            document.scrollingElement.scrollTop = 0;
            this.render();
        }
    }

    nextPage() {
        this.stories.nextPage();
    }

    previousPage() {
        this.stories.previousPage();
    }

    compose() {
        return jdom`<main>
            <h1 onclick="${() => this.setActiveStory(null)}">
                ${this.activePage ? '👈' : '🏠'} Hacker News
            </h1>
            ${this.activeStory ? (
                this.activePage.node
            ) : (
                jdom`<div>
                    ${this.list.node}
                    <button onclick="${this.previousPage}">👈 previous</button>
                    <button onclick="${this.nextPage}">next 👉</button>
                </div>`
            )}
        </main>`;
    }

}

//> Create the app instance, which we define earlier to be
//  called with a router, and mount it to the DOM.
const app = new App();
document.body.appendChild(app.node);
