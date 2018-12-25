const READER_END = [];

const isNode = (typeof Node === 'undefined') ? (
    () => false
) : (
    o => o instanceof Node
);

const clipStringEnd = (base, substr) => {
    return base.substr(0, base.length - substr.length);
}

class Reader {

    constructor(stringParts, dynamicParts) {
        this.idx = 0;
        this.subIdx = 0;
        this.parts = [stringParts[0]];

        for (let i = 1; i < stringParts.length; i++) {
            this.parts.push(dynamicParts[i - 1]);
            this.parts.push(stringParts[i]);
        }
    }

    trim() {
        const l = this.parts.length;
        this.parts[0] = this.parts[0].replace(/^\s+/g, '');
        this.parts[l - 1] = this.parts[l - 1].replace(/\s+$/g, '');
    }

    next() {
        const len = this.parts.length;
        const currentPart = this.parts[this.idx];
        const nextIndex = this.idx >= len ? len : this.idx + 1;
        if (typeof currentPart === 'string') {
            const char = currentPart[this.subIdx] || '';
            if (++this.subIdx >= currentPart.length) {
                this.idx = nextIndex;
                this.subIdx = 0;
            }
            return char;
        } else if (this.idx >= len) {
            return READER_END;
        } else {
            this.idx = nextIndex;
            return currentPart;
        }
    }

    backtrack() {
        if (this.subIdx !== 0) {
            this.subIdx --;
        } else {
            this.idx = this.idx <= 1 ? 0 : this.idx - 1;
            if (typeof this.parts[this.idx] === 'string') {
                this.subIdx = this.parts[this.idx].length - 1;
            }
        }
    }

    readUpto(substr) {
        const result = this.readUntil(substr);
        const strings = result[0];
        strings[strings.length - 1] = clipStringEnd(strings[strings.length - 1], substr);

        let count = substr.length;
        while (count--) {
            this.backtrack();
        }
        return result;
    }

    readUntil(substr) {
        const reversedStrings = [''];
        const objects = [];

        let next;
        while (!reversedStrings[0].endsWith(substr) && next !== READER_END) {
            next = this.next();
            if (next === READER_END) {
                break;
            } else if (typeof next === 'string') {
                reversedStrings[0] += next;
            } else {
                objects.push(next);
                reversedStrings.unshift('');
            }
        }
        return [reversedStrings.reverse(), objects];
    }

    clipEnd(substr) {
        const last = this.parts[this.parts.length - 1];
        if (last.endsWith(substr)) {
            this.parts[this.parts.length - 1] = clipStringEnd(last, substr);
            return true;
        }
        return false;
    }

}

const kebabToCamel = kebabStr => {
    let result = '';
    for (let i = 0; i < kebabStr.length; i ++) {
        if (kebabStr[i] === '-') {
            result += kebabStr[++i].toUpperCase();
        } else {
            result += kebabStr[i];
        }
    }
    return result;
}

const parseOpeningTagContents = (tplParts, dynamicParts) => {

    if (tplParts[0][0] === '!') {
        return null; // comment
    } else if (tplParts.length === 1 && !tplParts[0].includes(' ')) {
        const selfClosing = tplParts[0].endsWith('/');
        return {
            jdom: {
                tag: selfClosing ? clipStringEnd(tplParts[0], '/') : tplParts[0],
                attrs: {},
                events: {},
            },
            selfClosing: selfClosing,
        };
    }

    const reader = new Reader(tplParts, dynamicParts);
    reader.trim();
    const selfClosing = reader.clipEnd('/');

    let tag = '';
    const attrs = {};
    const events = {};

    const commit = (key, val) => {
        if (typeof val === 'function') {
            events[key.replace('on', '')] = [val];
        } else {
            if (key === 'class') {
                if (val = val.trim()) {
                    attrs[key] = val.split(' ');
                }
            } else if (key === 'style') {
                const declarations = val.split(';').filter(s => !!s).map(pair => {
                    const [first, ...rest] = pair.split(':');
                    return [kebabToCamel(first.trim()), rest.join(':').trim()];
                });
                const rule = {};
                for (const [prop, val] of declarations) {
                    rule[prop] = val;
                }
                attrs[key] = rule;
            } else {
                attrs[key] = val;
            }
        }
    }

    // tokenize
    let head = [''];
    let head_obj = [];
    let waitingForAttr = false;
    let inQuotes = false;
    const tokens = [];
    const TYPE_KEY = 0,
        TYPE_VALUE = 1;

    let nextType = TYPE_KEY;
    const push = (type, val, force) => {
        if (val !== '' || force) {
            tokens.push({
                type: type,
                value: val,
            });
            waitingForAttr = false;
        }
    }
    const commitToken = (force) => {
        head.reverse();
        if (head.length == 2 && head[0] === '' && head[1] === '') {
            if (head_obj.length === 1 && nextType === TYPE_VALUE) {
                push(TYPE_VALUE, head_obj[0], force);
            } else {
                push(nextType, interpolate(head, head_obj), force);
            }
        } else {
            push(nextType, interpolate(head, head_obj).trim(), force);
        }
        head = [''];
        head_obj = [];
    }
    for (let next = reader.next(); next !== READER_END; next = reader.next()) {
        switch (next) {
            case '=':
                commitToken();
                waitingForAttr = true;
                nextType = TYPE_VALUE;
                break;
            case ' ': // catches all whitespace; we replaced \s+ with ' ' earlier
                if (inQuotes) {
                    head[0] += next;
                } else if (!waitingForAttr) {
                    commitToken();
                    nextType = TYPE_KEY;
                }
                break;
            case '\\':
                if (inQuotes) {
                    next = reader.next();
                    head[0] += next;
                }
                break;
            case '"':
                if (inQuotes) {
                    inQuotes = false;
                    commitToken(true);
                    nextType = TYPE_KEY;
                } else if (nextType === TYPE_VALUE) {
                    inQuotes = true;
                }
                break;
            default:
                if (typeof next === 'string') {
                    head[0] += next;
                } else {
                    head_obj.unshift(next);
                    head.unshift('');
                }
                waitingForAttr = false;
                break;
        }
    }
    commitToken();

    // parse token stream
    tag = tokens.shift().value;
    let last = null,
        curr = tokens.shift();
    const step = () => {
        last = curr;
        curr = tokens.shift();
    }
    while (curr !== undefined) {
        if (curr.type === TYPE_VALUE) {
            commit(last.value, curr.value);
            step();
        } else if (last) {
            commit(last.value, true);
        }
        step();
    }
    if (last && last.type === TYPE_KEY) {
        commit(last.value, true);
    }

    return {
        jdom: {
            tag: tag,
            attrs: attrs,
            events: events,
        },
        selfClosing: selfClosing,
    };
}

const interpolate = (tplParts, dynamicParts) => {
    let str = tplParts[0];
    for (let i = 1; i <= dynamicParts.length; i ++) {
        str += dynamicParts[i - 1] + tplParts[i];
    }
    return str;
}

const parseJSX = (tplParts, dynamicParts) => {
    const result = [];
    const reader = new Reader(tplParts, dynamicParts);

    let currentElement = null;
    let inTextNode = false;
    const commit = () => {
        if (inTextNode) {
            currentElement = currentElement.trim();
        }

        if (currentElement) {
            result.push(currentElement);
        }
        currentElement = null;
        inTextNode = false;
    }

    for (let next = reader.next(); next !== READER_END; next = reader.next()) {
        if (next === '<') {
            commit();
            const result = parseOpeningTagContents(...reader.readUpto('>'));
            reader.readUntil('>');
            currentElement = result && result.jdom;
            if (typeof currentElement === 'object' && currentElement !== null) {
                if (!result.selfClosing) {
                    const closingTag = `</${currentElement.tag}>`;
                    currentElement.children = parseJSX(...reader.readUpto(closingTag));
                    reader.readUntil(closingTag);
                }
            }
        } else if (next instanceof Array && isNode(next[0])) {
            for (const component of next) {
                commit();
                currentElement = component;
            }
        } else if (isNode(next)) {
            commit();
            currentElement = next;
        } else {
            if (!inTextNode) {
                commit();
                inTextNode = true;
                currentElement = '';
            }
            currentElement += next;
        }
    }

    commit();

    return result;
}

const jdom = (tplParts, ...dynamicParts) => {
    try {
        return parseJSX(tplParts.map(part => part.replace(/\s+/g, ' ')), dynamicParts)[0];
    } catch (e) {
        console.error(`Error parsing template: ${interpolate(tplParts, dynamicParts)}\n${'stack' in e ? e.stack : e}`);
    }
}

const exposedNames = {
    jdom,
}
if (typeof window === 'object') {
    for (const name in exposedNames) {
        window[name] = exposedNames[name];
    }
}
if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = exposedNames;
}
