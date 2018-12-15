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
            const node = render({
                tag: 'div',
                attrs: {id: 'some_id_string'},
            });

            node.id.should.equal('some_id_string');
        });

        describe('class', () => {

            it('should add a new class provided as a string', () => {
                const node = render({
                    tag: 'img',
                    attrs: {class: 'myImg'},
                });

                node.classList.contains('myImg').should.be.true;
            });

            it('should add new classes provided as lists', () => {
                const node = render({
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

                let node = render(prev);
                node = renderJDOM(node, prev, next);
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

                let node = render(prev);
                node = renderJDOM(node, prev, next);
                node.classList.contains('firstClass').should.be.true;
                node.classList.contains('second_class').should.be.false;
                node.classList.contains('third-class').should.be.true;
            });

        });

        describe('style', () => {

            it('should apply new styles', () => {
                const node = render({
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

                let node = render(prev);
                node.style.height.should.equal('100px');
                node = renderJDOM(node, prev, next);
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

                let node = render(prev);
                parseFloat(node.style.opacity).should.equal(.8);
                node = renderJDOM(node, prev, next);
                parseFloat(node.style.opacity).should.equal(.35);
            });

        });

        describe('HTML attributes', () => {

            it('should add new attributes', () => {
                const node = render({
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
                        'data-foo': 'bar',
                        'data-magic': 'magic',
                    },
                }
                const next = {
                    tag: 'input',
                    attrs: {
                        type: 'checkbox',
                        'data-foo': 'baz',
                    },
                }

                const node = render(prev);
                node.getAttribute('data-magic').should.equal('magic');
                node.getAttribute('data-foo').should.equal('bar');
                const node2 = renderJDOM(node, prev, next);
                expect(node.getAttribute('checked')).to.be.null;
                node.getAttribute('data-foo').should.equal('baz');
            });

            it('should reflect IDL properties as DOM properties', () => {
                const node = render({
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

                const node = render(prev);
                node.checked.should.be.true;
                const node2 = renderJDOM(node, prev, next);
                node2.checked.should.be.false;
            });

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

        it('should attach new listeners', () => {
            let clickCalled = false;

            const node = render({
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

            const node = render(prev);
            node.click();
            const node2 = renderJDOM(node, prev, next);
            node2.click();

            firstClickCount.should.equal(1);
            secondClickCount.should.equal(1);
        });

        it('should accept an array of event handlers', () => {
            let firstClickCount = 0;
            let secondClickCount = 0;

            const node = render({
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

            const node = render(prev);
            node.click();
            const node2 = renderJDOM(node, prev, next);
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

        const childNode = render(prev);
        const parentNode = document.createElement('div');
        parentNode.appendChild(childNode);
        parentNode.textContent.trim().should.equal('Button text');
        renderJDOM(childNode, prev, next);
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
        const prev = ul([
            first, second, third,
        ]);
        const next = ul([
            third, first, fourth, second,
        ]);

        const node = render(prev);
        node.textContent.should.equal('firstsecondthird');
        const node2 = renderJDOM(node, prev, next);
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
        const prev = ul([
            first, second, third, fourth,
        ]);
        const next = ul([
            third, first, second,
        ]);

        const node = render(prev);
        node.textContent.should.equal('firstsecondthirdfourth');
        const node2 = renderJDOM(node, prev, next);
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

    describe('Event bindings to #record', () => {

        it('should call event handler defined with #listen on source event', () => {
            let handlerCalled = false;

            const c = new Component();
            const r = new Record();
            c.listen(r, () => handlerCalled = true);

            r.update({key: 'value'});
            handlerCalled.should.be.true;
        });

        it('should no longer call the event handler after #unlisten()', () => {
            let handlerCallCount = 0;

            const c = new Component();
            const r = new Record();
            c.listen(r, () => handlerCallCount++);

            r.update({key: 'value'});
            handlerCallCount.should.equal(1);
            c.unlisten();
            r.update({key: 'value'});
            handlerCallCount.should.equal(1);
        });

        it('should remove the previous lister when a new source is set', () => {
            let handlerCallCount = 0;

            const c = new Component();
            const r = new Record();
            c.listen(r, () => handlerCallCount++);

            r.update({key: 'value'});
            handlerCallCount.should.equal(1);
            c.listen(new Record(), () => {});
            r.update({key: 'value'});
            handlerCallCount.should.equal(1);
        });

    });

    describe('#render', () => {

        class FooComponent extends Component {
            compose() {
                return h1(['Hello, World!']);
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

    });

});

describe('List', () => {

    class ItemComponent extends Component {
        init(record) {
            this.listen(record, () => this.render);
        }
        compose(data) {
            return li([data.label]);
        }
    }

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

    });

    describe('Events', () => {

        it('when a new record is added to the list, add the item', () => {

        });

        it('when a new record is removed from the list, remove the item', () => {

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

describe('Evented', () => {

});

describe('Record', () => {

    it('should inherit from Evented', () => {
        const r = new Record();
        r.should.be.an.instanceof(Evented);
    });

});

describe('Store', () => {

    it('should inherit from Evented', () => {
        const s = new Store();
        s.should.be.an.instanceof(Evented);
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

