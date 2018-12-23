describe('jdom template tag', () => {

    const compare = (title, expression, result) => {
        normalizeJDOM(result);
        it(title, () => {
            expect(expression,
                `${JSON.stringify(expression)}\n\t** versus **\n${JSON.stringify(result)}\n`)
                .to.deep.equal(result);
        });
    }

    compare(
        'empty string',
        jdom``,
        undefined
    );

    compare(
        'comment',
        jdom`<!--- some comment that should be ignored -->`,
        undefined,
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
            'multiple attributes',
            jdom`<input type="text" name="username"/>`,
            {tag: 'input', attrs: {type: 'text', name: 'username'}}
        );

        compare(
            'attributes without value',
            jdom`<button disabled></button>`,
            {tag: 'button', attrs: {disabled: true}}
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

    });

    describe('events', () => {

        const fnA = () => 'a';
        const fnB = () => 'b';

        compare(
            'correctly parse one event listener',
            jdom`<button onclick=${fnA}></button>`,
            {tag: 'button', events: {click: [fnA]}}
        );

    });

    describe('children', () => {

    });

    describe('integration', () => {

    });

    describe('Graceful failure', () => {

        const noThrow = (title, fn) => {
            it(title, () => expect(fn).to.not.throw);
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

        // TODO: mismatched opening/closing pairs, broken attrs, etc.

    });

});
