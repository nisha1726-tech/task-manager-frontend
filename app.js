const API = 'https://team-task-manager-production-a356.up.railway.app/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Redirect if not logged in
if (!token) window.location.href = 'index.html';

let allUsers = [], allProjects = [], allTasks = [], currentTaskId = null;

// Init
window.onload = async () => {
  document.getElementById('userInfo').textContent = `👤 ${user.name} (${user.role})`;

  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  await loadUsers();
  await loadProjects();
  await loadTasks();
  updateStats();
};

function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// TABS
function showTab(tab, el) {
  ['projects', 'tasks', 'users'].forEach(t => {
    document.getElementById(`${t}Tab`).classList.add('hidden');
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`${tab}Tab`).classList.remove('hidden');
  el.classList.add('active');
}

// LOGOUT
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// LOAD USERS
async function loadUsers() {
  try {
    const res = await fetch(`${API}/auth/users`, { headers: headers() });
    if (res.ok) {
      allUsers = await res.json();
      renderUsers();
      populateUserSelects();
    }
  } catch (err) { console.log(err); }
}

function renderUsers() {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
    </tr>
  `).join('');
}

function populateUserSelects() {
  const taskAssign = document.getElementById('taskAssign');
  const projectMembers = document.getElementById('projectMembers');
  const opts = allUsers.map(u => `<option value="${u._id}">${u.name} (${u.role})</option>`).join('');
  if (taskAssign) taskAssign.innerHTML = opts;
  if (projectMembers) projectMembers.innerHTML = opts;
}

// LOAD PROJECTS
async function loadProjects() {
  try {
    const res = await fetch(`${API}/projects`, { headers: headers() });
    allProjects = await res.json();
    renderProjects();
    populateProjectSelect();
  } catch (err) { console.log(err); }
}

function renderProjects() {
  const tbody = document.getElementById('projectsTable');
  tbody.innerHTML = allProjects.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.description || '-'}</td>
      <td>${p.members?.map(m => m.name).join(', ') || '-'}</td>
      <td>${p.createdBy?.name || '-'}</td>
      ${user.role === 'admin' ? `
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p._id}')">Delete</button>
      </td>` : ''}
    </tr>
  `).join('');
}

function populateProjectSelect() {
  const sel = document.getElementById('taskProject');
  if (sel) sel.innerHTML = allProjects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
}

// LOAD TASKS
async function loadTasks() {
  try {
    const res = await fetch(`${API}/tasks`, { headers: headers() });
    allTasks = await res.json();
    renderTasks();
    updateStats();
  } catch (err) { console.log(err); }
}

function renderTasks() {
  const tbody = document.getElementById('tasksTable');
  const today = new Date();
  tbody.innerHTML = allTasks.map(t => {
    const overdue = t.dueDate && new Date(t.dueDate) < today && t.status !== 'done';
    const statusBadge = overdue ? 'badge-overdue' : t.status === 'todo' ? 'badge-todo' : t.status === 'in-progress' ? 'badge-progress' : 'badge-done';
    const statusLabel = overdue ? 'Overdue' : t.status;
    return `
      <tr>
        <td><strong>${t.title}</strong></td>
        <td>${t.project?.name || '-'}</td>
        <td>${t.assignedTo?.name || '-'}</td>
        <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
        <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="openStatusModal('${t._id}', '${t.status}')">Update</button>
          ${user.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteTask('${t._id}')">Delete</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// STATS
function updateStats() {
  const today = new Date();
  document.getElementById('totalTasks').textContent = allTasks.length;
  document.getElementById('todoTasks').textContent = allTasks.filter(t => t.status === 'todo').length;
  document.getElementById('progressTasks').textContent = allTasks.filter(t => t.status === 'in-progress').length;
  document.getElementById('doneTasks').textContent = allTasks.filter(t => t.status === 'done').length;
  document.getElementById('overdueTasks').textContent = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'done').length;
}

// PROJECT MODAL
function openProjectModal() {
  document.getElementById('projectModal').classList.remove('hidden');
}
function closeProjectModal() {
  document.getElementById('projectModal').classList.add('hidden');
}

async function createProject() {
  const name = document.getElementById('projectName').value;
  const description = document.getElementById('projectDesc').value;
  const membersEl = document.getElementById('projectMembers');
  const members = Array.from(membersEl.selectedOptions).map(o => o.value);
  if (!name) return alert('Project name is required!');
  try {
    const res = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, description, members })
    });
    if (res.ok) {
      closeProjectModal();
      await loadProjects();
      document.getElementById('projectName').value = '';
      document.getElementById('projectDesc').value = '';
    }
  } catch (err) { console.log(err); }
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  await fetch(`${API}/projects/${id}`, { method: 'DELETE', headers: headers() });
  await loadProjects();
}

// TASK MODAL
function openTaskModal() {
  document.getElementById('taskModal').classList.remove('hidden');
}
function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
}

async function createTask() {
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDesc').value;
  const project = document.getElementById('taskProject').value;
  const assignedTo = document.getElementById('taskAssign').value;
  const dueDate = document.getElementById('taskDue').value;
  if (!title) return alert('Task title is required!');
  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ title, description, project, assignedTo, dueDate })
    });
    if (res.ok) {
      closeTaskModal();
      await loadTasks();
      document.getElementById('taskTitle').value = '';
    }
  } catch (err) { console.log(err); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch(`${API}/tasks/${id}`, { method: 'DELETE', headers: headers() });
  await loadTasks();
}

// STATUS MODAL
function openStatusModal(id, currentStatus) {
  currentTaskId = id;
  document.getElementById('newStatus').value = currentStatus;
  document.getElementById('statusModal').classList.remove('hidden');
}
function closeStatusModal() {
  document.getElementById('statusModal').classList.add('hidden');
}

async function updateStatus() {
  const status = document.getElementById('newStatus').value;
  try {
    const res = await fetch(`${API}/tasks/${currentTaskId}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      closeStatusModal();
      await loadTasks();
    }
  } catch (err) { console.log(err); }
}