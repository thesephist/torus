//> A renderer for a custom flavor of markdown

const READER_END = [];
const RE_HEADER = /^(#{1,6})\s*(.*)/;
const RE_IMAGE = /^%\s+(\S*)/;
const RE_QUOTE = /^(>+)\s*(.*)/;
const RE_LIST_ITEM = /^(\s*)(\-|\d+\.)\s+(.*)/;

const ITALIC_DELIMITER = '/';
const BOLD_DELIMITER = '*';
const STRIKE_DELIMITER = '~';
const CODE_DELIMITER = '`';
const LINK_DELIMITER_LEFT = '<';
const LINK_DELIMITER_RIGHT = '>';

const PRE_DELIMITER = '``';
const LITERAL_DELIMITER = '%%';

const BODY_TEXT_TRANSFORMS = new Map([
    // RegExp: replacement
    [/\-\-/g, '—'],
    [/(\?\!|\!\?)/g, '‽'],
    [/\$\$/g, '💵'],
    [/:\)/g, '🙂'],
    [/<3/g, '❤️'],
    [/:wave:/g, '👋'],
]);

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

class Reader {

    constructor(str) {
        this.str = str;
        this.idx = 0;
    }

    next() {
        return this.str[this.idx ++] || READER_END;
    }

    ahead() {
        return this.str[this.idx] || READER_END;
    }

    until(char) {
        const sub = this.str.substr(this.idx);
        const nextIdx = sub.indexOf(char);
        const part = sub.substr(char, nextIdx);
        this.idx += nextIdx + 1;
        return part;
    }

}

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

    backtrack() {
        this.idx = this.idx - 1 < 0 ? 0 : this.idx - 1;
    }

}

const parseBody = (reader, tag, delimiter = '') => {
    const children = [];
    let buf = '';
    const commitBuf = () => {
        for (const re of BODY_TEXT_TRANSFORMS.keys()) {
            buf = buf.replace(re, BODY_TEXT_TRANSFORMS.get(re));
        }
        children.push(buf);
        buf = '';
    }
    let char;
    let last = '';
    while (last = char, char = reader.next()) {
        switch (char) {
            case '\\':
                buf += reader.next();
                break;
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
            case READER_END:
                commitBuf();
                return {
                    tag: tag,
                    children: children,
                }
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
                        children: [reader.until(CODE_DELIMITER)],
                    });
                }
                break;
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
            default:
                buf += char;
                break;
        }
    }

    throw new Error('This should not happen.');
}

const parseList = (lineReader) => {
    const children = [];

    let line = lineReader.next();
    const [_, indent, prefix] = RE_LIST_ITEM.exec(line);
    const tag = prefix === '-' ? 'ul' : 'ol';
    const indentLevel = indent.length;
    lineReader.backtrack();

    while ((line = lineReader.next()) !== READER_END) {
        const [_, indent, prefix] = RE_LIST_ITEM.exec(line) || [];
        if (prefix) {
            const thisIndentLevel = line.indexOf(prefix);
            if (thisIndentLevel < indentLevel) {
                lineReader.backtrack();
                return {
                    tag: tag,
                    children: children,
                }
            } else if (thisIndentLevel === indentLevel) {
                const body = line.match(/\s*(?:\d+\.|\-)\s*(.*)/)[1];
                children.push(parseBody(new Reader(body), 'li'));
            } else { // thisIndentLevel > indentLevel
                lineReader.backtrack();
                children.push(parseList(lineReader));
            }
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

const parseQuote = (lineReader) => {
    const children = [];

    let line = lineReader.next();
    const [_, nestCount] = RE_QUOTE.exec(line);
    const nestLevel = nestCount.length;
    lineReader.backtrack();

    while ((line = lineReader.next()) !== READER_END) {
        const [_, nestCount, quoteText] = RE_QUOTE.exec(line) || [];
        if (quoteText !== undefined) {
            const thisNestLevel = nestCount.length;
            if (thisNestLevel < nestLevel) {
                lineReader.backtrack();
                return {
                    tag: 'q',
                    children: children,
                }
            } else if (thisNestLevel === nestLevel) {
                children.push(parseBody(new Reader(quoteText), 'p'));
            } else { // thisNestLevel > nestLevel
                lineReader.backtrack();
                children.push(parseQuote(lineReader));
            }
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

const Markus = str => {

    const lineReader = new LineReader(str.split('\n'));

    let inCodeBlock = false;
    let codeBlockResult = '';
    let inLiteralBlock = false;
    let literalBlockResult = '';
    let result = [];

    let line;
    window.lineReader = lineReader;
    while ((line = lineReader.next()) !== READER_END) {
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
        } else if (line.startsWith('#')) {
            const [_, hashes, header] = RE_HEADER.exec(line);
            result.push(parseBody(new Reader(header), 'h' + hashes.length));
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
        } else if (RE_QUOTE.exec(line)) {
            lineReader.backtrack();
            result.push(parseQuote(lineReader));
        } else if (line === '- -') {
            result.push({tag: 'hr'});
        } else if (line === PRE_DELIMITER) {
            inCodeBlock = true;
        } else if (line === LITERAL_DELIMITER) {
            inLiteralBlock = true;
        } else if (RE_LIST_ITEM.exec(line)) {
            lineReader.backtrack();
            result.push(parseList(lineReader));
        } else {
            result.push(parseBody(new Reader(line), 'p'));
        }
    }

    return jdom`<div class="render" style="padding-bottom:75vh">${result}</div>`;
}

class App extends StyledComponent {

    init() {
        this.inputValue = INPUT_PLACEHOLDER;
        this.handleInput = this.handleInput.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
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
                //> Styles for things that are rendered by the markdown
                'p': {
                    'line-height': '1.5em',
                },
                'li': {
                    'margin-bottom': '6px',
                },
                'pre': {
                    'padding': '8px',
                },
                'code': {
                    'padding': '4px',
                    'margin': '0 2px',
                },
                'pre, code': {
                    'font-family': '"Menlo", "Monaco", monospace',
                    'background': '#eee',
                    'line-height': '1.5em',
                    'border-radius': '6px',
                },
                'q': {
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

    handleInput(evt) {
        this.inputValue = evt.target.value;
        requestAnimationFrame(() => this.render());
    }

    handleKeydown(evt) {
        if (evt.keyCode === 9) { // Tab key
            evt.preventDefault();
            const idx = evt.target.selectionStart;
            if (idx) {
                const front = this.inputValue.substr(0, idx);
                const back = this.inputValue.substr(idx);
                this.inputValue = front + '    ' + back;
                this.render();
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
                    <textarea value="${this.inputValue}" oninput="${this.handleInput}"
                        placeholder="Start writing ..." onkeydown="${this.handleKeydown}" />
                </div>
            </div>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.backgroundColor = '#f8f8f8';
document.body.style.margin = '0';
