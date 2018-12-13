describe('renderJDOM', () => {

    const render = jdom => renderJDOM(undefined, undefined, jdom);

    describe('Tags', () => {
        
        it('should support all tags specified in the spec', () => {
            const supportedTags = [
                'div',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'a', 'em', 'strong',
                'img',
                'button',
                'input',
                'label',
                'ul', 'ol', 'li',
            ];
            for (const tagName of supportedTags) {
                const node = render({
                    tag: tagName,
                });
                // tag names are case insensitive
                node.tagName.toLowerCase()
                    .should.equal(tagName.toLowerCase());
            }
        });

    });

    describe('Element attributes', () => {
        
        it('id', () => {

        });

        it('class', () => {

        });

    });

    describe('Child nodes', () => {

        it('Literal elements', () => {
            const literalElement = document.createElement('span');
            const node = render({
                tag: 'div',
                children: [literalElement],
            });

            node.childNodes.should.have.lengthOf(1);
            node.childNodes[0].should.equal(literalElement);
        });

        it('(Empty) comment nodes', () => {
            const node = render({
                tag: 'div',
                children: [null],
            });

            node.childNodes.should.have.lengthOf(1);
            node.childNodes[0]; // TODO
        });

        it('Text nodes from strings', () => {
            const node = render({
                tag: 'div',
                children: ['some text content'],
            });

            node.childNodes.should.have.lengthOf(1);
            node.textContent.should.equal('some text content');
        });

        it('Text nodes from number literals', () => {
            const node = render({
                tag: 'div',
                children: [39.5],
            });

            node.childNodes.should.have.lengthOf(1);
            node.textContent.should.equal('39.5');
        });

        it('JDOM tags', () => {
            const node = render({
                tag: 'div',
                children: [{
                    tag: 'span',
                }],
            });

            node.childNodes.should.have.lengthOf(1);
            node.children[0].tagName.toLowerCase().should.equal('span');
        });

    });

    describe('Event listeners', () => {

    });

});

describe('Component', () => {

});

describe('List', () => {

});

describe('Record', () => {

});

describe('Store', () => {

});

