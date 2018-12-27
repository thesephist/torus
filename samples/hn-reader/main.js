//> Hacker News reader in Torus!

//> A few constants used through the app. The root URL for the
//  Hacker News JSON API and the current time, for calculating relative datetimes.
const API_ROOT = 'https://hacker-news.firebaseio.com/v0';
const NOW = new Date();

//> Used later in styles to keep colors consistent
const BRAND_COLOR = '#1fada2';

//> An abstraction over the Hacker News JSON API. Given a short path, it
//  expands it out and makes sure no requests are cached by the browser,
//  then returns the result in a JSON format. `hnFetch()` also handles caching,
//  so multiple requests about the same thing only result on one request
//  using the `CACHE`, which is a map from API routes to responses.
const CACHE = new Map();
const hnFetch = async (apiPath, skipCache) => {
    if (!CACHE.has(apiPath) || skipCache) {
        const result = await fetch(API_ROOT + apiPath + '.json', {
            cache: 'no-cache',
        }).then(resp => resp.json());
        CACHE.set(apiPath, result)
        return result;
    } else {
        return CACHE.get(apiPath);
    }
}

//> Formats times into 24-hour format, which is what I personally prefer.
const formatTime = date => {
    const pad = num => num.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

//> A date formatter that does relative dates in English for the last
//  2 days.
const formatDate = unix => {
    if (!unix) return 'some time ago';

    const date = new Date(unix * 1000);
    const delta = (NOW - date) / 1000;
    if (delta < 60) {
        return '&#60;1 min ago';
    } else if (delta < 3600) {
        return `${~~(delta / 60)} min ago`;
    } else if (delta < 86400) {
        return `${~~(delta / 3600)} hr ago`;
    } else if (delta < 86400 * 2) {
        return 'yesterday';
    } else if (delta < 86400 * 3) {
        return '2 days ago';
    } else {
        return date.toLocaleDateString() + ' ' + formatTime(date) + ' ago';
    }
}

//> Hacker News's text posts have content in escaped HTML. This is the
//  most consistent way I've found to decode that easily. Torus's HTML
//  renderer can render HTML entities encoded with the char code, but not names.
const decodeHTML = html => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value.replace(/&/g, '&#38;');
}

//> Shortcut function to go from a username to the link to the user's profile
//  on news.ycombinator.com. I didn't make a user view in this app
//  because I personally rarely visit profiles on HN.
const userLink = username => {
    const href = `https://news.ycombinator.com/user?id=${username}`;
    return jdom`<a href="${href}" target="_blank" noreferrer>${username}</a>`;
}

//> ## Records and Stores

//> In HN API, all stories, comments, and text posts inherit from `Item`.
class Item extends Record {

    /* Items have the following attrs we care about:
     *  id: number
     *  type: 'job', 'story', 'comment', 'poll/pollopt' (which we ignore)
     *  by: username in string
     *  time: unix
     *  text: text content
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

    //> Use the `type` property as a proxy to check if the rest
    //  are already loaded, so we don't double-fetch.
    get loaded() {
        return this.get('type');
    }

}

//> Story inherits from Item but doesn't have any special powers yet.
class Story extends Item {}

//> A collection of stories, used for rendering the top stories view.
class StoryStore extends StoreOf(Story) {

    //> `slug` is the URL slug for the pages on HN: top, best, newest, etc.
    constructor(slug, limit = 25) {
        super();
        this.slug = slug;
        this.limit = limit;
        this.start = 0;
    }

    //> Get an already-loaded story from the store by ID so we don't have to
    //  re-fetch a brand new story later.
    getById(storyID) {
        for (const story of this.records) {
            if (story.id === storyID) return story;
        }
        return null;
    }

    //> Fetch all the new top stories from the API and reset the collection
    //  with those new stories.
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

    //> Because the collection is paged with `limit`, we need to be able to
    //  flip to the next and previous pages. These take care of that.
    //  It could be more efficient, but it works, and flipping pages is
    //  not super frequent in the average HN reader use case, so it's not a catastrophe.
    nextPage() {
        this.start ++;
        this.reset();
        this.fetch();
    }

    previousPage() {
        this.start = Math.max(0, this.start - 1);
        this.reset();
        this.fetch();
    }

}

//> Comments are a kind of Item in the API
class Comment extends Item {}

//> A collection of comments
class CommentStore extends StoreOf(Comment) {

    constructor(comment_ids = [], limit = 25) {
        super();
        this.resetWith(comment_ids);
        //> Comment lists have a limit set so we don't load excessively,
        //  but it's nice to know how many were hidden away as a result. That's
        //  `hiddenCount`.
        this.hiddenCount = 0;
        this.limit = limit;
    }

    fetch() {
        for (const comment of this.records) {
            comment.fetch();
        }
    }

    //> Reset the collection with a new list of comment IDs (from a parent comment).
    //  This might seem like a wonky way to do things, but it's mirroring the API itself,
    //  which is also sort of weird.
    resetWith(comment_ids) {
        this.hiddenCount = Math.max(comment_ids.length - this.limit, 0);
        this.reset(comment_ids.slice(0, this.limit).map(id => new Comment(id)));
    }

}

//> ## Components

//> Represents a listing in the main page's list of stories
class StoryListing extends StyledComponent {

    //> Stories stay collapsed in the list, and are expanded if they're viewed individually
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
            '.content': {
                'color': '#777',
                'font-size': '1em',
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

    //> To read more about a story (read the comments), we tell the router
    //  to go to the path, so the main app view can manage the rest.
    setActiveStory() {
        router.go(`/story/${this.record.id}`);
    }

    compose(attrs) {
        const text = this.expanded ? decodeHTML(attrs.text || '') : ':: text post ::';

        const score = attrs.score || 0;
        const descendants = attrs.descendants || 0;
        const title = attrs.title || '...';
        const url = attrs.url || '';
        const time = attrs.time || 0;
        const author = attrs.by || '...';

        return jdom`<li data-id=${attrs.id} onclick="${this.setActiveStory}">
            <div class="stats mono" title="${score} upvotes, ${descendants} comments">
                <div class="score">${score}</div>
                <div class="comments">${descendants}</div>
            </div>
            <div class="synopsis">
                <div class="title">${attrs.order ? attrs.order + '.' : ''} ${title}</div>
                <div class="url ${(url || !this.expanded) ? 'mono' : 'content'}">
                    ${url ? (
                        jdom`<a href="${url}" target="_blank" noreferrer>${url}</a>`
                    ) : text}
                </div>
                <div class="meta">
                    <span class="time">${formatDate(time)}</span>
                    |
                    <span class="author">${userLink(author)}</span>
                </div>
            </div>
        </li>`;
    }

}

//> Represents a single comment in a nested list of comments
class CommentListing extends StyledComponent {

    init(comment) {
        this.folded = true;
        //> Comments can always nest other comments as children.
        //  So each comment view has a collection of children comments.
        this.comments = new CommentStore();
        this.kidsList = new CommentList(this.comments);
        //> Anytime the `kids` property on the parent comment changes,
        //  reload the nested children comments.
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
                    'font-size': '.95em',
                    'line-height': '1.4em',
                },
            },
        }
    }

    //> The user can click/tap on the comment block to collapse or expand
    //  the comments nested under it.
    toggleFolded(evt) {
        evt.stopPropagation();
        this.folded = !this.folded;
        if (!this.folded && this.comments) this.comments.fetch();
        this.render();
    }

    compose(attrs) {
        //> If a comment has been deleted, all the other information are zeroed out,
        //  so we have to treat it separately and show a placeholder.
        if (attrs.deleted) {
            return jdom`<div class="comment" onclick="${this.toggleFolded}">
                <div class="byline">unknown</div>
                <div class="text">- deleted comment -</div>
                ${!this.folded ? (jdom`<div class="children">
                    ${this.kidsList.node}
                </div>`) : ''}
            </div>`;
        }

        const time = attrs.time || 0;
        const author = attrs.by || '...';
        const text = attrs.text || ''
        const kids = attrs.kids || [];

        return jdom`<div class="comment" onclick="${this.toggleFolded}">
            <div class="byline">
                ${formatDate(time)}
                |
                ${userLink(author)}
                |
                ${kids.length} replies</div>
            <div class="text">${decodeHTML(text)}</div>
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

//> List of comments, both at the top level and nested under other comments
class CommentList extends Styled(ListOf(CommentListing)) {

    //> <ul> elements automatically come with a default left padding we don't want.
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

//> List of stories that appears on the main/home page. Most of the
//  main page styles are handled in `App`, so we just use this component
// to clear margins on the <ul>.
class StoryList extends Styled(ListOf(StoryListing)) {

    styles() {
        return {
            'padding-left': 0,
        }
    }

}

//> A `StoryPage` is the page showing an individual story and any comments under it.
//  It holds both a story listing view, as well as a comment list view.
class StoryPage extends StyledComponent {

    init(story, expanded = false) {
        //> Listing of the story this page is about, in expanded form
        this.listing = new StoryListing(story, expanded);
        //> A list of comments for this story
        this.comments = new CommentStore();
        this.commentList = new CommentList(this.comments);
        //> When the list of children comments for the story loads/changes, re-render
        //  the comment list.
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

//> Main app view
class App extends StyledComponent {

    init(router) {
        //> Active story is null iff we're looking at the main page / list of stories
        this.activeStory = null;
        this.activePage = null;

        //> We load the top stories list from the HN API. There are others, but
        //  I really never read them so yeah.
        this.stories = new StoryStore('topstories', 20);
        this.list = new StoryList(this.stories);
        //> Fetch the first page of stories
        this.stories.fetch();

        this.nextPage = this.nextPage.bind(this);
        this.previousPage = this.previousPage.bind(this);

        //> Define our routing actions.
        this.bind(router, ([name, params]) => {
            switch (name) {
                case 'story':
                    let story = this.stories.getById(+params.storyID);
                    //> Story sometimes doesn't exist in our collection,
                    //  if we're going directly to a story link from another page.
                    //  In this case, we want to just fetch information about the
                    //  story itself manually.
                    if (!story) {
                        story = new Story(+params.storyID);
                        story.fetch();
                    }
                    this.setActiveStory(story);
                    break;
                default:
                    //> The default route is just the main page, `'/'`.
                    this.setActiveStory(null);
                    break;
            }
        });
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
            //> These styles still cascade, so this styles all links on the page
            'a': {
                'color': BRAND_COLOR,
            },
            //> This styles all buttons on the page
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
            'footer': {
                'margin': '32px 0',
                'color': '#aaa',
                'font-style': 'italic',
            },
        }
    }

    //> Used to set an active story for the whole app. Called by the router logic.
    setActiveStory(story) {
        if (this.activeStory !== story) {
            this.activeStory = story;
            if (story) {
                this.activePage = new StoryPage(story, true);
            } else {
                this.activePage = null;
            }
            this.resetScroll();
            this.render();
        }
    }

    nextPage() {
        this.stories.nextPage();
        this.resetScroll();
    }

    previousPage() {
        this.stories.previousPage();
        this.resetScroll();
    }

    //> When views switch, it's nice to automatically scroll up to the top of the page
    //  to read the new stuff. This does that.
    resetScroll() {
        document.scrollingElement.scrollTop = 0;
    }

    compose() {
        return jdom`<main>
            <h1 onclick="${() => router.go('/')}">
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
            <footer>This HN reader was made with the
                <a href="https://linus.zone/torus" target="_blank" noreferrer>Torus framework</a>
                and &#60;3 by
                <a href="https://linus.zone/now" target="_blank" noreferrer>Linus</a>
            </footer>
        </main>`;
    }

}

// Let's define our routes!
const router = new Router({
    story: '/story/:storyID',
    default: '/',
});

//> Create the app instance, which we define earlier to be
//  called with a router, and mount it to the DOM.
const app = new App(router);
document.body.appendChild(app.node);
