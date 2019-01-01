//> A renderer for a custom flavor of markdown

const READER_END = [];
const RE_HEADER = /^(#{1,6})\s*(.*)/;
const RE_LIST_ITEM = /^(\s*)(\-|\d+\.)\s+(.*)/;

const ITALIC_DELIMITER = '/';
const BOLD_DELIMITER = '*';
const STRIKE_DELIMITER = '~';
const CODE_DELIMITER = '`';
const LINK_DELIMITER_LEFT = '<';
const LINK_DELIMITER_RIGHT = '>';

const PRE_DELIMITER = '``';
const LITERAL_DELIMITER = '%%';

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
                commitBuf();
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    children.push(parseBody(reader, 'em', ITALIC_DELIMITER));
                }
                break;
            case BOLD_DELIMITER:
                commitBuf();
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    children.push(parseBody(reader, 'strong', BOLD_DELIMITER));
                }
                break;
            case STRIKE_DELIMITER:
                commitBuf();
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    children.push(parseBody(reader, 'strike', STRIKE_DELIMITER));
                }
                break;
            case CODE_DELIMITER:
                commitBuf();
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
                    children.push(parseBody(reader, 'code', CODE_DELIMITER));
                }
                break;
            case LINK_DELIMITER_LEFT:
                commitBuf();
                if (reader.ahead() === ' ') {
                    buf += char;
                } else {
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
        const [_, _indent, prefix] = RE_LIST_ITEM.exec(line) || [];
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
        } else if (line === '- -') {
            result.push({tag: 'hr'});
        } else if (line === PRE_DELIMITER) {
            inCodeBlock = true;
        } else if (line === LITERAL_DELIMITER) {
            inLiteralBlock = true;
        } else if (RE_LIST_ITEM.exec(line)) {
            lineReader.backtrack();
            result.push(parseList(lineReader, 0));
        } else {
            result.push(parseBody(new Reader(line), 'p'));
        }
    }

    return jdom`<div>${result}</div>`;
}

class App extends StyledComponent {

    init() {
        this.inputValue = `
# header
## Subheader
### Subsubheader
\`\`
longer code block
function() {
    log('hi');
}
\`\`
%%
<img alt="An image" />
%%
- -
Plain / text * sample, /italic / slant/, *bold * bold*, ~strikethrough~, \`code block\`, Link to <https:/google.com/>
- list
- list
    - sublist item 2
More text, /like this/
1. Test
2. Test more
    2. Test again`;

        this.handleInput = this.handleInput.bind(this);
    }

    styles() {
        return {
            '.renderer': {
                'display': 'flex',
                'flex-direction': 'row',
                'justify-content': 'space-between',
                'align-items': 'flex-start',
            },
            '.markdown': {
                'width': '50%',
            },
            '.result': {
                'width': '50%',
            },
            'textarea': {
                'width': '100%',
                'height': '300px',
                'box-sizing': 'border-box',
            },
        }
    }

    handleInput(evt) {
        this.inputValue = evt.target.value;
        this.render();
    }

    compose() {
        return jdom`<main>
            <h1>Markus</h1>
            <div class="renderer">
                <div class="markdown">
                    <textarea value="${this.inputValue}" oninput="${this.handleInput}" />
                </div>
                <div class="result">
                    ${Markus(this.inputValue)}
                </div>
            </div>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
