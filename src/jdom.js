// note: anything where value is aufnction iwill be treated as an event listener or ignored.

const READER_END = 1989;

class TplReader {

    constructor(tplParts, dynamicParts) {
        this.tplParts = tplParts;
        this.dynamicParts = dynamicParts;

        this.partIdx = 0;
        this.charIdx = -1;
        this.end = false;
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
        strs.reverse();
        strs[0] = strs[0].replace(substr, '');
        strs.reverse();

        for (const chr of substr) this.backtrack();
        return [strs, objs];
    }

    readUntil(substr) {
        const strs = [''];
        const objs = [];

        let next;
        while (!strs[0].endsWith(substr) && next !== READER_END) {
            next = this.next();
            if (typeof next === 'string') {
                strs[0] += next;
            } else if (next !== READER_END) {
                objs.push(next);
                strs.unshift('');
            }
        }

        return [strs.reverse(), objs];
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

    if (reader.next() === '!') {
        return null; // comment
    } else {
        reader.backtrack();
    }

    const attrs = {};
    const events = {};
    let keyContent = '';
    let valContent = '';

    const commit = (key, val) => {
        if (typeof val === 'function') {
            const eventName = key.replace('on', '');
            if (!(key in events)) events[eventName] = [];
            events[eventName].push(val);
        } else {
            if (key === 'style') {
                const declarations = val.split(';').filter(s => !!s).map(pair => {
                    const [first, ...rest] = pair.split(':');
                    return [kebabToCamel(first), rest.join(':')];
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
        keyContent = '';
        valContent = '';
    }

    const tagName = interpolate(...reader.readUpto(' '));

    for (let next = reader.next(); next !== READER_END; next = reader.next()) {
        switch (next) {
            case '=':
                const nextChar = reader.next();

                let val = null;
                if (nextChar === '"') {
                    val = reader.readUpto('"');
                    reader.readUntil(' ');
                } else {
                    reader.backtrack();
                    val = reader.readUntil(' ');
                }

                if (val[0].length === 2 && val[0][0].trim() == '' && val[0][1].trim() == '') {
                    valContent = val[1][0];
                } else {
                    valContent = interpolate(...val);
                }

                commit(keyContent, valContent);
                break;
            case ' ':
                if (keyContent !== '') {
                    commit(keyContent, true);
                }
                break;
            default:
                keyContent += next;
                break;
        }
    }

    let selfClosing = false;
    reader.backtrack();
    if (reader.next() === '/') {
        selfClosing = true;
    }

    return {
        jdom: {
            tag: tagName,
            attrs: attrs,
            events: events,
        },
        selfClosing: selfClosing,
    };
}

const interpolate = (tplParts, dynamicParts) => {
    let str = tplParts[0];
    for (let i = 1; i < dynamicParts.length; i ++) {
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
        switch (next) {
            case '<':
                commit();
                const result = parseOpeningTagContents(...reader.readUpto('>'));
                reader.readUntil('>');
                currentElement = result.jdom;
                if (typeof currentElement === 'object') {
                    if (!result.selfClosing) {
                        const closingTag = `</${currentElement.tag}>`;
                        currentElement.children = parseJSX(...reader.readUpto(closingTag));
                        reader.readUntil(closingTag);
                    }
                }
                break;
            default:
                if (next instanceof Array && next[0] instanceof Node) {
                    for (const component of next) {
                        commit();
                        currentElement = component;
                    }
                } else if (next instanceof Node) {
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
                break;
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

