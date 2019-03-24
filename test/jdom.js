describe('jdom template tag', () => {

    const isObject = o => typeof o === 'object' && o !== null;

    const normalizeJDOM = jdom => {
        if (isObject(jdom)) {
            if (!('attrs' in jdom)) {
                jdom.attrs = {};
            }
            if (!('events' in jdom)) {
                jdom.events = {};
            }
            if (!('children' in jdom)) {
                jdom.children = [];
            }
            for (const c of jdom.children) {
                normalizeJDOM(c);
            }
        }
        return jdom;
    }

    const compare = (title, expression, result) => {
        normalizeJDOM(expression);
        normalizeJDOM(result);
        it(title, () => {
            expect(expression,
                `\n${
                    JSON.stringify(expression, true, '\t')
                }\n\t^ should have been ...\n${
                    JSON.stringify(result, null, '\t')
                }\n`)
                .to.deep.equal(result);
        });
    }

    compare(
        'empty string',
        jdom``,
        null
    );

    compare(
        'text node',
        jdom`torus`,
        'torus'
    );

    // Test exists because we take a shortcut path for de-templating short strings <16chars-ish
    compare(
        'long text node',
        jdom`This is a very long text node, which probably only appears in very long template strings`,
        'This is a very long text node, which probably only appears in very long template strings'
    );

    compare(
        'comment',
        jdom`<!--- some comment that should be ignored -->`,
        null,
    );

    const tn = document.createElement('video');
    compare(
        'literal Node',
        jdom`${tn}`,
        tn
    );

    compare(
        'cached templates with different variables should output different results (pt 1)',
        jdom`<h1>${'Hello, World'}</h1>`,
        {tag: 'h1', children: ['Hello, World']}
    );

    compare(
        'cached templates with different variables should output different results (pt 2)',
        jdom`<h1>${'Goodbye, World'}</h1>`,
        {tag: 'h1', children: ['Goodbye, World']}
    );

    describe('tags', () => {

        compare(
            'self-closing tag',
            jdom`<input/>`,
            {tag: 'input'}
        );

        compare(
            'self-closing tag with whitespace',
            jdom`<  input / >`,
            {tag: 'input'}
        );

        compare(
            '<div> </div>',
            jdom`<div> </div>`,
            {tag: 'div'}
        );

        compare(
            '<div>\\n</div> (with a newline)',
            jdom`<div>\n</div>`,
            {tag: 'div'}
        );

        compare(
            'whitespace around input',
            jdom`       <input />       \n  ${'   '}  `,
            {tag: 'input'}
        );

        compare(
            'dynamic tag name',
            jdom`<${'div'}></div>`,
            {tag: 'div'}
        );

        compare(
            'general closing tags',
            jdom`<div>Hi<ul></></>`,
            {tag: 'div', children: [
                'Hi',
                {tag: 'ul'},
            ]}
        );

    });

    describe('attrs', () => {

        compare(
            'parse a single attribute correctly',
            jdom`<input type="text"/>`,
            {tag: 'input', attrs: {type: 'text'}}
        );

        compare(
            'parse HTML data attributes',
            jdom`<button data-color="red"></button>`,
            {tag: 'button', attrs: {'data-color': 'red'}}
        );

        compare(
            'parse attributes without quotes',
            jdom`<input type=text/>`,
            {tag: 'input', attrs: {type: 'text'}}
        );

        compare(
            'classes into an array in JDOM',
            jdom`<div class="a b class "></div>`,
            {tag: 'div', attrs: {
                class: ['a', 'b', 'class'],
            }}
        );

        compare(
            'styles in to a styles JDOM object',
            jdom`<div style=" display: flex;flex-direction
                :column; transition: opacity .9s"></div>`,
            {tag: 'div', attrs: {style: {
                'display': 'flex',
                'flexDirection': 'column',
                'transition': 'opacity .9s',
            }}}
        );

        compare(
            'styles in to a styles JDOM object with semicolon ending',
            jdom`<div style=" display: flex;flex-direction
                :column; transition: opacity .9s; "></div>`,
            {tag: 'div', attrs: {style: {
                'display': 'flex',
                'flexDirection': 'column',
                'transition': 'opacity .9s',
            }}}
        );

        compare(
            'URLs in self-closing tags with /',
            jdom`<img src="/static/img.png"/>`,
            {tag: 'img', attrs: {
                src: '/static/img.png',
            }}
        );

        compare(
            'escape with backslash',
            jdom`<button type="my\\"type"`,
            {tag: 'button', attrs: {
                type: 'my"type',
            }}
        );

        compare(
            'equals sign in quotes should be treated like normal',
            jdom`<button data-prop="ab=cd"/>`,
            {tag: 'button', attrs: {
                'data-prop': 'ab=cd',
            }}
        );

        compare(
            'multiple attributes',
            jdom`<input type="text" name="username" />`,
            {tag: 'input', attrs: {type: 'text', name: 'username'}}
        );

        compare(
            'attributes without value',
            jdom`<button disabled></button>`,
            {tag: 'button', attrs: {disabled: true}}
        );

        compare(
            'attributes with an empty value',
            jdom`<div class=""></div>`,
            {tag: 'div'}
        );

        compare(
            'mixed IDL and valued attributes',
            jdom`<button disabled data-color="blue"></button>`,
            {tag: 'button', attrs: {disabled: true, 'data-color': 'blue'}}
        );

        compare(
            'whitespaces distributed in the input',
            jdom`<button \n disabled           data-color  \n  =   "blue"></button>`,
            {tag: 'button', attrs: {disabled: true, 'data-color': 'blue'}}
        );

        compare(
            'interpolate mixed values to a string',
            jdom`<img data-prop="first ${{a: 'b'}}"`,
            {tag: 'img', attrs: {'data-prop': 'first [object Object]'}}
        );

        compare(
            'multiple interpolated template values in a single attribute',
            jdom`<img data-prop="first${1}second${2}" />`,
            {tag: 'img', attrs: {'data-prop': 'first1second2'}}
        );

        compare(
            'quoted attributes with no space',
            jdom`<div type="a"kind="b></div>`,
            {tag: 'div', attrs: {type: 'a', kind: 'b'}}
        );

        compare(
            'complex multi-attribute input',
            jdom`<    div class ="hi
               jinja name" disabled
            color        =
            "${{object: 'black'}}" taste
                =  content list="what${{same: 'difference'}}
            test  ${{much: 9}}"     > </div>`,
            {tag: 'div', attrs: {
                class: ['hi', 'jinja', 'name'],
                disabled: true,
                color: {object: 'black'},
                taste: 'content',
                list: 'what[object Object] test [object Object]',
            }}
        );

    });

    describe('events', () => {

        const fnA = () => 'a';
        const fnB = () => 'b';

        compare(
            'correctly parse one event listener',
            jdom`<button onclick=${fnA}></button>`,
            {tag: 'button', events: {click: [fnA]}}
        );

        compare(
            'two different events',
            jdom`<button onclick="${fnA}"onblur="${fnB}"></button>`,
            {tag: 'button', events: {click: [fnA], blur: [fnB]}}
        );

        compare(
            'preserve case of event name',
            jdom`<button onDOMContentLoaded=${fnA}></button>`,
            {tag: 'button', events: {DOMContentLoaded: [fnA]}}
        );

    });

    describe('children', () => {

        const tmpNode = document.createElement('img');
        const tmp2 = document.createElement('article');

        compare(
            'children as markup',
            jdom`<ul><li>Text</li></ul>`,
            {tag: 'ul', children: [
                {tag: 'li', children: ['Text']},
            ]}
        );

        compare(
            'children as Node',
            jdom`<li>
                ${tmpNode}
            </li>`,
            {tag: 'li', children: [
                tmpNode,
            ]}
        );

        compare(
            'children as JDOM',
            jdom`<ul>${
                jdom`<li>Text</li>`
            }</ul>`,
            {tag: 'ul', children: [
                {tag: 'li', children: ['Text']},
            ]}
        );

        compare(
            'children as array of JDOM',
            jdom`<ul>${[
                jdom`<li>Text 1</li>`,
                jdom`<li>Text 2</li>`,
            ]}</ul>`,
            {tag: 'ul', children: [
                {tag: 'li', children: ['Text 1']},
                {tag: 'li', children: ['Text 2']},
            ]}
        );

        const fnA = () => {};
        compare(
            'deeply nested template variables',
            jdom`<ul><li><button onclick="${fnA}">${{b: 'a'}}</button>${'test'}</li></ul>`,
            {tag: 'ul', children: [
                {tag: 'li', children: [
                    {tag: 'button', events: {
                        click: [fnA],
                    }, children: [{b: 'a'}]},
                    'test',
                ]},
            ]}
        );

        compare(
            'HTML entities in children',
            jdom`<span>&#60;test&#62;</span>`,
            {tag: 'span', children: ['<test>']}
        );

        compare(
            'heterogeneous children',
            jdom`<div>
            First
            ${42}
            <li>Second</li>
            ${tmpNode}
            last
            </div>`,
            {tag: 'div', children: [
                ' First ', 42, ' ',
                {tag: 'li', children: ['Second']},
                ' ',
                tmpNode,
                ' last ',
            ]}
        );

        compare(
            'array of literal elements',
            jdom`<main>${[tmpNode, tmp2]}</main>`,
            {tag: 'main', children: [tmpNode, tmp2]}
        );

        compare(
            'deep nesting',
            jdom`<main><article><section class="mySection c2"><h1>hi</h1></section></article></main>`,
            {tag: 'main', children: [
                {tag: 'article', children: [
                    {tag: 'section', attrs: {class: ['mySection', 'c2']}, children: [
                        {tag: 'h1', children: ['hi']},
                    ]},
                ]},
            ]},
        );

        compare(
            'non-tag parts outside of the root node should be treated as top-level children',
            jdom`<div>hello</div>hi`,
            {tag: 'div', children: ['hello']}
        );

        compare(
            'nesting same tags',
            jdom`<div>
                <div>
                    <div>hi</div>
                </div>
                <div></div>
            </div>`,
            {tag: 'div', children: [
                {tag: 'div', children: [
                    {tag: 'div', children: ['hi']},
                ]},
                {tag: 'div'},
            ]}
        );

        compare(
            'HTML markup injected into JDOM template parameters should be escaped, not parsed as JS or HTML (security risk)',
            jdom`<div>${'<h1>Hi</h1>'}</div>`,
            {tag: 'div', children: [
                '<h1>Hi</h1>',
            ]},
        );

        compare(
            'JS code injected into JDOM template parameters should be escaped, not parsed as JS or HTML (security risk)',
            jdom`<script>${'</script>console.log("alert")'}</script>`,
            {tag: 'script', children: [
                '</script>console.log("alert")',
            ]},
        );

    });

    describe('graceful failure', () => {

        const noThrow = (title, fn) => {
            it(title, () => expect(fn).to.not.throw());
        }

        noThrow(
            'empty string',
            () => jdom``
        );

        noThrow(
            'unclosed tags',
            () => jdom`<div `
        );

        noThrow(
            'newline inside of a closing tag',
            () => jdom`<div\n></\ndiv\n>`
        );

        noThrow(
            'mismatched tags',
            () => jdom`<div><p></div>`
        );

        noThrow(
            'broken attributes',
            () => jdom`<img src=/>`
        );

        noThrow(
            'attempt to backslash-escape in attributes',
            () => jdom`<img src=\\*abc\\ />`
        );

        noThrow(
            'quotes in attributes',
            () => jdom`<img src=source"url />`
        );

        noThrow(
            'quoted attribute labels',
            () => jdom`<img src="source_url" "testdata" />`
        );

        noThrow(
            'broken tag',
            () => jdom`<div>di>`
        );

        noThrow(
            'invalid attributes',
            () => jdom`<div ${{santa: 'claus'}}></div>`
        );

        noThrow(
            'invalid JDOM into children',
            () => jdom`<div>${{
                tag: 'div',
                name: ['1', {
                    name2: 'thing',
                }, [{
                    name3: 'thing',
                }]],
            }}</div>`
        );

        noThrow(
            'mismatched quotes',
            () => jdom`<img src="url ab c/>`
        );

        noThrow(
            'script tag that closes itself inside its contents',
            () => jdom`<script>console.log('</script>');</script>`
        );

    });

});
