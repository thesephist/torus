//> The todo sample project shows how the view and model
//  layers of Torus interact in a simple case.

//> `Task` is our model for a single todo item. We just extend
//  `Record` since we don't need it to have any special functionality.
class Task extends Record {}

//> `TaskStore` represents a collection of todos, or our to-do list.
//  Our todo list component will be bound to this store.
class TaskStore extends StoreOf(Task) {
    //> Let's sort this collection by the task description
    get comparator() {
        return task => task.get('description').toLowerCase();
    }
}

//> We create an instance of the task collection for our list,
//  and initialize it with two items.
const tasks = new TaskStore([
    new Task(1, {description: 'Do this', completed: false,}),
    new Task(2, {description: 'Do that', completed: false,}),
]);

//> Component that represents a single todo item
class TaskItem extends StyledComponent {

    init(source) {
        this.boundOnCheck = this.onCheck.bind(this);
        //> We want the component to re-render when the todo item's properties
        //  change, so we bind the record's events to re-renders.
        this.bind(source, data => this.render(data));
    }

    styles(data) {
        return {
            //> When the task is completed, we'll fade out that item.
            'opacity': data.completed ? 0.4 : 1,
            'height': '50px',
            'width': '100%',
            'background': '#eee',
            'list-style': 'none',
            'display': 'flex',
            'flex-direction': 'row',
            'align-items': 'center',
            'justify-content': 'left',
            'margin-bottom': '1px',
            'cursor': 'pointer',
        }
    }

    //> When we check the item off the list from the UI,
    //  we toggle the 'completed' property on the record.
    onCheck() {
        this.record.update({
            completed: !this.record.get('completed'),
        });
    }

    compose(data) {
        return jdom`<li onclick="${this.boundOnCheck}">
            <input type="checkbox" checked="${data.completed}"/>
            ${data.description}
        </li>`;
    }

}

//> Subclass of the default list view that represents a list of tasks.
//  We use the `ListOf(TaskItem)` syntax to tell `TaskList` to render
//  new items that appear in the collection as `TaskItem` components.
class TaskList extends ListOf(TaskItem) {

    compose() {
        return jdom`<ul style="padding:0">${this.nodes}</ul>`;
    }

}

//> Input field with a submit button that creates new items in the
//  list of tasks.
class TaskInput extends StyledComponent {

    init() {
        this.value = '';
        this.boundOnKeyPress = this.onKeyPress.bind(this);
        this.boundOnAddClick = this.onAddClick.bind(this);
        this.boundSetValue = this.setValue.bind(this);
    }

    //> If an enter key is pressed, try to add a task
    onKeyPress(evt) {
        if (evt.keyCode === 13) {
            this._addTask();
        }
    }

    //> If the add button is clicked, try to add a task
    onAddClick(evt) {
        this._addTask();
    }

    //> We want the input component to be a [controlled
    //  component](https://reactjs.org/docs/forms.html#controlled-components)
    //  so every time there's an input, we update the component's `value` property accordingly.
    setValue(evt) {
        this.value = evt.target.value;
        this.render();
    }

    //> What happens when we try to add a task?
    //  Create a new task in the task list with the current
    //  input value, in an uncompleted state.
    _addTask() {
        if (this.value) {
            tasks.create(undefined, {
                description: this.value,
                completed: false,
            });

            this.value = '';
            this.render();
        }
    }

    styles() {
        return {
            'width': '100%',
            'display': 'flex',
            'flex-direction': 'row',

            'input': {
                'flex-grow': 1,
            },
        }
    }

    compose() {
        return jdom`<div>
            <input
                value="${this.value}"
                oninput="${this.boundSetValue}"
                onkeypress="${this.boundOnKeyPress}"/>
            <button onclick="${this.boundOnAddClick}">Add</button>
        </div>`;
    }

}

//> A component to represent the entire app, bringing together
//  the input component and the todo list component.
class App extends StyledComponent {

    init() {
        //> We create instances of both input and list views here,
        //  to reuse in repeated renders.
        this.input = new TaskInput();
        this.list = new TaskList(tasks);
    }

    styles() {
        return {
            'font-family': "'Helvetica', 'Ubuntu', sans-serif",
            'width': '100%',
            'max-width': '500px',
            'margin': '0 auto',
        }
    }

    compose() {
        //> The app is really just both components' nodes wrapped
        //  in a single div.
        return jdom`<div>${[this.input.node, this.list.node]}</div>`;
    }

}

//> Create an instance of the app, and append to the DOM.
const app = new App();
document.body.appendChild(app.node);
