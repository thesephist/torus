describe('Node factory functions', () => {

    it('should correctly process 1 argument of array as children in an array', () => {
        const jdom = h1(['Hello']);
        jdom.tag.should.equal('h1');
        jdom.children.should.deep.equal(['Hello']);
    });

    it('should correctly process 1 argument of object as attrs', () => {
        const jdom = li({
            style: {fontSize: '20px'},
        });
        jdom.tag.should.equal('li');
        jdom.attrs.should.deep.equal({style:{
            fontSize: '20px',
        }});
    });

    it('should correctly process 2 arguments as attrs and children', () => {
        const jdom = li({
            style: {fontSize: '20px'},
        }, ['List item']);
        jdom.tag.should.equal('li');
        jdom.attrs.should.deep.equal({style:{
            fontSize: '20px',
        }});
        jdom.children.should.deep.equal(['List item']);
    });

    it('should correctly process 2 arguments of objects as attrs and events', () => {
        const clickHandler = () => {};
        const jdom = button({
            disabled: true,
        }, {
            click: clickHandler,
        });
        jdom.tag.should.equal('button');
        jdom.attrs.should.deep.equal({disabled: true});
    });

    it('should correctly process 3 arguments as attrs, events, children', () => {
        const clickHandler = () => {};
        const jdom = button({
            disabled: true,
        }, {
            click: clickHandler,
        }, ['button text']);
        jdom.tag.should.equal('button');
        jdom.attrs.should.deep.equal({disabled: true});
        jdom.children.should.deep.equal(['button text']);
    });

});

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
            node.childNodes[0].nodeType.should.equal(8);
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

    describe('#remove', () => {

        it('should remove all existing event listeners', () => {
            let unlistened = false;

            class Foo extends Component {
                unlisten() {
                    unlistened = true;
                }
            }
            const f = new Foo();
            unlistened.should.be.false;
            f.remove();
            unlistened.should.be.true;
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
                    'font-size': '18px',
                    'background': 'rgba(0, 0, 0, 0.4)',
                    '@keyframes some-name': `{
                        from {opacity: 0}
                        to {opacity: 1}
                    }`,
                    '&.invalid': {
                        'color': 'red',
                    },
                    '::after': {
                        'display': 'block',
                    },
                }
            }

            compose() {
                return div();
            }
        }

        it('should render without customization', () => {
            const Vanilla = Styled(class extends Component {
                compose() {return div()}
            });
            const v = new Vanilla();
        });

        it('should not throw with styles defined (placeholder test)', () => {
            const s = new S();
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
