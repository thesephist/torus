// Whitelist for common HTML reflected properties
const HTML_IDL_ATTRIBUTES = [
    'type',
    'value',
    'selected',
    'indeterminate',
    'tabIndex',
    'checked',
    'disabled',
];

const arrayNormalize = data => Array.isArray(data) ? data : [data];

const normalizeJDOM = jdom => {
    jdom.attrs = jdom.attrs !== undefined ? jdom.attrs : {};
    jdom.events = jdom.events !== undefined ? jdom.events : {};
    jdom.children = jdom.children !== undefined ? jdom.children : [];
}

const camelToKebab = camelStr => {
    const A_CODEPOINT = 65;
    const Z_CODEPOINT = 65 + 25;
    let result = '';
    for (let i = 0, len = camelStr.length; i < len; i ++) {
        const codePoint = camelStr.codePointAt(i);
        if (codePoint >= A_CODEPOINT && codePoint <= Z_CODEPOINT) {
            result += '-' + String.fromCodePoint(codePoint - 32);
        } else {
            result += camelStr[i];
        }
    }
    return result;
}

//> This string renderer is a drop-in replacement for render
//  in torus.js, if we want Torus components to render to an HTML
//  string in a server-side-rendering context.
//  But while it is API compatible with render and capable of
//  rendering full JDOM, the design of Torus itself isn't optimized
//  for use outside of the browser (Torus depends on DOM APIs).
//  As a result, SSR is still a story in progress for Torus.
const renderToString = (_node, _previous, next) => {

    let node = '';

    if (next === null) {
        node = '<!-- -->';
    } else if (typeof next === 'string' || typeof next === 'number') {
        node = next.toString();
    } else if (typeof next === 'object') {
        normalizeJDOM(next);

        let attrs = [],
            styles = [],
            classes = [],
            children = [];

        for (const attrName in next.attrs) {
            switch (attrName) {
                case 'class':
                    classes = arrayNormalize(next.attrs.class);
                    break;
                case 'style':
                    for (const [styleKey, styleValue] of next.attrs.style) {
                        styles.push(camelToKebab(styleKey) + ':' + styleValue);
                    }
                    break;
                default:
                    if (HTML_IDL_ATTRIBUTES.includes(attrName)) {
                        if (next.attrs[attrName] === true) {
                            attrs.push(attrName);
                        }
                    } else {
                        attrs.push(`${attrName}="${next.attrs[attrName]}"`);
                    }
            }
        }
        for (const child of next.children) {
            children.push(stringRenderJDOM(undefined, undefined, child));
        }

        node = `<${next.tag} ${attrs.join(' ')}
            style="${styles.join(';')}" class="${classes.join(' ')}">
                ${children.join('')}
        </${next.tag}>`;
    }

    return node.replace(/\s+/g, ' ');
}

module.exports = renderToString;
