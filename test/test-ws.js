<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>NestJS Todo + WebSocket Test</title>
  <style>
    * { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f2f5; padding: 20px; }
    .container { max-width: 1100px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
    h1 { margin: 0; font-size: 24px; }
    .section { padding: 20px; border-bottom: 1px solid #eee; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; }
    input, textarea, select, button { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    button { background: #3498db; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
    button:hover { background: #2980b9; }
    button.danger { background: #e74c3c; }
    button.danger:hover { background: #c0392b; }
    .todo-list { display: grid; gap: 12px; margin-top: 15px; }
    .todo-item { border: 1px solid #eee; border-radius: 8px; padding: 15px; background: #f9f9f9; }
    .todo-item h4 { margin: 0 0 8px; color: #2c3e50; }
    .todo-item p { margin: 4px 0; font-size: 14px; color: #555; }
    .actions { margin-top: 10px; display: flex; gap: 8px; }
    .actions button { width: auto; padding: 6px 12px; font-size: 12px; }
    .log { background: #2c3e50; color: #0f0; padding: 15px; height: 180px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 13px; border-radius: 8px; }
    .log.error { color: #e74c3c; }
    .ws-status { padding: 8px 12px; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
    .connected { background: #27ae60; color: white; }
    .disconnected { background: #c0392b; color: white; }
    .pagination { text-align: center; margin: 15px 0; }
    .pagination button { width: auto; padding: 8px 16px; margin: 0 5px; }
    .hidden { display: none; }
  </style>
</head>
<body>

<div class="container">
  <header>
    <h1>NestJS Todo + WebSocket (Native ws)</h1>
    <div id="ws-status" class="ws-status disconnected">WebSocket: Đã ngắt</div>
  </header>

  <!-- Login -->
  <div class="section">
    <h2>Đăng nhập</h2>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="email" value="thuanhai1@gmail.com" />
    </div>
    <div class="form-group">
      <label>Mật khẩu</label>
      <input type="password" id="password" value="thuanhai1" />
    </div>
    <button onclick="login()">Đăng nhập</button>
    <p id="login-msg"></p>
  </div>

  <!-- Create Todo -->
  <div class="section hidden" id="create-section">
    <h2>Tạo Todo mới</h2>
    <div class="form-group">
      <label>Tiêu đề</label>
      <input type="text" id="title" placeholder="Học NestJS..." />
    </div>
    <div class="form-group">
      <label>Nội dung</label>
      <textarea id="content" rows="3" placeholder="Chi tiết công việc..."></textarea>
    </div>
    <div class="form-group">
      <label>Thời hạn (vd: 1d, 2h30m)</label>
      <input type="text" id="duration" placeholder="1d" />
    </div>
    <div class="form-group">
      <label>Ưu tiên</label>
      <select id="priority">
        <option value="Low">Thấp</option>
        <option value="Medium">Trung bình</option>
        <option value="High">Cao</option>
      </select>
    </div>
    <div class="form-group">
      <label>Trạng thái</label>
      <select id="status">
        <option value="Pending">Chờ</option>
        <option value="Done">Hoàn thành</option>
      </select>
    </div>
    <button onclick="createTodo()">Tạo Todo</button>
  </div>

  <!-- Search & List -->
  <div class="section hidden" id="list-section">
    <h2>Danh sách Todo</h2>
    <div class="form-group">
      <input type="text" id="search" placeholder="Tìm kiếm theo tiêu đề/nội dung..." onkeyup="debounceSearch()" />
    </div>
    <div id="todos"></div>
    <div class="pagination" id="pagination"></div>
  </div>

  <!-- Log -->
  <div class="section">
    <h2>Log WebSocket & API</h2>
    <div id="log" class="log"></div>
  </div>
</div>

<script>
  const API_URL = 'http://localhost:3000/api/v1';
  const WSA_URL = 'ws://localhost:3001';
  let token = '';
  let ws = null;
  let currentUserId = '';
  let todos = [];
  let currentPage = 1;
  const limit = 5;

  // === UTILS ===
  function log(msg, type = 'info') {
    const logEl = document.getElementById('log');
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (type === 'error') div.className = 'error';
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setStatus(connected) {
    const el = document.getElementById('ws-status');
    el.textContent = connected ? 'WebSocket: Đã kết nối' : 'WebSocket: Đã ngắt';
    el.className = 'ws-status ' + (connected ? 'connected' : 'disconnected');
  }

  // === AUTH ===
  async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('login-msg');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const response = await res.json();
      if (!response.d?.accessToken) throw new Error('Invalid response format');

      token = response.d.accessToken;

      // Parse JWT
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.userId;
      } catch (err) {
        throw new Error('Token không hợp lệ');
      }

      msg.textContent = 'Đăng nhập thành công!';
      msg.style.color = 'green';

      document.getElementById('create-section').classList.remove('hidden');
      document.getElementById('list-section').classList.remove('hidden');

      loadTodos();
      connectWebSocket();

    } catch (err) {
      token = '';
      msg.textContent = 'Lỗi: ' + err.message;
      msg.style.color = 'red';
      log('Lỗi login: ' + err.message, 'error');
    }
  }

  // === WEBSOCKET ===
  function connectWebSocket() {
    if (!token) return log('Chưa có token, không kết nối WS');
    if (ws) ws.close();

    ws = new WebSocket(`${WSA_URL}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      log('WebSocket: Đã kết nối');
      setStatus(true);
    };

    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);
        log(`WS ${event}: ${data.title || data.todoId || '...'}`);

        if (event === 'error') {
          log(`WS Lỗi: ${data.d?.message || data.message}`, 'error');
          return;
        }

        if (['TodoCreated', 'TodoUpdated', 'TodoRemoved'].includes(event)) {
          loadTodos(currentPage, getSearch());
        }
      } catch (err) {
        log('WS data lỗi: ' + e.data, 'error');
      }
    };

    ws.onclose = () => {
      log('WebSocket ngắt');
      setStatus(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => log('WS lỗi kết nối', 'error');
  }

  // === TODO API ===
  async function createTodo() {
    if (!token) return log('Chưa đăng nhập', 'error');

    const dto = {
      title: document.getElementById('title').value.trim(),
      content: document.getElementById('content').value.trim(),
      duration: document.getElementById('duration').value.trim() || undefined,
      priority: document.getElementById('priority').value,
      status: document.getElementById('status').value,
    };

    if (!dto.title) return log('Tiêu đề không được để trống', 'error');

    try {
      const res = await fetch(`${API_URL}/todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dto)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Tạo thất bại');
      }

      const data = await res.json();
      log(`Tạo thành công: ${data.d.title}`);

      // Reset form
      document.getElementById('title').value = '';
      document.getElementById('content').value = '';
      document.getElementById('duration').value = '';
      document.getElementById('priority').value = 'Low';
      document.getElementById('status').value = 'Pending';

      loadTodos(currentPage, getSearch());

    } catch (err) {
      log('Tạo Todo lỗi: ' + err.message, 'error');
    }
  }

  async function loadTodos(page = 1, q = '') {
    if (!token) return;
    currentPage = page;

    try {
      const url = new URL(`${API_URL}/todo`);
      url.searchParams.set('page', page);
      url.searchParams.set('limit', limit);
      if (q) url.searchParams.set('q', q);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Load failed');
      }

      const result = await res.json();
      console.log('Load Todos Response:', result.d); // Debug

      todos = result.d.data || [];
      renderTodos();
      renderPagination(result.pagination || {});

    } catch (err) {
      log('Load Todos lỗi: ' + err.message, 'error');
    }
  }

  function renderTodos() {
    const container = document.getElementById('todos');
    if (!todos.length) {
      container.innerHTML = '<p>Không có Todo nào.</p>';
      return;
    }

    container.innerHTML = '<div class="todo-list">' + todos.map(todo => `
      <div class="todo-item">
        <h4>${escapeHtml(todo.title)} <small>(${todo.priority})</small></h4>
        <p><strong>Nội dung:</strong> ${todo.content ? escapeHtml(todo.content) : '<i>Không có</i>'}</p>
        <p><strong>Trạng thái:</strong> <span style="color: ${todo.status === 'Done' ? 'green' : 'orange'}">${todo.status}</span></p>
        <p><strong>Hết hạn:</strong> ${todo.duration ? new Date(todo.duration).toLocaleString('vi-VN') : '<i>Không có</i>'}</p>
        <p><strong>Tạo lúc:</strong> ${new Date(todo.createdAt).toLocaleString('vi-VN')}</p>
        <div class="actions">
          <button onclick="openUpdate('${todo.todoId}')">Sửa</button>
          <button class="danger" onclick="removeTodo('${todo.todoId}')">Xóa</button>
        </div>
      </div>
    `).join('') + '</div>';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderPagination(pag) {
    const el = document.getElementById('pagination');
    if (!pag.totalPages) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `
      <button ${pag.page <= 1 ? 'disabled' : ''} onclick="loadTodos(${pag.page - 1}, getSearch())">Trước</button>
      <span>Trang ${pag.page}/${pag.totalPages} (Tổng: ${pag.total})</span>
      <button ${pag.page >= pag.totalPages ? 'disabled' : ''} onclick="loadTodos(${pag.page + 1}, getSearch())">Sau</button>
    `;
  }

  function getSearch() {
    return document.getElementById('search').value.trim();
  }

  let searchTimeout;
  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadTodos(1, getSearch()), 500);
  }

  async function removeTodo(id) {
    if (!confirm('Xóa Todo này?')) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/todo/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Xóa thất bại');
      }

      log(`Xóa ${id} thành công`);
      loadTodos(currentPage, getSearch());

    } catch (err) {
      log('Xóa lỗi: ' + err.message, 'error');
    }
  }

  // === UPDATE TODO ===
  async function updateTodo(id, dto) {
    if (!token) return log('Chưa đăng nhập', 'error');
    if (Object.keys(dto).length === 0) return;

    try {
      const res = await fetch(`${API_URL}/todo/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dto)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Cập nhật thất bại');
      }

      log(`Cập nhật ${id} thành công`);
      loadTodos(currentPage, getSearch());

    } catch (err) {
      log('Cập nhật lỗi: ' + err.message, 'error');
    }
  }

  // === OPEN UPDATE ===
  function openUpdate(id) {
    const todo = todos.find(t => t.todoId === id);
    if (!todo) return log('Không tìm thấy Todo', 'error');

    const newTitle = prompt('Tiêu đề mới:', todo.title);
    if (newTitle === null) return; // Bấm cancel

    const newContent = prompt('Nội dung mới:', todo.content || '');
    if (newContent === null) return;

    const newDuration = prompt('Thời hạn mới (vd: 1d, 2h):', todo.duration || '');
    if (newDuration === null) return;

    const newPriority = prompt('Ưu tiên mới (Low/Medium/High):', todo.priority);
    if (newPriority === null) return;

    const newStatus = prompt('Trạng thái mới (Pending/Done):', todo.status);
    if (newStatus === null) return;

    const dto = {};
    if (newTitle && newTitle !== todo.title) dto.title = newTitle;
    if (newContent !== todo.content) dto.content = newContent || null;
    if (newDuration !== todo.duration) dto.duration = newDuration || null;
    if (newPriority && newPriority !== todo.priority) dto.priority = newPriority;
    if (newStatus && newStatus !== todo.status) dto.status = newStatus;

    if (Object.keys(dto).length === 0) {
      log('Không có thay đổi');
      return;
    }

    updateTodo(id, dto);
  }

  // === ENTER TO LOGIN ===
  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement.tagName !== 'TEXTAREA') {
      login();
    }
  });
</script>

</body>
</html>