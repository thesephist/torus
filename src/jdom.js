// note: anything where value is a function will be treated as an event listener or ignored.

const READER_END = 1989;

const isNode = (typeof Node === 'undefined') ? (
    () => false
) : (
    o => o instanceof Node
)

class TplReader {

    constructor(tplParts, dynamicParts) {
        this.tplParts = tplParts;
        this.dynamicParts = dynamicParts;

        this.partIdx = 0;
        this.charIdx = -1;
        this.end = false;
    }

    trim() {
        const l = this.tplParts.length;
        this.tplParts[0] = this.tplParts[0].replace(/^\s+/, '');
        this.tplParts[l-1] = this.tplParts[l-1].replace(/\s+$/, '');
    }

    next() {
        if (this.end) return READER_END;

        this.charIdx ++;
        if (this.charIdx >= this.tplParts[this.partIdx].length) {
            this.partIdx ++;
            this.charIdx = -1;

            if (this.partIdx >= this.tplParts.length) {
                this.end = true;
                return READER_END;
            } else {
                return this.dynamicParts[this.partIdx - 1];
            }
        } else {
            return this.tplParts[this.partIdx][this.charIdx];
        }
    }

    backtrack() {
        if (this.charIdx === -1) {
            if (this.partIdx !== 0) {
                this.partIdx --;
                this.charIdx = this.tplParts[this.partIdx].length - 1;
            }
        } else {
            this.charIdx --;
        }

        if (this.end) this.end = false;
    }

    readUpto(substr) {
        const [strs, objs] = this.readUntil(substr);
        strs[strs.length - 1] = strs[strs.length - 1].replace(substr, '');

        for (const chr of substr) this.backtrack();
        return [strs, objs];
    }

    readUntil(substr) {
        const strs = [''];
        const objs = [];

        let next;
        while (!strs[0].endsWith(substr) && next !== READER_END) {
            next = this.next();
            if (typeof next === 'string' || typeof next === 'undefined') {
                strs[0] += next;
            } else if (next !== READER_END) {
                objs.push(next);
                strs.unshift('');
            }
        }

        return [strs.reverse(), objs];
    }

    get lastPart() {
        return this.tplParts[this.tplParts.length - 1];
    }

    clipEnd(substr) {
        const last = this.lastPart;
        if (last.endsWith(substr)) {
            this.tplParts[this.tplParts.length - 1] =
                last.substr(0, last.length - substr.length);
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
    const reader = new TplReader(tplParts, dynamicParts);
    reader.trim();
    const selfClosing = reader.clipEnd('/');

    if (reader.next() === '!') {
        return null; // comment
    } else {
        reader.backtrack();
    }

    let tag = '';
    const attrs = {};
    const events = {};

    const commit = (key, val) => {
        if (typeof val === 'function') {
            const eventName = key.replace('on', '');
            if (!(key in events)) events[eventName] = [];
            events[eventName].push(val);
        } else {
            if (key === 'class') {
                attrs[key] = val.trim().split(' ');
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
    const push = (type, val) => {
        if (val !== '') {
            tokens.push({
                type: type,
                value: val,
            });
            waitingForAttr = false;
        }
    }
    const commitToken = () => {
        head.reverse();
        if (head.length == 2 && head[0] === '' && head[1] === '') {
            if (head_obj.length === 1 && nextType === TYPE_VALUE) {
                push(TYPE_VALUE, head_obj[0]);
            } else {
                push(nextType, interpolate(head, head_obj));
            }
        } else {
            push(nextType, interpolate(head, head_obj).trim());
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
                    commitToken();
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
    const reader = new TplReader(tplParts, dynamicParts);

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
        console.error(`Error parsing invalid HTML template: ${interpolate(tplParts, dynamicParts)}\n${'stack' in e ? e.stack : e}`);
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

