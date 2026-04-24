const form = document.getElementById('todo-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const list = document.getElementById('todo-list');

async function fetchTodos() {
  const res = await fetch('/api/todos');
  const todos = await res.json();
  render(todos);
}

function render(todos) {
  list.innerHTML = '';
  if (!todos.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No todos yet.';
    list.appendChild(empty);
    return;
  }
  for (const todo of todos) {
    const li = document.createElement('li');
    if (todo.completed) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener('change', () => toggle(todo.id, checkbox.checked));

    const body = document.createElement('div');
    body.className = 'body';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = todo.title;
    body.appendChild(title);

    if (todo.content) {
      const content = document.createElement('div');
      content.className = 'content';
      content.textContent = todo.content;
      body.appendChild(content);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'del';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => remove(todo.id));

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(delBtn);
    list.appendChild(li);
  }
}

async function createTodo(title, content) {
  await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
}

async function toggle(id, completed) {
  await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  fetchTodos();
}

async function remove(id) {
  await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  fetchTodos();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title) return;
  await createTodo(title, content || null);
  titleInput.value = '';
  contentInput.value = '';
  fetchTodos();
});

fetchTodos();
