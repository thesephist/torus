// Bootstrap the required globals from Torus
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

describe('render', () => {

    // Shortcut to call `render` with just the next JDOM argument
    const renderNext = jdom => render(undefined, undefined, jdom);

    describe('Tags', () => {

        it('should support an arbitrarily diverse set of tags', () => {
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
                const node = renderNext({
                    tag: tagName,
                });
                // tag names are case insensitive
                node.tagName.toLowerCase()
                    .should.equal(tagName.toLowerCase());
            }
        });

    });

    it('handles changes from one node type to another gracefully, without failing', () => {
        const first = document.createElement('div');
        const second = 'Some Text';
        const node = renderNext(first);
        const node2 = render(node, first, second);
        node.should.equal(first);
        node2.textContent.should.equal(second);
    });

    it('efficiently updates the content (nodeValue) of a TextNode', () => {
        const first = 'first text';
        const second = 'second text';
        const node = renderNext(first);
        const node2 = render(node, first, second);
        expect(node).to.equal(node2);
        node.textContent.should.equal(second);
    });

    it('returns the given element if given a literal element', () => {
        const prev = document.createElement('input');
        const next = prev;
        const node = renderNext(prev);
        const node2 = render(node, prev, next);
        expect(node).to.equal(node2);
    });

    describe('Element attributes', () => {

        it('id', () => {
            const node = renderNext({
                tag: 'div',
                attrs: {id: 'some_id_string'},
            });

            node.id.should.equal('some_id_string');
        });

        describe('class', () => {

            it('should add a new class provided as a string', () => {
                const node = renderNext({
                    tag: 'img',
                    attrs: {class: 'myImg'},
                });

                node.classList.contains('myImg').should.be.true;
            });

            it('should add new classes provided as lists', () => {
                const node = renderNext({
                    tag: 'img',
                    attrs: {class: ['firstClass', 'second_class']},
                });

                node.classList.contains('firstClass').should.be.true;
                node.classList.contains('second_class').should.be.true;
            });

            it('should remove old classes provided as strings', () => {
                const prev = {
                    tag: 'img',
                    attrs: {class: 'firstClass'},
                }
                const next = {
                    tag: 'img',
                    attrs: {class: 'secondClass'},
                }

                let node = renderNext(prev);
                node = render(node, prev, next);
                node.classList.contains('firstClass').should.be.false;
                node.classList.contains('secondClass').should.be.true;
            });

            it('should remove old classes provided as lists', () => {
                const prev = {
                    tag: 'img',
                    attrs: {class: ['firstClass', 'second_class']},
                }
                const next = {
                    tag: 'img',
                    attrs: {class: ['firstClass', 'third-class']},
                }

                let node = renderNext(prev);
                node = render(node, prev, next);
                node.classList.contains('firstClass').should.be.true;
                node.classList.contains('second_class').should.be.false;
                node.classList.contains('third-class').should.be.true;
            });

            it('should remove old classes if the new JDOM has no class array', () => {
                const prev = {
                    tag: 'img',
                    attrs: {class: ['firstClass', 'second_class']},
                }
                const next = {
                    tag: 'img',
                }

                let node = renderNext(prev);
                node = render(node, prev, next);
                node.classList.contains('firstClass').should.be.false;
                node.classList.contains('second_class').should.be.false;
            });

        });

        describe('style', () => {

            it('should apply new styles', () => {
                const node = renderNext({
                    tag: 'h1',
                    attrs: {style: {
                        fontSize: '12px',
                        textDecoration: 'none',
                        opacity: '.5',
                    }},
                });

                node.style.fontSize.should.equal('12px');
                node.style.textDecoration.should.equal('none');
                parseFloat(node.style.opacity).should.equal(.5);
            });

            it('should remove old styles that are not renewed', () => {
                const prev = {
                    tag: 'button',
                    attrs: {style: {
                        opacity: '.8',
                        height: '100px',
                    }},
                }
                const next = {
                    tag: 'button',
                    attrs: {style: {
                        opacity: '.8',
                        width: '50px',
                    }},
                }

                let node = renderNext(prev);
                node.style.height.should.equal('100px');
                node = render(node, prev, next);
                node.style.height.should.equal('');
                node.style.width.should.equal('50px');
            });

            it('should update changed style declarations', () => {
                const prev = {
                    tag: 'button',
                    attrs: {style: {
                        opacity: '.8',
                    }},
                }
                const next = {
                    tag: 'button',
                    attrs: {style: {
                        opacity: '.35',
                    }},
                }

                let node = renderNext(prev);
                parseFloat(node.style.opacity).should.equal(.8);
                node = render(node, prev, next);
                parseFloat(node.style.opacity).should.equal(.35);
            });

            it('should remove all styles if the styles object is removed in JDOM', () => {
                const prev = {
                    tag: 'button',
                    attrs: {style: {
                        opacity: '0.8',
                    }},
                }
                const next = {
                    tag: 'button',
                }

                let node = renderNext(prev);
                node.style.opacity.should.equal('0.8');
                node = render(node, prev, next);
                node.style.opacity.should.not.equal('0.8');
            });

        });

        describe('HTML attributes', () => {

            it('should add new attributes', () => {
                const node = renderNext({
                    tag: 'input',
                    attrs: {
                        type: 'text',
                        'data-mynumber': '4242',
                    },
                });

                node.getAttribute('type').should.equal('text');
                node.getAttribute('data-mynumber').should.equal('4242');
            });

            it('should remove old attributes and update changed ones', () => {
                const prev = {
                    tag: 'input',
                    attrs: {
                        type: 'checkbox',
                        'data-x': 'hi',
                        'data-foo': 'bar',
                        'data-magic': 'magic',
                    },
                }
                const next = {
                    tag: 'input',
                    attrs: {
                        type: 'checkbox',
                        'data-x': 'hi',
                        'data-foo': 'baz',
                    },
                }

                const node = renderNext(prev);
                node.getAttribute('data-magic').should.equal('magic');
                node.getAttribute('data-foo').should.equal('bar');
                const node2 = render(node, prev, next);
                expect(node.getAttribute('checked')).to.be.null;
                node.getAttribute('data-foo').should.equal('baz');
            });

            it('should reflect IDL properties as DOM properties', () => {
                const node = renderNext({
                    tag: 'input',
                    attrs: {
                        type: 'text',
                        value: 'hello',
                    },
                });

                node.getAttribute('type').should.equal('text');
                node.value.should.equal('hello');
            });

            it('should update IDL properties when they change', () => {
                const prev = {
                    tag: 'input',
                    attrs: {
                        type: 'checkbox',
                        checked: true,
                    },
                }
                const next = {
                    tag: 'input',
                    attrs: {
                        type: 'checkbox',
                        checked: false,
                    },
                }
                const next2 = {
                    tag: 'input',
                }

                const node = renderNext(prev);
                node.checked.should.be.true;
                const node2 = render(node, prev, next);
                node2.checked.should.be.false;
                const node3 = render(node2, next, next2);
                node3.type.should.not.equal('checkbox');
            });

        });

    });

    describe('Child nodes', () => {

        it('Literal elements', () => {
            const literalElement = document.createElement('span');
            const node = renderNext({
                tag: 'div',
                children: [literalElement],
            });

            node.childNodes.should.have.lengthOf(1);
            node.childNodes[0].should.equal(literalElement);
        });

        it('(Empty) comment nodes', () => {
            const node = renderNext({
                tag: 'div',
                children: [null],
            });

            node.childNodes.should.have.lengthOf(1);
            node.childNodes[0].nodeType.should.equal(8);
        });

        it('Text nodes from strings', () => {
            const node = renderNext({
                tag: 'div',
                children: ['some text content'],
            });

            node.childNodes.should.have.lengthOf(1);
            node.textContent.should.equal('some text content');
        });

        it('Text nodes from number literals', () => {
            const node = renderNext({
                tag: 'div',
                children: [39.5],
            });

            node.childNodes.should.have.lengthOf(1);
            node.textContent.should.equal('39.5');
        });

        it('JDOM tags', () => {
            const node = renderNext({
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

        it('should attach new listeners', () => {
            let clickCalled = false;

            const node = renderNext({
                tag: 'button',
                events: {
                    click: () => clickCalled = true,
                },
            });
            node.click();
            expect(clickCalled).to.be.true;
        });

        it('should remove listeners as changed in JDOM', () => {
            let firstClickCount = 0;
            let secondClickCount = 0;

            const prev = {
                tag: 'button',
                events: {
                    click: () => firstClickCount++,
                },
            }
            const next = {
                tag: 'button',
                events: {
                    click: () => secondClickCount++,
                },
            }

            const node = renderNext(prev);
            node.click();
            const node2 = render(node, prev, next);
            node2.click();

            firstClickCount.should.equal(1);
            secondClickCount.should.equal(1);
        });

        it('should accept an array of event handlers', () => {
            let firstClickCount = 0;
            let secondClickCount = 0;

            const node = renderNext({
                tag: 'button',
                events: {
                    click: [
                        () => firstClickCount++,
                        () => secondClickCount++,
                    ],
                },
            });

            node.click();
            node.click();

            firstClickCount.should.equal(2);
            secondClickCount.should.equal(2);
        });

        it('should not fail when the next render has no events object', () => {
            let firstClickCount = 0;
            let secondClickCount = 0;

            const firstFn = () => firstClickCount++;

            const prev = {
                tag: 'button',
                events: {
                    click: [
                        firstFn,
                        () => secondClickCount++,
                    ],
                },
            }
            const next = {
                tag: 'button',
            }

            const node = renderNext(prev);
            node.click();
            const node2 = render(node, prev, next);
            node2.click();

            firstClickCount.should.equal(1);
            secondClickCount.should.equal(1);
        });

        it('should remove listeners as changed in JDOM, given in arrays', () => {
            let firstClickCount = 0;
            let secondClickCount = 0;
            let thirdClickCount = 0;

            const firstFn = () => firstClickCount++;

            const prev = {
                tag: 'button',
                events: {
                    click: [
                        firstFn,
                        () => secondClickCount++,
                    ],
                },
            }
            const next = {
                tag: 'button',
                events: {
                    click: [
                        firstFn,
                        () => thirdClickCount++,
                    ]
                },
            }

            const node = renderNext(prev);
            node.click();
            const node2 = render(node, prev, next);
            node2.click();

            firstClickCount.should.equal(2);
            secondClickCount.should.equal(1);
            thirdClickCount.should.equal(1);
        });

    });

    it('updates in-place, even when the tag changes', () => {

        const prev = {
            tag: 'button',
            children: ['Button text'],
        }
        const next = {
            tag: 'span',
            children: ['Span text'],
        }

        const childNode = renderNext(prev);
        const parentNode = document.createElement('div');
        parentNode.appendChild(childNode);
        parentNode.textContent.trim().should.equal('Button text');
        render(childNode, prev, next);
        parentNode.textContent.trim().should.equal('Span text');
    });

    it('can reconcile literal elements moving up places in a list', () => {
        const [first, second, third, fourth] = [
            document.createElement('li'),
            document.createElement('li'),
            document.createElement('li'),
            document.createElement('li'),
        ];
        first.textContent = 'first';
        second.textContent = 'second';
        third.textContent = 'third';
        fourth.textContent = 'fourth';
        const prev = {
            tag: 'ul',
            children: [first, second, third],
        }
        const next = {
            tag: 'ul',
            children: [third, first, fourth, second],
        }

        const node = renderNext(prev);
        node.textContent.should.equal('firstsecondthird');
        const node2 = render(node, prev, next);
        node2.textContent.should.equal('thirdfirstfourthsecond');
    });

    it('can reconcile literal elements changing places in a shorter list', () => {
        const [first, second, third, fourth] = [
            document.createElement('li'),
            document.createElement('li'),
            document.createElement('li'),
            document.createElement('li'),
        ];
        first.textContent = 'first';
        second.textContent = 'second';
        third.textContent = 'third';
        fourth.textContent = 'fourth';
        const prev = {
            tag: 'ul',
            children: [first, second, third, fourth],
        }
        const next = {
            tag: 'ul',
            children: [third, first, second],
        }

        const node = renderNext(prev);
        node.textContent.should.equal('firstsecondthirdfourth');
        const node2 = render(node, prev, next);
        node2.textContent.should.equal('thirdfirstsecond');
    });

});

describe('Component', () => {

    it('always has a non-null #node property', () => {
        const c = new Component();
        c.should.have.property('node');
        c.node.should.not.be.undefined;
        c.node.should.not.be.null;
    });

    it('always has a #record property', () => {
        const c = new Component();
        c.should.have.property('record');
        expect(c.record).to.not.be.undefined;
    });

    it('#init runs before first #render call', () => {
        let rendered = false;
        const c = new (class extends Component {
            init() {
                rendered.should.be.false;
            }
            render() {
                super.render();
                rendered = true;
            }
        })();
    });

    describe('Component.from', () => {

        const Comp = Component.from((name, number) => {
            return {
                tag: 'h1',
                attrs: {
                    'data-number': number,
                },
                children: [name],
            }
        });

        it('should create a new Component class from a pure function component', () => {
            const c = new Comp('Dijkstra', 42);
            c.should.be.an.instanceof(Component);
        });

        it('should render with the argument values given to the class constructor', () => {
            const c = new Comp('Dijkstra', 42);
            expect(c.compose()).to.deep.equal({
                tag: 'h1',
                attrs: {
                    'data-number': 42,
                },
                children: ['Dijkstra'],
            });
        });

    });

    describe('Event bindings to #record', () => {

        it('should call event handler defined with #bind on source event', () => {
            let handlerCalled = false;

            const c = new Component();
            const r = new Record();
            c.bind(r, () => handlerCalled = true);

            r.update({key: 'value'});
            handlerCalled.should.be.true;
        });

        it('should no longer call the event handler after #unbind()', () => {
            let handlerCallCount = 0;

            const c = new Component();
            const r = new Record();
            c.bind(r, () => handlerCallCount++);

            r.update({key: 'value'});
            handlerCallCount.should.be.greaterThan(0);
            c.unbind();
            const lastHandlerCallCallCount = handlerCallCount;
            r.update({key: 'value'});
            handlerCallCount.should.equal(lastHandlerCallCallCount);
        });

        it('should remove the previous event source when a new source is set', () => {
            let handlerCallCount = 0;

            const c = new Component();
            const r = new Record();
            c.bind(r, () => handlerCallCount++);

            r.update({key: 'value'});
            handlerCallCount.should.be.greaterThan(0);
            c.bind(new Record(), () => {});
            const lastHandlerCallCallCount = handlerCallCount;
            r.update({key: 'value'});
            handlerCallCount.should.equal(lastHandlerCallCallCount);
        });

    });

    describe('#render', () => {

        class FooComponent extends Component {
            compose() {
                return {
                    tag: 'h1',
                    children: ['Hello, World!'],
                }
            }
        }

        it('should render the result of #compose() to #node', () => {
            const c = new FooComponent();
            c.render();

            c.node.textContent.should.equal('Hello, World!');
        });

        it('should return #jdom', () => {
            const c = new FooComponent();
            c.render().should.equal(c.jdom);
        });

        it('should throw when #compose() does not return valid JDOM', () => {
            class BrokenComponent extends Component {
                compose() { }
            }
            expect(() => {
                const c = new BrokenComponent()
            }).to.throw(Error);
        });


    });

    describe('#remove', () => {

        it('should remove all bound event sources', () => {
            let unbound = false;

            class Foo extends Component {
                unbind() {
                    unbound = true;
                }
            }
            const f = new Foo();
            unbound.should.be.false;
            f.remove();
            unbound.should.be.true;
        });

    });

});

describe('Styled', () => {

    it('Returns a subclass of a given Component with CSS APIs', () => {
        class Comp extends Component {};
        const Tmp = Styled(Comp);
        const t = new Tmp();
        t.should.be.an.instanceof(Comp);
        t.styles.should.be.a('function');
    });

    describe('StyledComponent', () => {
        const S = class extends StyledComponent {
            styles() {
                return {
                    // note that for tests to work, we need to use the
                    //  lower-level values of some of the CSS props,
                    //  like rgb() and font-weight: 700.
                    'font-size': '18px',
                    'background': 'rgba(0, 0, 0, 0.4)',
                    '@keyframes some-name': {
                        'from': {'opacity': 0},
                        'to': {'opacity': 1},
                    },
                    // guaranteed to always match
                    '@media (min-width: 0px)': {
                        'border-color': 'rgb(0, 1, 2)',
                        'p': {
                            'font-style': 'italic',
                        },
                    },
                    '&.invalid': {
                        'color': 'rgb(255, 0, 0)',
                        '&:focus': {
                            'color': 'rgb(0, 0, 255)',
                        },
                    },
                    'p': {
                        'font-weight': '700',
                    },
                    'p, .double': {
                        'padding-bottom': '6px',
                    },
                }
            }

            compose() {
                // it's important that we return a button, because
                //  we test for :focus, and button is focusable.
                return {
                    tag: 'button',
                    attrs: {
                        class: 'invalid',
                    },
                    children: [
                        {
                            tag: 'p',
                            children: ['Hello'],
                        },
                        {
                            tag: 'div',
                            attrs: {
                                class: 'double',
                            },
                        },
                    ],
                }
            }
        }

        it('should render without throwing, without overriding styles()', () => {
            const Vanilla = Styled(class extends Component {
                compose() {
                    return {tag: 'div'};
                }
            });
            const v = new Vanilla();
        });

        it('should not throw with styles defined (placeholder test)', () => {
            expect(() => new S()).to.not.throw();
        });

        describe('Style rendering correctness', () => {
            const s = new S();

            before(() => {
                document.body.appendChild(s.node);
            });

            after(() => {
                document.body.removeChild(s.node);
            });

            it('should support styles set on itself', () => {
                const styles = getComputedStyle(s.node);
                styles.fontSize.should.equal('18px');
                styles.backgroundColor.should.equal('rgba(0, 0, 0, 0.4)');
            });

            it('should support styles set on children', () => {
                const styles = getComputedStyle(s.node.querySelector('p'));
                styles.fontWeight.should.equal('700');
            });

            it('should correctly render @keyframes rules', () => {
                const sheet = document.querySelector('style[data-torus]').sheet;
                let hasKeyframeRule = false;
                for (const rule of sheet.cssRules) {
                    if (rule instanceof CSSKeyframesRule) {
                        hasKeyframeRule = true;
                    }
                }
                hasKeyframeRule.should.be.true;
            });

            it('should correctly render @media queries', () => {
                const sheet = document.querySelector('style[data-torus]').sheet;
                let hasMediaRule = false;
                for (const rule of sheet.cssRules) {
                    if (rule instanceof CSSMediaRule) {
                        hasMediaRule = true;
                    }
                }
                hasMediaRule.should.be.true;

                const styles = getComputedStyle(s.node);
                const childStyles = getComputedStyle(s.node.querySelector('p'));
                styles.borderColor.should.equal('rgb(0, 1, 2)');
                childStyles.fontStyle.should.equal('italic');
            });

            it('should correctly render sub-rules with "&"', () => {
                const styles = getComputedStyle(s.node);
                styles.color.should.equal('rgb(255, 0, 0)');
            });

            it('should correctly render :hover/:focus state styles (nested subrules)', () => {
                s.node.focus();
                const styles = getComputedStyle(s.node);
                styles.color.should.equal('rgb(0, 0, 255)');
            });

            it('should nest comma-separated selectors correctly, by nesting each selector', () => {
                const pStyles = getComputedStyle(s.node.querySelector('p'));
                const doubleStyles = getComputedStyle(s.node.querySelector('.double'));
                pStyles.paddingBottom.should.equal('6px');
                doubleStyles.paddingBottom.should.equal('6px');
            });

        });

    });

});

describe('List', () => {

    class ItemComponent extends Component {
        init(record) {
            this.bind(record, this.render.bind(this));
        }
        compose(data) {
            return {
                tag: 'li',
                children: [data.label],
            }
        }
    }

    it('should allow items to remove themselves from the list', () => {
        class MyList extends List {
            get itemClass() {
                return class extends Component {
                    init(record, cb) {
                        this.cb = cb;
                        this.bind(record, this.render.bind(this));
                    }
                    compose(props) {
                        return {
                            tag: 'button',
                            events: {
                                click: this.cb,
                            },
                            children: [props.label],
                        }
                    }
                };
            }
        }
        const s = new Store([
            new Record({ label: 'first' }),
            new Record({ label: 'second' }),
            new Record({ label: 'third' }),
        ]);
        const l = new MyList(s);
        l.node.textContent.should.equal('firstsecondthird');
        for (const button of l.node.querySelectorAll('button')) {
            button.click();
        }
        l.node.textContent.should.equal('');
    });

    it('should pass along arguments 1, 2, 3... as arguments 2, 3, 4... to children', () => {
        const one = [0];
        const two = [0];
        class MyList extends List {
            get itemClass() {
                return class extends Component {
                    init(_record, _cb, one, two) {
                        one[0] ++;
                        two[0] ++;
                    }
                };
            }
        }
        const s = new Store([
            new Record({ label: 'first' }),
            new Record({ label: 'second' }),
            new Record({ label: 'third' }),
        ]);
        const l = new MyList(s, one, two);
        one[0].should.equal(3);
        two[0].should.equal(3);
    });

    describe('#constructor', () => {

        it('should throw an error when not given a store', () => {
            const create = () => new List();
            create.should.throw(Error);
        });

    });

    describe('#itemClass', () => {

        it('should be Component by default', () => {
            const l = new List(new Store());
            l.itemClass.should.equal(Component);
        });

    });

    describe('#components', () => {

        it('should be an ordered map of all its children components', () => {
            class MyList extends List {
                get itemClass() {
                    return ItemComponent;
                }
            }
            const s = new Store([
                new Record({ label: 'first' }),
                new Record({ label: 'second' }),
                new Record({ label: 'third' }),
            ]);
            const l = new MyList(s);
            const comps = l.components;
            comps[0].record.get('label').should.equal('first');
            comps[1].record.get('label').should.equal('second');
            comps[2].record.get('label').should.equal('third');
        });

    });

    describe('#filter / #unfilter', () => {

        class MyList extends List {
            get itemClass() {
                return ItemComponent;
            }
        }
        const s = new Store([
            new Record({ label: 'first' }),
            new Record({ label: 'second' }),
            new Record({ label: 'third' }),
        ]);
        const l = new MyList(s);

        it('#filter should filter a list by the record', () => {
            l.filter(r => r.get('label') !== 'second');
            l.node.textContent.should.equal('firstthird');
        });

        it('#unfilter should remove any filters', () => {
            l.unfilter();
            l.node.textContent.should.equal('firstsecondthird');
        });

    });

    describe('#remove', () => {

        it('should call #remove on children', () => {
            let removed = 0;
            class Item extends Component {
                remove() { removed++ }
            }
            const s = new Store([new Record(), new Record(), new Record()]);
            const l = new (ListOf(Item))(s);
            l.remove();
            removed.should.equal(3);
        });

    });

    describe('Rendering', () => {

        it('should render the list items in a <ul>', () => {
            class MyList extends List {
                get itemClass() {
                    return ItemComponent;
                }
            }
            const s = new Store([
                new Record({label: 'first'}),
                new Record({label: 'second'}),
                new Record({label: 'third'}),
            ]);
            const l = new MyList(s);

            l.node.textContent.should.equal('firstsecondthird');
            l.node.tagName.toLowerCase().should.equal('ul');
        });

        it('should remove all items when the list is reset', () => {
            class MyList extends List {
                get itemClass() {
                    return ItemComponent;
                }
            }
            const s = new Store([
                new Record({label: 'first'}),
                new Record({label: 'second'}),
                new Record({label: 'third'}),
            ]);
            const l = new MyList(s);

            l.node.textContent.should.equal('firstsecondthird');
            s.reset();
            l.node.textContent.should.equal('');
        });

    });

    describe('Events', () => {

        it('when a new record is added to the list, add the item', () => {
            class MyList extends List {
                get itemClass() {
                    return ItemComponent;
                }
            }
            const s = new Store([
                new Record({label: 'first'}),
                new Record({label: 'second'}),
                new Record({label: 'third'}),
            ]);
            const l = new MyList(s);

            s.add(new Record({label: 'fourth'}));
            l.node.textContent.should.equal('firstsecondthirdfourth');
        });

        it('when a new record is removed from the list, remove the item', () => {
            class MyList extends List {
                get itemClass() {
                    return ItemComponent;
                }
            }
            const second = new Record({label: 'second'});
            const s = new Store([
                new Record({label: 'first'}),
                second,
                new Record({label: 'third'}),
            ]);
            const l = new MyList(s);

            s.remove(second);
            l.node.textContent.should.equal('firstthird');
        });

    });

});

describe('ListOf', () => {

    it('should return a new subclass constructor with a given itemClass', () => {
        class CustomComponent extends Component {
            customMethod() {}
        }
        const s = new Store();
        const l = new (ListOf(CustomComponent))(s);
        l.itemClass.should.equal(CustomComponent);
    });

});

describe('Record', () => {

    describe('#constructor', () => {

        it('should accept an id and a data object as arguments', () => {
            const r = new Record('some_id', {some: 'data'});
            r.id.should.equal('some_id');
            r.data.should.deep.equal({some: 'data'});
        });

        it('should accept just the data object as the first argument, leaving id null', () => {
            const r = new Record({some: 'my_data'});
            expect(r.id).to.be.null;
            r.data.should.deep.equal({some: 'my_data'});
        });

    });

    describe('#update', () => {

        it('should update the record data', () => {
            const r = new Record({some: 'data'});
            r.update({some_other: 'more_data'});

            r.data.should.deep.equal({
                some: 'data',
                some_other: 'more_data',
            });
        });

        it('should fire an event', () => {
            let handlerCalled = false;
            const r = new Record({some: 'data'});
            r.addHandler(() => handlerCalled = true);
            r.update({some_other: 'more_data'});

            handlerCalled.should.be.true;
        });

    });

    describe('#get', () => {

        it('should return the data value', () => {
            const r = new Record({some: 'data'});

            r.get('some').should.equal('data');
        });

    });

    describe('#summarize', () => {

        it('should return the union of #data and #id', () => {
            const r = new Record('some_id', {some: 'data'});

            r.summarize().should.deep.equal({
                id: 'some_id',
                some: 'data',
            });
        });

    });

    describe('#serialize', () => {

        it('should return the union of #data and #id', () => {
            const r = new Record('some_id', {some: 'data'});

            r.serialize().should.deep.equal({
                id: 'some_id',
                some: 'data',
            });
        });

    });

});

describe('Store', () => {

    class MyRecord extends Record {
        myMethod() {
            return 'methodResult';
        }
    }

    class MyStore extends Store {

        get recordClass() {
            return MyRecord;
        }

        get comparator() {
            return record => record.get('label');
        }

    }

    describe('#recordClass', () => {

        it('should be Record by default', () => {
            const s = new Store();
            s.recordClass.should.equal(Record);
        });

    });

    describe('#records', () => {

        it('should point to an unordered set of records', () => {
            const s = new MyStore([
                new MyRecord({label: 1}),
                new MyRecord({label: 2}),
                new MyRecord({label: 3}),
                new MyRecord({label: 4}),
            ]);
            s.records.should.be.an.instanceof(Set);
        });

    });

    describe('#constructor', () => {

        it('creates #records, a Set of the given records', () => {
            const s = new MyStore([
                new MyRecord({label: 1}),
                new MyRecord({label: 2}),
                new MyRecord({label: 3}),
                new MyRecord({label: 4}),
            ]);
            s.records.size.should.equal(4);
        });

        it('creates an empty #records Set given no arguments', () => {
            const s = new MyStore();
            s.records.size.should.equal(0);
        });

    });

    describe('#create', () => {

        it('should add a new recordClass instance with given id and data', () => {
            const s = new MyStore();
            s.create('some_id', {some: 'data'});
            s.records.size.should.equal(1);
            [...s.records][0].should.be.an.instanceof(MyRecord);
            [...s.records][0].id.should.equal('some_id');
        });

        it('should fire an event', () => {
            let eventEmitted = false;
            const s = new MyStore();
            s.addHandler(() => eventEmitted = true);
            s.create('some_id', {some: 'data'});

            eventEmitted.should.be.true;
        });

        it('should return the created record', () => {
            const s = new MyStore();
            const returnValue = s.create('some_id', {some: 'data'});
            expect(returnValue).to.be.an.instanceof(Record);
            returnValue.id.should.equal('some_id');
            returnValue.get('some').should.equal('data');
        });

    });

    describe('#add', () => {

        it('should add the given record to #records', () => {
            const s = new MyStore();
            const r = new MyRecord({some: 'data'});
            s.add(r);
            [...s.records][0].should.equal(r);
        });

        it('should fire an event', () => {
            let eventEmitted = false;
            const s = new MyStore();
            s.addHandler(() => eventEmitted = true);
            s.add(new MyRecord({some: 'data'}));

            eventEmitted.should.be.true;
        });

        it('should return the added record', () => {
            const s = new MyStore();
            const r = new MyRecord({some: 'data'});
            const returnValue = s.add(r);
            expect(returnValue).to.equal(r);
        });

    });

    describe('#remove', () => {

        it('should remove the given record from #records', () => {
            const r = new MyRecord({some: 'data'});
            const s = new MyStore([r]);
            s.remove(r);
            s.records.size.should.equal(0);
        });

        it('should fire an event', () => {
            let eventEmitted = false;
            const r = new MyRecord({some: 'data'});
            const s = new MyStore([r]);
            s.addHandler(() => eventEmitted = true);
            s.remove(r);

            eventEmitted.should.be.true;
        });

        it('should return the removed record', () => {
            const r = new MyRecord({some: 'data'});
            const s = new MyStore([r]);
            const returnValue = s.remove(r);
            expect(returnValue).to.equal(r);
        });

    });

    describe('#find', () => {

        it('should return the record with a given ID from the store', () => {
            const s = new MyStore();
            s.create('a', {
                label: 5,
            });
            s.create('b', {
                label: 6,
            });
            s.create('c', {
                label: 10,
            });
            expect(s.find('b').summarize()).to.deep.equal({label: 6, id: 'b'});
        });

        it('should return null if none are found with a matching ID', () => {
            const s = new MyStore();
            s.create('a', {
                label: 5,
            });
            s.create('b', {
                label: 6,
            });
            expect(s.find('c')).to.be.null;
        });

        it('should not break on duplicate IDs', () => {
            const s = new MyStore();
            s.create('a', {
                label: 5,
            });
            s.create('a', {
                label: 6,
            });
            s.create('b', {
                label: 10,
            });
            expect(s.find('a').summarize()).to.have.property('id').equal('a');
        });

    });

    describe('#reset', () => {

        it('should reset the contents of the store with the new given ones', () => {
            const s = new MyStore([
                new MyRecord({label: 1}),
                new MyRecord({label: 2}),
                new MyRecord({label: 3}),
                new MyRecord({label: 4}),
            ]);
            s.records.size.should.equal(4);
            s.reset([
                new MyRecord({label: 'a'}),
                new MyRecord({label: 'b'}),
            ]);
            s.records.size.should.equal(2);
        });

        it('should accept no arguments as an acceptable input, and empty the store', () => {
            const s = new MyStore([
                new MyRecord({label: 1}),
                new MyRecord({label: 2}),
                new MyRecord({label: 3}),
                new MyRecord({label: 4}),
            ]);
            s.records.size.should.equal(4);
            s.reset();
            s.records.size.should.equal(0);
        });

        it('should fire an event', () => {
            let eventEmitted = false;
            const s = new MyStore([
                new MyRecord({label: 1}),
                new MyRecord({label: 2}),
                new MyRecord({label: 3}),
                new MyRecord({label: 4}),
            ]);
            eventEmitted = false;
            s.addHandler(() => eventEmitted = true);
            s.reset();
            eventEmitted.should.be.true;
        });

    });

    describe('#summarize', () => {

        it('should return a #comparator-ordered list of records', () => {
            const first = new MyRecord(1, {label: 'first'});
            const second = new MyRecord(2, {label: 'second'});
            const third = new MyRecord(3, {label: 'third'});
            const fourth = new MyRecord(4, {label: 'fourth'});

            const s = new MyStore([first, second, third, fourth]);

            const summary = s.summarize();
            summary[0].should.equal(first);
            summary[1].should.equal(fourth);
            summary[2].should.equal(second);
            summary[3].should.equal(third);
        });

    });

    describe('#serialize', () => {

        it('should return an array of serialized records, in #comparator order', () => {
            const first = new MyRecord(1, {label: 'first'});
            const second = new MyRecord(2, {label: 'second'});
            const third = new MyRecord(3, {label: 'third'});
            const fourth = new MyRecord(4, {label: 'fourth'});

            const s = new MyStore([first, second, third, fourth]);

            s.serialize().should.deep.equal([
                {
                    id: 1,
                    label: 'first',
                },
                {
                    id: 4,
                    label: 'fourth',
                },
                {
                    id: 2,
                    label: 'second',
                },
                {
                    id: 3,
                    label: 'third',
                },
            ]);
        });

    });

});

describe('StoreOf', () => {

    it('should return a new Store constructor with a given recordClass', () => {
        class CustomRecordClass extends Record {
            customMethod() {}
        }
        const s = new (StoreOf(CustomRecordClass))();
        s.recordClass.should.equal(CustomRecordClass);
    });

});

describe('Router', () => {

    it('should fire a new event with the matching route when #go() is called', () => {
        let routeName = null;
        let routeParams = null;
        const router = new Router({
            'tabs': '/tabs/:tabNumber',
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, ([name, params]) => {
                    switch (name) {
                        case 'tabs':
                            routeName = name;
                            routeParams = params;
                            break;
                        default:
                            break;
                    }
                });
            }
        }
        const v = new RouterView(router);
        router.go('/tabs/3');
        expect(routeName).to.equal('tabs');
        expect(routeParams).to.deep.equal({tabNumber: '3'});
        router.remove();
    });

    it('should correctly parse multi-parameter routes', () => {
        let routeParams = null;
        const router = new Router({
            'page': '/page/:pageNumber/item/:itemNumber/:itemID',
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, ([name, params]) => {
                    switch (name) {
                        case 'page':
                            routeParams = params;
                            break;
                        default:
                            break;
                    }
                });
            }
        }
        const v = new RouterView(router);
        router.go('/page/13/item/42/abc-123');
        expect(routeParams).to.deep.equal({
            pageNumber: '13',
            itemNumber: '42',
            itemID: 'abc-123',
        });
        router.remove();
    });

    it('should emit an event when the user goes back', () => {
        let eventEmitted = false;
        const router = new Router({
            'item': '/page/:pageNumber/item/:itemNumber/:itemID',
            'page': '/page/:pageNumber', // shouldn't do this in real apps
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, () => eventEmitted = true);
            }
        }
        const v = new RouterView(router);
        eventEmitted = false;
        window.dispatchEvent(new Event('popstate'));
        expect(eventEmitted).to.be.true;
        router.remove();
    });

    it('should check the routes in order in which they were defined', () => {
        let routeName = null;
        const router = new Router({
            'page': '/page/:pageNumber', // shouldn't do this in real apps
            'item': '/page/:pageNumber/item/:itemNumber/:itemID',
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, ([name, _params]) => routeName = name);
            }
        }
        const v = new RouterView(router);
        router.go('/page/13/item/42/abc-123');
        expect(routeName).to.equal('page');
        router.remove();
        history.back();
    });

    it('should emit an event with the current location when first bound', () => {
        history.pushState(null, document.title, '/page/13/item/42/abc-123');
        let routeParams = null;
        const router = new Router({
            'item': '/page/:pageNumber/item/:itemNumber/:itemID',
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, ([name, params]) => routeParams = params);
            }
        }
        const v = new RouterView(router);
        expect(routeParams).to.deep.equal({
            pageNumber: '13',
            itemNumber: '42',
            itemID: 'abc-123',
        });
        router.remove();
    });

    it('should have the summary match the last route details', () => {
        const router = new Router({
            'page': '/page/:pageNumber/item/:itemNumber/:itemID',
            'default': '/',
        });
        router.go('/page/13/item/42/abc-123');
        router.summarize().should.deep.equal(['page', {
            pageNumber: '13',
            itemNumber: '42',
            itemID: 'abc-123',
        }]);
        router.remove();
    });

    it('should stop firing events after it\'s removed', () => {
        let eventEmitted = false;
        const router = new Router({
            'item': '/page/:pageNumber/item/:itemNumber/:itemID',
            'page': '/page/:pageNumber', // shouldn't do this in real apps
            'default': '/',
        });
        class RouterView extends Component {
            init(router) {
                this.bind(router, () => eventEmitted = true);
            }
        }
        const v = new RouterView(router);
        router.remove();
        eventEmitted = false;
        window.dispatchEvent(new Event('popstate'));
        expect(eventEmitted).to.be.false;
    });

});
