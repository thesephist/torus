//> Check if an object is probably a JDOM. Useful for embedding JDOM directly
//  inside templates.
const isJDOM = obj => typeof obj === 'object' && obj !== null && 'tag' in obj;

//> If we're in a browser environment, `isNode()` should check if the given
//  object is a node or JDOM. If not, there's no reason an object would be a Node,
//  so just check for JDOM. This function is set at load-time to make run-time calls fast.
const isNode = (typeof Node === 'undefined') ? isJDOM : (
    o => o instanceof Node || isJDOM(o)
);

//> Clip the end of a given string by the length of a substring
const clipStringEnd = (base, substr) => {
    return base.substr(0, base.length - substr.length);
}

//> Interpolate between lists of string and non-string parts into a single string.
//  this is particularly useful when objects and strings are mixed in an attribute value.
const interpolate = (tplParts, dynamicParts) => {
    let str = tplParts[0];
    for (let i = 1; i <= dynamicParts.length; i ++) {
        str += dynamicParts[i - 1] + tplParts[i];
    }
    return str;
}

//> `READER_END` is a unique symbol that represents that the reader
//  has reached the end of the template. Making it an array ensures
//  that no other === comparisons can return true. We can use Symbol()
//  here but [] is shorter, and enough.
const READER_END = [];

//> The `Reader` class represents a sequence of tokens we can read from
//  a JDOM template. It can distinguish between string / number tokens
//  and tokens that are more complex objects or functions, to be passed
//  directly into the renderer.
class Reader {

    constructor(stringParts, dynamicParts) {
        //> The major index which points to the item in `this.parts`
        //  that contains our current token.
        this.idx = 0;
        //> The minor (sub) index is nonzero iff the major index points to
        //  a string, and points to the character inside that string that's our
        //  current token.
        this.subIdx = 0;
        this.parts = [stringParts[0]];

        //> Parse the string and dynamic (object, function) parts
        //  into a single heterogeneous array. We'll read from this
        //  using two indexes above.
        for (let i = 1; i < stringParts.length; i++) {
            this.parts.push(dynamicParts[i - 1]);
            this.parts.push(stringParts[i]);
        }
    }

    //> Trim whitespace around the entire template.
    trim() {
        const l = this.parts.length;
        this.parts[0] = this.parts[0].replace(/^\s+/g, '');
        this.parts[l - 1] = this.parts[l - 1].replace(/\s+$/g, '');
    }

    //> Returns the next token (like a `generator.next()`), compatible
    //  with the heterogeneous nature of the template.
    next() {
        const len = this.parts.length;
        const currentPart = this.parts[this.idx];
        //> We allow the reader index pointer to go one over the length
        //  of the template -- that represents `READER_END`. This is also
        //  helpful because we allow the reader to be backtracked.
        const nextIndex = this.idx >= len ? len : this.idx + 1;
        //> Read character-by-character if the part is a string
        if (typeof currentPart === 'string') {
            const char = currentPart[this.subIdx] || '';
            if (++this.subIdx >= currentPart.length) {
                this.idx = nextIndex;
                this.subIdx = 0;
            }
            return char;
        } else if (this.idx >= len) {
            //> If the index goes more than one over the template length,
            //  return `READER_END`
            return READER_END;
        } else {
            this.idx = nextIndex;
            return currentPart;
        }
    }

    //> Move back the token pointer one place.
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

    //> Read all the tokens up to a specified _contiguous_ substring,
    //  but not including the substring. In practice this is achieved
    //  by leaning on `#readUntil()`, and then backtracking.
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

    //> Read up to and including a _contiguous_ substring, or read until
    //  the end of the template.
    readUntil(substr) {
        const strings = [''];
        const objects = [];

        let next;
        //> Read until the read queue of strings ends in the substring, or the end
        while (!strings[strings.length - 1].endsWith(substr) && next !== READER_END) {
            next = this.next();
            if (next === READER_END) {
                break;
            } else if (typeof next === 'string') {
                strings[strings.length - 1] += next;
            } else {
                objects.push(next);
                strings.push('');
            }
        }
        return [strings, objects];
    }

    //> Remove some substring from the end of the template, if it ends in the substring.
    //  This also returns whether the given substring was a valid ending substring.
    clipEnd(substr) {
        const last = this.parts[this.parts.length - 1];
        if (last.endsWith(substr)) {
            this.parts[this.parts.length - 1] = clipStringEnd(last, substr);
            return true;
        }
        return false;
    }

}

//> For converting CSS property names to their JavaScript counterparts
const kebabToCamel = kebabStr => {
    let result = '';
    for (let i = 0; i < kebabStr.length; i++) {
        result += kebabStr[i] === '-' ? kebabStr[++i].toUpperCase() : kebabStr[i];
    }
    return result;
}

//> Pure function to parse the contents of an HTML opening tag to a JDOM stub
const parseOpeningTagContents = (tplParts, dynamicParts) => {

    //> If the opening tag is just the tag name (the most common case), take
    //  a shortcut and run a simpler algorithm.
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

    //> Make another reader to read the tag contents
    const reader = new Reader(tplParts, dynamicParts);
    reader.trim();
    const selfClosing = reader.clipEnd('/');

    let tag = '';
    const attrs = {};
    const events = {};

    //> `commit()` commits a given key-value pair of attributes to the JDOM stub.
    //  it treats class lists and style dictionaries separately, and adds function
    //  values as event handlers.
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

    //> Read the individual tokens into a list of higher level tokens:
    //  things that may be attribute names, and values.
    let head = [''];
    let head_obj = [];
    //> Are we waiting to read an attribute value?
    let waitingForAttr = false;
    //> Are we in a quoted attribute value?
    let inQuotes = false;
    //> Array of parsed higher-level tokens
    const tokens = [];
    const TYPE_KEY = 0,
        TYPE_VALUE = 1;

    let nextType = TYPE_KEY;
    //> Push a given token into the tokens list, called by `commitToken()`
    const push = (type, val, force) => {
        if (val !== '' || force) {
            tokens.push({
                type: type,
                value: val,
            });
            waitingForAttr = false;
        }
    }
    //> Read from the list of currently read characters/parts
    //  and commit the result as a token, interpolating any spread-out
    //  string parts.
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
    //> Iterate through each read character or object from the reader and parse
    //  the token stream into larger tokens.
    for (let next = reader.next(); next !== READER_END; next = reader.next()) {
        switch (next) {
            //> Equals sign denotes the start of an attribute value unless in quotes
            case '=':
                if (inQuotes) {
                    head[0] += next;
                } else {
                    commitToken();
                    waitingForAttr = true;
                    nextType = TYPE_VALUE;
                }
                break;
            //> Because we replaced all whitespace with spaces earlier, this catches
            //  all whitespaces. Whitespaces are only meaningful separates of values
            //  if we're not in quotes.
            case ' ':
                if (inQuotes) {
                    head[0] += next;
                } else if (!waitingForAttr) {
                    commitToken();
                    nextType = TYPE_KEY;
                }
                break;
            //> Allow backslash to escape characters if we're in quotes.
            case '\\':
                if (inQuotes) {
                    next = reader.next();
                    head[0] += next;
                }
                break;
            //> If we're in quotes, '"' escapes quotes. Otherwise, it opens
            //  a quoted section.
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
                //> Append all other characters to the head
                if (typeof next === 'string') {
                    head[0] += next;
                } else {
                    //> If we get a non-string value, append it to the array
                    //  of non-string values (`head_obj`) and push a new
                    //  contiguous string onto the string list.
                    head_obj.unshift(next);
                    head.unshift('');
                }
                waitingForAttr = false;
                break;
        }
    }
    //> if we haven't committed any last-read tokens, commit it now.
    commitToken();

    //> Now, we parse the previous token stream into tag, attribute, and events
    //  values in the JDOM.

    //> The tag name is always the first token
    tag = tokens.shift().value;
    let last = null,
        curr = tokens.shift();
    //> Function to step through to the next token
    const step = () => {
        last = curr;
        curr = tokens.shift();
    }
    //> Walk through the token list. If the token is a value token,
    //  the previous token is its key. If the current token is a key,
    //  the previous token is an attribute without value (like `disabled`).
    while (curr !== undefined) {
        if (curr.type === TYPE_VALUE) {
            commit(last.value, curr.value);
            step();
        } else if (last) {
            commit(last.value, true);
        }
        step();
    }
    //> If the last value is a value-less attribute (like `disabled`), commit it.
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

//> Function to parse an entire JDOM template tree (which we vague call JSX here).
//  This recursively calls itself on children elements.
const parseJSX = reader => {
    const result = [];

    //> The current JDOM object being worked on. Sort of an "element register"
    let currentElement = null;
    //> Are we reading a text node (and should ignore special characters)?
    let inTextNode = false;
    //> Commit currently reading element to the result list, and reset the current element
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

    //> Shortcut to handle string tokens properly, which we do more than once below
    const handleString = next => {
        if (!inTextNode) {
            commit();
            inTextNode = true;
            currentElement = '';
        }
        currentElement += next;
    }

    //> Main parsing logic
    for (let next = reader.next(); next !== READER_END; next = reader.next()) {
        //> if we see an opening tag...
        if (next === '<') {
            //> ... first, commit any previously read element ...
            commit();
            //> ... it's an opening tag if the next character isn't `'/'`.
            if (reader.next() !== '/') {
                reader.backtrack();
                //> Read and parse the contents of the tag up to the end of
                //  the opening tag.
                const result = parseOpeningTagContents(...reader.readUpto('>'));
                reader.next(); // read the '>'
                currentElement = result && result.jdom;
                //> If the current element is a full-fledged element (and not a comment
                //  or text node), let's try to parse the children by handing the reader
                //  to a recursively call of this function.
                if (!result.selfClosing &&
                    typeof currentElement === 'object' &&
                    currentElement !== null
                ) {
                    currentElement.children = parseJSX(reader);
                }
            //> ... it's a closing tag otherwise.
            } else {
                //> So finish out reading the closing tag, and commit the whole current element.
                //  A top-level closing tag means it's actually closing the parent tag, so
                //  we need to stop parsing and hand the parsing flow back to the parent
                //  call in this recursive function.
                reader.readUntil('>');
                commit();
                break;
            }
        //> Because string tokens are the most common, we check for it early
        } else if (typeof next === 'string') {
            handleString(next);
        //> Allow the template token to be an array of literal elements.
        //  this makes rendering lists of nodes really easy.
        } else if (next instanceof Array && isNode(next[0])) {
            for (const component of next) {
                commit();
                currentElement = component;
            }
        } else if (isNode(next)) {
            commit();
            currentElement = next;
        //> If none of the above conditions match, treat it as if it were a string
        } else {
            handleString(next);
        }
    }

    //> Commit any last remaining tokens as-is
    commit();

    return result;
}

//> `jdom` template tag. It just calls `parseJSX()` and returns the first parsed element
const jdom = (tplParts, ...dynamicParts) => {
    try {
        const reader = new Reader(
            tplParts.map(part => part.replace(/\s+/g, ' ')),
            dynamicParts
        );
        return parseJSX(reader)[0];
    } catch (e) {
        console.error(`Error parsing template: ${interpolate(tplParts, dynamicParts)}\n${'stack' in e ? e.stack : e}`);
    }
}

//> We only expose one public API: `jdom`
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
