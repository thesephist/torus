describe('css template tag', () => {

    const compare = (title, expression, result) => {
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

    // Taken from samples/hn-reader
    const BRAND_COLOR = '#abcdef';
    compare(
        'general sanity check',
        css`display: block; margin-bottom: 24px; cursor: pointer; .listing { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; width: 100%; &:hover .stats { background: ${BRAND_COLOR}; color: #fff; transform: translate(0, -4px); &::after { background: #fff; } } } .mono { font-family: 'Menlo', 'Monaco', monospace; } .meta { font-size: .9em; opacity: .7; span { display: inline-block; margin: 0 4px; } } .url { overflow: hidden; text-overflow: ellipsis; font-size: .8em; } .content { color: #777; font-size: 1em; } a.stats { height: 64px; width: 64px; flex-shrink: 0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border-radius: 6px; background: #eee; transition: background .2s, transform .2s; position: relative; text-decoration: none; color: #333; &::after { content: ''; display: block; height: 1px; background: #555; width: 52px; position: absolute; top: 31.5px; left: 6px; } } .score, .comments { height: 32px; width: 100%; line-height: 32px; } .synopsis { margin-left: 12px; flex-shrink: 1; overflow: hidden; } .previewWrapper { display: block; width: 100%; max-width: 500px; margin: 0 auto; } .preview { position: relative; margin: 18px auto 0 auto; width: 100%; height: 0; padding-bottom: 75%; box-shadow: 0 0 0 3px ${BRAND_COLOR}; box-sizing: border-box; transition: opacity .2s; .loadingIndicator { position: absolute; z-index: -1; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.3em; text-align: center; width: 100%; color: ${BRAND_COLOR}; } img { box-sizing: border-box; width: 100%; } &:hover { opacity: .7; } }`,
        {'display': 'block', 'margin-bottom': '24px', 'cursor': 'pointer', '.listing': {'display': 'flex', 'flex-direction': 'row', 'align-items': 'center', 'justify-content': 'flex-start', 'width': '100%', '&:hover .stats': {'background': BRAND_COLOR, 'color': '#fff', 'transform': 'translate(0, -4px)', '&::after': {'background': '#fff'}}}, '.mono': {'font-family': '\'Menlo\', \'Monaco\', monospace'}, '.meta': {'font-size': '.9em', 'opacity': '.7', 'span': {'display': 'inline-block', 'margin': '0 4px'}}, '.url': {'overflow': 'hidden', 'text-overflow': 'ellipsis', 'font-size': '.8em'}, '.content': {'color': '#777', 'font-size': '1em'}, 'a.stats': {'height': '64px', 'width': '64px', 'flex-shrink': '0', 'text-align': 'center', 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', 'overflow': 'hidden', 'border-radius': '6px', 'background': '#eee', 'transition': 'background .2s, transform .2s', 'position': 'relative', 'text-decoration': 'none', 'color': '#333', '&::after': {'content': '\'\'', 'display': 'block', 'height': '1px', 'background': '#555', 'width': '52px', 'position': 'absolute', 'top': '31.5px', 'left': '6px'}}, '.score, .comments': {'height': '32px', 'width': '100%', 'line-height': '32px'}, '.synopsis': {'margin-left': '12px', 'flex-shrink': '1', 'overflow': 'hidden'}, '.previewWrapper': {'display': 'block', 'width': '100%', 'max-width': '500px', 'margin': '0 auto'}, '.preview': {'position': 'relative', 'margin': '18px auto 0 auto', 'width': '100%', 'height': '0', 'padding-bottom': '75%', 'box-shadow': '0 0 0 3px ' + BRAND_COLOR, 'box-sizing': 'border-box', 'transition': 'opacity .2s', '.loadingIndicator': {'position': 'absolute', 'z-index': '-1', 'top': '50%', 'left': '50%', 'transform': 'translate(-50%, -50%)', 'font-size': '1.3em', 'text-align': 'center', 'width': '100%', 'color': BRAND_COLOR}, 'img': {'box-sizing': 'border-box', 'width': '100%'}, '&:hover': {'opacity': '.7'}}}
    );

    compare(
        'empty input',
        css``,
        {},
    );

    compare(
        'newlines in input',
        css`
            font-size: 16px;
        `,
        {'font-size': '16px'}
    );

    compare(
        'newlines in input (from cache -- testing cache)',
        css`
            font-size: 16px;
        `,
        {'font-size': '16px'}
    );

    compare(
        'nested quotes',
        css`a: 'b "'cd ef"g"'; x: y-z`,
        {
            'a': '\'b "\'cd ef"g"\'',
            'x': 'y-z',
        }
    );

    compare(
        'should carry over escaped single quotes',
        css`a: 'I\\'m doing well! What\\'s up?'`,
        {
            'a': '\'I\\\'m doing well! What\\\'s up?\'',
        }
    );

    compare(
        'should carry over escaped double quotes',
        css`a: "I\\"m doing well! What\\"s up?"`,
        {
            'a': '"I\\"m doing well! What\\"s up?"',
        }
    );

    compare(
        'should respect escaped single quotes with significant chars inside',
        css`a: 'I\\'m doing so well! }:{ ;{'`,
        {
            'a': '\'I\\\'m doing so well! }:{ ;{\'',
        }
    );

    compare(
        'missing semicolon on dangling rule',
        css`
        x {
            y: z
        }
        a: b;
        c: d
        `,
        {
            'x': {
                'y': 'z',
            },
            'a': 'b',
            'c': 'd',
        }
    );

    compare(
        'braces inside quoted strings',
        css`a: b; c: {
            d: 'e}f;g{}';
            x: 'e}f:g{}';
        }`,
        {
            'a': 'b',
            'c': {
                'd': '\'e}f;g{}\'',
                'x': '\'e}f:g{}\'',
            },
        }
    );

    compare(
        'quotes inside quotes',
        css`a: 'b\'c"abc'`,
        {
            'a': '\'b\'c"abc\'',
        }
    );

    compare(
        'multiline values',
        css`font-family: system-ui,
'Helvetica',
'Roboto',
sans-serif;`,
        {
            'font-family': 'system-ui,\n\'Helvetica\',\n\'Roboto\',\nsans-serif',
        }
    );

    compare(
        'pseudoselector support',
        css`
        &:hover {
            cursor: pointer;
        }
        `,
        {
            '&:hover': {
                'cursor': 'pointer',
            },
        }
    );

    compare(
        'pseudoelement support',
        css`
        &::after {
            text-decoration: underline;
        }
        `,
        {
            '&::after': {
                'text-decoration': 'underline',
            },
        }
    );

    compare(
        'multi-selector support',
        css`
        p, i, b > i {
            color: blue;
        }
        `,
        {
            'p, i, b > i': {
                'color': 'blue',
            },
        }
    );

    compare(
        'media query support with min/max-width',
        css`
        @media only screen and (max-width: 600px) {
            h1 {
                font-weight: bold;
            }
        }
        `,
        {
            '@media only screen and (max-width: 600px)': {
                'h1': {
                    'font-weight': 'bold',
                },
            },
        }
    );

    compare(
        'keyframes support',
        css`
        @keyframes animation-name {
            0% {
                color: red;
            }
            50% {
                color: blue;
            }
            100% {
                color: green;
            }
        }
        `,
        {
            '@keyframes animation-name': {
                '0%': {
                    'color': 'red',
                },
                '50%': {
                    'color': 'blue',
                },
                '100%': {
                    'color': 'green',
                },
            },
        }
    );

    describe('graceful failure', () => {

        const noThrow = (title, fn) => {
            it(title, () => expect(fn).to.not.throw());
        }

        noThrow(
            'empty key',
            () => css`: x`
        );

        noThrow(
            'empty value',
            () => css`y: `
        );

        noThrow(
            'newline in key',
            () => css`a
            b: c`
        );

        noThrow(
            'newline in value',
            () => css`a: b
            c`
        );

        noThrow(
            'unclosed brace',
            () => css`a: {b: c`
        );

        noThrow(
            'unexpected closing brace',
            () => css`a: }b`
        );

    });

});
