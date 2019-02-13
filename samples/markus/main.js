//> A renderer for a custom flavor of markdown, that renders
//  live, with every keystroke. I wrote the `Marked` component
//  to be integrated into my productivity apps (I'm rewriting my
//  notes and todo apps soon), but it also works well as a live
//  editor by itself.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> Like `jdom.js`, this is a unique object that identifies
//  that a reader has reached the last character/line to read. Used
//  for parsing strings.
const READER_END = [];
//> These are the regular expressions (`RE`) that match things
//  like headers, images, and quotes.
const RE_HEADER = /^(#{1,6})\s*(.*)/;
const RE_IMAGE = /^%\s+(\S*)/;
const RE_QUOTE = /^(>+)\s*(.*)/;
const RE_LIST_ITEM = /^(\s*)(-|\d+\.)\s+(.*)/;

//> Delimiters for text styles. If you want the more
//  standard flavor of markdown, you can change these
//  these delimiters to get 90% of the way there (minus
//  the links).
const ITALIC_DELIMITER = '/';
const BOLD_DELIMITER = '*';
const STRIKE_DELIMITER = '~';
const CODE_DELIMITER = '`';
const LINK_DELIMITER_LEFT = '<';
const LINK_DELIMITER_RIGHT = '>';
const PRE_DELIMITER = '``';
const LITERAL_DELIMITER = '%%';

//> Some text expansions / replacements I find convenient.
const BODY_TEXT_TRANSFORMS = new Map([
    // RegExp: replacement
    [/--/g, '—'], // em-dash from two dashes
    [/(\?!|!\?)/g, '‽'], // interrobang!
    [/\$\$/g, '💵'],
    [/:\)/g, '🙂'],
    [/<3/g, '❤️'],
    [/:wave:/g, '👋'],
]);

//> This is the default input that the user sees
//  when they first open the app. It demonstrates the basic syntax.
const INPUT_PLACEHOLDER = `# Write some markdown!

## Hash signs mark /headers/.

Here's some text, with /italics/, *bold*, ~strikethrough~, and \`monospace\` styles. We can also *~/combine/~* these things for */\`more emphasis\`/*.

Let's include some links. Here's one to <https://google.com/>.

> Quotes.
>> Nested quotes, like this...
>> ... even across lines.

We can include lists ...

- First
- Second
    - Third, which is indented
    - Fourth

We can also number lists, and mix both styles.

1. Cal Bears
2. Purdue Boilermakers
3. every other school
    - ???
4. Stanford... trees?


We can include code blocks.

\`\`
#include <stdio.h>

int main() {
    printf("Two backticks denote a code block");

    return 0;
}
\`\`

To include images, prefix the URL with a percent sign:

% https://www.ocf.berkeley.edu/~linuslee/pic.jpg

That's it! Happy markdowning :)

If you're curious about how this app works, you can check out the entire, annotated source code at <https://thesephist.github.io/torus/markdown-parser-demo>, where you'll find annotated JavaScript source files behind this and a few other apps.

This renderer was built with Torus, a UI framework for the web written by Linus, for his personal suite of productivity apps. You can find more information about Torus at <https://github.com/thesephist/torus/>, and you can find Linus at <https://linus.zone/now/>.
`;

//> A generator that yields characters from a string, used for parsing text.
class Reader {

    constructor(str) {
        this.str = str;
        this.idx = 0;
    }

    next() {
        return this.str[this.idx ++] || READER_END;
    }

    //> Look ahead a character, but don't increment the position.
    ahead() {
        return this.str[this.idx] || READER_END;
    }

    //> Reads the string until the first occurrence of a given character.
    until(char) {
        const sub = this.str.substr(this.idx);
        const nextIdx = sub.indexOf(char);
        const part = sub.substr(char, nextIdx);
        this.idx += nextIdx + 1;
        return part;
    }

}

//> Like `Reader`, but for lines. It's used for things like parsing nested lists
//  and block quotes.
class LineReader {

    constructor(lines) {
        this.lines = lines;
        this.idx = 0;
    }

    next() {
        if (this.idx < this.lines.length) {
            return this.lines[this.idx ++];
        } else {
            this.idx = this.lines.length;
            return READER_END;
        }
    }

    //> Decrement the counter, so `next()` will return the same line once again.
    backtrack() {
        this.idx = this.idx - 1 < 0 ? 0 : this.idx - 1;
    }

}

//> Parse "body text", which may include italics, bold text, strikethroughs,
//  and inline code blocks. This also takes care of text expansions defined above.
const parseBody = (reader, tag, delimiter = '') => {
    const children = [];
    let buf = '';
    //> Function to "commit" the text read into the buffer as a child
    //  of body text, so we can add other elements after it.
    const commitBuf = () => {
        for (const re of BODY_TEXT_TRANSFORMS.keys()) {
            buf = buf.replace(re, BODY_TEXT_TRANSFORMS.get(re));
        }
        children.push(buf);
        buf = '';
    }
    let char;
    let last = '';
    //> Loop through each character. If there are delimiters, read until
    //  the end of the delimited chunk of text and parse the contents inside
    //  as the right tag.
    while (last = char, char = reader.next()) {
        switch (char) {
            //> Backslash is an escape character, so anything that comes
            //  right after it is just read into the buffer.
            case '\\':
                buf += reader.next();
                break;
            //> If we find the delimiter `parseBody` was called with, that means
            //  we've reached the end of the delimited sequence of text we were
            //  reading from `reader` and must return control flow to the calling function.
            case delimiter:
                if (last === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    return {
                        tag: tag,
                        children: children,
                    }
                }
                break;
            //> If we reach the end of the body text, commit everything we've got
            //  so far and return the whole thing.
            case READER_END:
                commitBuf();
                return {
                    tag: tag,
                    children: children,
                }
            //> Each of these delimiter cases check if the next character
            //  is a space. If it is, it may just be that the user is trying to type, e.g.
            //  3 < 10 or async / await. We don't count those characters as styling delimiters.
            //  That would be annoying for the user.
            case ITALIC_DELIMITER:
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    children.push(parseBody(reader, 'em', ITALIC_DELIMITER));
                }
                break;
            case BOLD_DELIMITER:
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    children.push(parseBody(reader, 'strong', BOLD_DELIMITER));
                }
                break;
            case STRIKE_DELIMITER:
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    children.push(parseBody(reader, 'strike', STRIKE_DELIMITER));
                }
                break;
            case CODE_DELIMITER:
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    children.push({
                        tag: 'code',
                        //> Rather than recursively parsing the text inside a code
                        //  block, we just take it verbatim. Otherwise symbols like * and /
                        //  in code have to be escaped, which would be really annoying.
                        children: [reader.until(CODE_DELIMITER)],
                    });
                }
                break;
            //> If we find a link, we read until the end of the link and return
            //  a JDOM object that's a clickable link tag that opens in another tab.
            case LINK_DELIMITER_LEFT:
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    commitBuf();
                    const url = reader.until(LINK_DELIMITER_RIGHT);
                    children.push({
                        tag: 'a',
                        attrs: {
                            href: url || '#',
                            rel: 'noopener',
                            target: '_blank',
                        },
                        children: [url],
                    });
                }
                break;
            //> If none of the special cases matched, just add the character
            //  to the buffer we're reading to.
            default:
                buf += char;
                break;
        }
    }

    throw new Error('This should not happen while reading body text!');
}

//> Given a reader of lines, parse (potentially) nested lists recursively.
const parseList = lineReader => {
    const children = [];

    //> We check out the first line in the sequence to determine
    //  how far indented we are, and what kind of list (number, bullet)
    //  it is.
    let line = lineReader.next();
    const [_, indent, prefix] = RE_LIST_ITEM.exec(line);
    const tag = prefix === '-' ? 'ul' : 'ol';
    const indentLevel = indent.length;
    lineReader.backtrack();

    //> Loop through the next few lines from the reader.
    while ((line = lineReader.next()) !== READER_END) {
        const [_, _indent, prefix] = RE_LIST_ITEM.exec(line) || [];
        //> If there's a valid list item prefix, we count it as a list item.
        if (prefix) {
            //> We compare the indentation level of this line, versus the
            //  first line in the list.
            const thisIndentLevel = line.indexOf(prefix);
            //> If it's indented less, we've stumbled upon the end of the
            //  list section. Backtrack and return control to the parent list
            //  or block.
            if (thisIndentLevel < indentLevel) {
                lineReader.backtrack();
                return {
                    tag: tag,
                    children: children,
                }
            //> If it's the same indentation, treat it as the next item in the list.
            //  Parse the list content as body text, and add it to the list of children.
            } else if (thisIndentLevel === indentLevel) {
                const body = line.match(/\s*(?:\d+\.|-)\s*(.*)/)[1];
                children.push(parseBody(new Reader(body), 'li'));
            //> If this line is indented farther than the first line,
            //  that means it's the start of a further-nested list.
            //  Call `parseList` recursively, and add the returned list
            //  as a child.
            } else { // thisIndentLevel > indentLevel
                lineReader.backtrack();
                children.push(parseList(lineReader));
            }
        //> If there's no valid list item prefix, it's the end of the list.
        } else {
            lineReader.backtrack();
            return {
                tag: tag,
                children: children,
            }
        }
    }
    return {
        tag: tag,
        children: children,
    }
}

//> Like `parseList`, but for nested block quotes.
const parseQuote = lineReader => {
    const children = [];

    //> Look ahead at the first line to determine how far nested we are.
    let line = lineReader.next();
    const [_, nestCount] = RE_QUOTE.exec(line);
    const nestLevel = nestCount.length;
    lineReader.backtrack();

    //> Loop through each line in the block quote.
    while ((line = lineReader.next()) !== READER_END) {
        const [_, nestCount, quoteText] = RE_QUOTE.exec(line) || [];
        //> If we're able to find a line matching the block quote regex,
        //  count it as another line in the block.
        if (quoteText !== undefined) {
            const thisNestLevel = nestCount.length;
            //> If this line is nested less than the first line,
            //  it's the end of this block quote. Return control to the
            //  parent block quote.
            if (thisNestLevel < nestLevel) {
                lineReader.backtrack();
                return {
                    tag: 'q',
                    children: children,
                }
            //> If this line is indented same as the first line,
            //  continue reading the quote.
            } else if (thisNestLevel === nestLevel) {
                children.push(parseBody(new Reader(quoteText), 'p'));
            //> If this line is indented further in, it's the start
            //  of another nested quote block. Call itself recursively.
            } else { // thisNestLevel > nestLevel
                lineReader.backtrack();
                children.push(parseQuote(lineReader));
            }
        //> If the line didn't match the block quote regex, it's
        //  the end of the block quote, so return what we have.
        } else {
            lineReader.backtrack();
            return {
                tag: 'q',
                children: children,
            }
        }
    }
    return {
        tag: 'q',
        children: children,
    }
}

//> Main Torus function component for the parser. This component takes
//  a string input, parses it into JDOM (HTML elements), and returns it
//  in a `<div>`.
const Markus = str => {

    //> Make a new line reader that we'll pass to functions to read the input.
    const lineReader = new LineReader(str.split('\n'));

    //> Various parsing state registers.
    let inCodeBlock = false;
    let codeBlockResult = '';
    let inLiteralBlock = false;
    let literalBlockResult = '';
    const result = [];

    let line;
    while ((line = lineReader.next()) !== READER_END) {
        //> If we're in a code block, don't do more parsing
        //  and add the line directly to the code block
        if (inCodeBlock) {
            if (line === PRE_DELIMITER) {
                result.push({
                    tag: 'pre',
                    children: [codeBlockResult],
                });
                inCodeBlock = false;
                codeBlockResult = '';
            } else {
                codeBlockResult += line + '\n';
            }
        //> ... likewise for literal HTML blocks.
        } else if (inLiteralBlock) {
            if (line === LITERAL_DELIMITER) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = literalBlockResult;
                result.push(wrapper);
                inLiteralBlock = false;
                literalBlockResult = '';
            } else {
                literalBlockResult += line;
            }
        //> If the line starts with a hash sign, it's a header! Parse it as such.
        } else if (line.startsWith('#')) {
            const [_, hashes, header] = RE_HEADER.exec(line);
            //> The HTML tag is `'h'` followed by the number of `#` signs.
            result.push(parseBody(new Reader(header), 'h' + hashes.length));
        //> If the line matches the image line format, parse the URL
        //  out of the line and add a link that wraps the image, so it's clickable
        //  in the final result HTML.
        } else if (RE_IMAGE.exec(line)) {
            const [_, imageURL] = RE_IMAGE.exec(line);
            result.push({
                tag: 'a',
                attrs: {
                    href: imageURL || '#',
                    rel: 'noopener',
                    target: '_blank',
                    style: {cursor: 'pointer'},
                },
                children: [{
                    tag: 'img',
                    attrs: {
                        src: imageURL,
                        style: {maxWidth: '100%'},
                    },
                }],
            });
        //> If the line matches a block quote format, backtrack
        //  and send the control off to the block quote parser, including the
        //  line we just read.
        } else if (RE_QUOTE.exec(line)) {
            lineReader.backtrack();
            result.push(parseQuote(lineReader));
        //> Detect horizontal dividers and handle it.
        } else if (line === '- -') {
            result.push({tag: 'hr'});
        //> Detect start of a code block
        } else if (line === PRE_DELIMITER) {
            inCodeBlock = true;
        //> Detect start of a literal HTML block
        } else if (line === LITERAL_DELIMITER) {
            inLiteralBlock = true;
        //> Detect list formats (numbered, bullet) and
        //  if they're found, send the control flow off to
        //  the list parsing function.
        } else if (RE_LIST_ITEM.exec(line)) {
            lineReader.backtrack();
            result.push(parseList(lineReader));
        //> If none of the above match, it's a plain old boring
        //  paragraph. Read the line as a paragraph body.
        } else {
            result.push(parseBody(new Reader(line), 'p'));
        }
    }

    //> Return the array of children wrapped in a `<div>`, with some padding
    //  at the bottom so it's freely scrollable during editing.
    return jdom`<div class="render" style="padding-bottom:75vh">${result}</div>`;
}

//> The app component wraps the entire application and handles state.
class App extends StyledComponent {

    init() {
        //> If we've previously saved the user input, pull that back out.
        //  Otherwise, use the default placeholder.
        this.inputValue = window.localStorage.getItem('markusInput') || INPUT_PLACEHOLDER;

        //> Bind a few methods we're using to handle input.
        this.handleInput = this.handleInput.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);

        //> Before the user leaves the site, we want to save the user input to
        //  local storage so we can pull it back out later when the user visits the site again.
        window.addEventListener('beforeunload', () => {
            window.localStorage.setItem('markusInput', this.inputValue);
        });
    }

    styles() {
        return {
            'box-sizing': 'border-box',
            'font-family': 'sans-serif',
            'display': 'flex',
            'flex-direction': 'column',
            'justify-content': 'space-between',
            'align-items': 'flex-start',
            'height': '100vh',
            'width': '100%',
            'max-width': '1600px',
            'margin': '0 auto',
            'overflow': 'hidden',
            '.title': {
                'margin': '20px 18px 0 18px',
                'font-weight': 'normal',
                'color': '#888',
                '.dark': {
                    'color': '#000',
                },
            },
            '.renderContainer': {
                'display': 'flex',
                'flex-direction': 'row',
                'justify-content': 'space-between',
                'align-items': 'flex-start',
                'height': 'calc(100% - 60px)',
                'width': '100%',
                'padding': '16px',
                'box-sizing': 'border-box',
            },
            '.half': {
                'width': 'calc(50% - 8px)',
                'height': '100%',
                'box-sizing': 'border-box',
            },
            '.render, textarea': {
                'box-sizing': 'border-box',
                'border': 0,
                'box-shadow': '0 3px 8px -1px rgba(0, 0, 0, .3)',
                'padding': '12px',
                'border-radius': '6px',
                'background': '#fff',
                'height': '100%',
                '-webkit-overflow-scrolling': 'touch',
                'overflow-y': 'auto',
            },
            'textarea': {
                'font-family': '"Fira Code", "Menlo", "Monaco", monospace',
                'width': '100%',
                'resize': 'none',
                'font-size': '14px',
                'outline': 'none',
                'color': '#999',
                'line-height': '1.5em',
                '&:focus': {
                    'color': '#000',
                },
            },
            '.result': {
                'height': '100%',
            },
            '.render': {
                //> Styles for things that are rendered by the markdown parser
                'p': {
                    'line-height': '1.5em',
                },
                'li': {
                    'margin-bottom': '6px',
                },
                'pre': {
                    'padding': '8px',
                    'overflow-x': 'auto',
                },
                'code': {
                    'padding': '1px 5px',
                    'margin': '0 2px',
                },
                'pre, code': {
                    'font-family': '"Menlo", "Monaco", monospace',
                    'background': '#eee',
                    'line-height': '1.5em',
                    'border-radius': '4px',
                },
                'q': {
                    //> By default, block quotes are just displayed
                    //  with double quotes around the text. We're displaying it
                    //  like how we may see block quotes in email threads.
                    '&::before, &::after': {
                        'content': '""',
                    },
                    'display': 'block',
                    'border-left': '3px solid #777',
                    'padding-left': '6px',
                },
            },
        }
    }

    //> When the input changes, set the new local state
    //  and queue up another render using `requestAnimationFrame`, to be
    //  efficient with when we render (not necessarily now, just before
    //  the next frame).
    handleInput(evt) {
        this.inputValue = evt.target.value;
        requestAnimationFrame(() => this.render());
    }

    //> This is a way to make sure `TAB` keys can be used
    //  to enter four spaces (yay spaces instead of tabs!) instead
    //  of tab to the next input on the page. This makes the textarea
    //  behave like a text editor, allowing you to indent with tab.
    handleKeydown(evt) {
        if (evt.key === 'Tab') {
            evt.preventDefault();
            const idx = evt.target.selectionStart;
            if (idx !== null) {
                const front = this.inputValue.substr(0, idx);
                const back = this.inputValue.substr(idx);
                this.inputValue = front + '    ' + back;
                this.render();
                //> Rendering the new input value will
                //  make us lose focus on the textarea, so we put the
                //  focus back by selecting the area the user was just editing.
                evt.target.setSelectionRange(idx + 4, idx + 4);
            }
        }
    }

    compose() {
        return jdom`<main>
            <h1 class="title"><span class="dark">Markus</span>, a live markdown renderer</h1>
            <div class="renderContainer">
                <div class="half result">
                    ${Markus(this.inputValue)}
                </div>
                <div class="half markdown">
                    <textarea autofocus value="${this.inputValue}" oninput="${this.handleInput}"
                        placeholder="Start writing ..." onkeydown="${this.handleKeydown}" />
                </div>
            </div>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
//> Basic grey background and reset of the default margin on `<body>`
document.body.style.backgroundColor = '#f8f8f8';
document.body.style.margin = '0';
