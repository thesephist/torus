// The todo sample project shows how the view and model
//  layers of Torus interact.

class Task extends Record {}
class TaskStore extends StoreOf(Task) {
    get comparator() {
        return task => task.get('description').toLowerCase();
    }
}

const tasks = new TaskStore([
    new Task(1, {description: 'Do this', completed: false,}),
    new Task(2, {description: 'Do that', completed: false,}),
]);

class TaskItem extends Component {

    init(source) {
        this.boundOnCheck = this.onCheck.bind(this);
        this.listen(source, data => this.render(data));
    }

    onCheck() {
        this.record.update({
            completed: !this.record.get('completed'),
        });
    }

    compose(data) {
        return {
            tag: 'li',
            attrs: {
                style: {
                    opacity: data.completed ? 0.4 : 1,
                    height: '50px',
                    width: '100%',
                    background: '#eee',
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'left',
                    marginBottom: '1px',
                    cursor: 'pointer',
                },
            },
            events: {
                click: this.boundOnCheck,
            },
            children: [{
                tag: 'input',
                attrs: {
                    type: 'checkbox',
                    checked: data.completed,
                },
                events: {
                    change: this.boundOnCheck,
                },
            }, data.description],
        }
    }

}

class TaskList extends ListOf(TaskItem) {

    compose() {
        return {
            tag: 'ul',
            attrs: {
                style: {
                    padding: 0,
                },
            },
            children: [...this.nodes],
        }
    }

}

class TaskInput extends Component {

    init() {
        this.value = '';
        this.boundOnKeyPress = this.onKeyPress.bind(this);
        this.boundOnAddClick = this.onAddClick.bind(this);
        this.boundSetValue = this.setValue.bind(this);
    }

    onKeyPress(evt) {
        if (evt.keyCode === 13) {
            this._addTask();
        }
    }

    onAddClick(evt) {
        this._addTask();
    }

    setValue(evt) {
        this.value = evt.target.value;
        this.render();
    }

    _addTask() {
        tasks.create(undefined, {
            description: this.value,
            completed: false,
        });

        this.value = '';
        this.render();
    }

    compose() {
        return {
            tag: 'div',
            attrs: {
                style: {
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                },
            },
            children: [
                {
                    tag: 'input',
                    attrs: {
                        value: this.value,
                        style: {
                            flexGrow: 1,
                        }
                    },
                    events: {
                        input: this.boundSetValue,
                        keypress: this.boundOnKeyPress,
                    },
                },
                {
                    tag: 'button',
                    events: {
                        click: this.boundOnAddClick,
                    },
                    children: ['Add'],
                },
            ],
        }
    }

}

class App extends Component {

    init() {
        this.input = new TaskInput();
        this.list = new TaskList(tasks);
    }

    compose() {
        return {
            tag: 'div',
            attrs: {
                style: {
                    fontFamily: "'Helvetica', 'Ubuntu', sans-serif",
                    width: '100%',
                    maxWidth: '500px',
                    margin: '0 auto',
                },
            },
            children: [this.input.node, this.list.node],
        }
    }

}

const app = new App();
document.body.appendChild(app.node);
