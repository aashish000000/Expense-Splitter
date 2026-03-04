Auth.requireAuth();

const loggedInUser = Auth.getUser();

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const groupId = getQueryParam('groupId');
let groupName = getQueryParam('groupName');
let categories = [];

if (!groupId) {
  Toast.error('Missing groupId in URL');
  window.location.href = 'home.html';
}

async function fetchCategories() {
  try {
    const response = await fetch('/groups/categories');
    const data = await response.json();
    categories = data.categories || [];
    populateCategorySelect();
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

function populateCategorySelect() {
  const select = document.getElementById('expenseCategory');
  if (!select) return;
  
  select.innerHTML = categories.map(cat => 
    `<option value="${cat}">${cat}</option>`
  ).join('');
}

async function fetchUserDetails() {
  try {
    const response = await fetch(`/api/groups/${groupId}/users`);
    if (!response.ok) throw new Error('Failed to fetch user details');
    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return [];
  }
}

function displayUserDetails(users) {
  const usersList = document.getElementById('users');
  usersList.innerHTML = '';
  
  if (users.length === 0) {
    usersList.innerHTML = '<li class="list-item">No members yet</li>';
    return;
  }
  
  users.forEach((user) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    const balanceClass = user.balance > 0 ? 'color: var(--danger)' : user.balance < 0 ? 'color: var(--success)' : '';
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${user.username}</span>
        <span style="${balanceClass}; font-weight: 500;">
          ${user.balance > 0 ? 'Owes' : user.balance < 0 ? 'Owed' : ''} 
          $${Math.abs(user.balance).toFixed(2)}
        </span>
      </div>
    `;
    usersList.appendChild(li);
  });
}

async function addExpense(name, amount, category) {
  try {
    const response = await fetch(`/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, category }),
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message);
    
    Toast.success('Expense added!');
    listExpenses();
    fetchUserDetails().then(displayUserDetails);
  } catch (error) {
    console.error('Error adding expense:', error);
    Toast.error(error.message || 'Failed to add expense');
  }
}

async function listExpenses() {
  document.getElementById('gname').textContent = groupName;
  
  const expensesList = document.getElementById('expensesList');
  expensesList.innerHTML = '<li class="skeleton" style="height: 50px;"></li>';
  
  try {
    const response = await fetch(`/groups/${groupId}/expenses`);
    if (!response.ok) throw new Error('Failed to fetch expenses');

    const data = await response.json();
    expensesList.innerHTML = '';

    if (data.expenses.length === 0) {
      expensesList.innerHTML = '<li class="list-item">No expenses yet</li>';
      return;
    }

    data.expenses.forEach((expense) => {
      const listItem = document.createElement('li');
      listItem.className = 'list-item';
      listItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${expense.name}</strong>
            <span class="category-badge" style="margin-left: 8px;">${expense.category || 'Other'}</span>
          </div>
          <span style="font-weight: 600;">$${expense.amount.toFixed(2)}</span>
        </div>
      `;
      expensesList.appendChild(listItem);
    });

    // Update summary
    if (data.summary) {
      const summaryEl = document.getElementById('expenseSummary');
      if (summaryEl) {
        summaryEl.innerHTML = `
          <strong>Total:</strong> $${data.summary.total.toFixed(2)} 
          <span style="color: var(--text-light);">(${data.summary.count} expenses)</span>
        `;
      }
    }
  } catch (error) {
    console.error('Error fetching expenses:', error);
    expensesList.innerHTML = '<li class="list-item">Failed to load expenses</li>';
  }
}

async function fetchSettlements() {
  try {
    const response = await fetch(`/groups/${groupId}/settlements`);
    const data = await response.json();
    
    const settlementsList = document.getElementById('settlementsList');
    if (!settlementsList) return;
    
    if (!data.settlements || data.settlements.length === 0) {
      settlementsList.innerHTML = '<li class="list-item">All settled up!</li>';
      return;
    }
    
    settlementsList.innerHTML = data.settlements.map(s => `
      <li class="list-item">
        <strong>${s.from}</strong> pays <strong>${s.to}</strong>: 
        <span style="color: var(--success); font-weight: 600;">$${s.amount.toFixed(2)}</span>
      </li>
    `).join('');
  } catch (error) {
    console.error('Error fetching settlements:', error);
  }
}

document.getElementById('addExpenseButton').addEventListener('click', () => {
  const name = document.getElementById('expenseName').value.trim();
  const amount = document.getElementById('expenseAmount').value;
  const category = document.getElementById('expenseCategory')?.value || 'Other';

  if (!name || !amount) {
    Toast.error('Please fill in all fields');
    return;
  }

  addExpense(name, parseFloat(amount), category);
  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
});

document.getElementById('iPaidButton').addEventListener('click', async () => {
  const userId = loggedInUser?.id;
  if (!userId) {
    Toast.error('User ID is missing.');
    return;
  }

  const confirmed = await Modal.confirm('Mark as Paid', 'This will reset your balance to $0. Continue?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/groups/${groupId}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId }),
    });

    if (response.ok) {
      Toast.success('Balance cleared!');
      fetchUserDetails().then(displayUserDetails);
      fetchSettlements();
    } else {
      Toast.error('Failed to update payment status.');
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.error('An error occurred.');
  }
});

document.getElementById('deleteExpenseButton').addEventListener('click', async () => {
  const confirmed = await Modal.confirm('Delete Group', 'Are you sure you want to delete this group? This cannot be undone.');
  if (!confirmed) return;

  try {
    const response = await fetch(`/groups/${groupId}`, { method: 'DELETE' });

    if (response.ok) {
      Toast.success('Group deleted!');
      setTimeout(() => window.location.href = 'home.html', 1000);
    } else {
      const error = await response.json();
      Toast.error(error.message || 'Failed to delete group');
    }
  } catch (err) {
    console.error('Error deleting group:', err);
    Toast.error('An error occurred.');
  }
});

document.getElementById('edit-btn').addEventListener('click', async () => {
  const newName = await Modal.prompt('Rename Group', groupName);
  if (!newName || newName === groupName) return;

  try {
    const response = await fetch(`/groups/${groupId}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    });

    if (response.ok) {
      groupName = newName;
      document.getElementById('gname').textContent = newName;
      const url = new URL(window.location);
      url.searchParams.set('groupName', newName);
      window.history.replaceState({}, '', url);
      Toast.success('Group renamed!');
    } else {
      const error = await response.json();
      Toast.error(error.message || 'Failed to rename group');
    }
  } catch (error) {
    console.error(error);
    Toast.error('Error updating group name');
  }
});

document.getElementById('exportBtn')?.addEventListener('click', () => {
  window.open(`/groups/${groupId}/export`, '_blank');
});

// WebSocket setup
const isSecure = location.protocol === 'https:';
const wsScheme = isSecure ? 'wss:' : 'ws:';
const backendHost = location.host || 'localhost:3000';
const socketUrl = `${wsScheme}//${backendHost}/ws/${groupId}`;
const socket = new WebSocket(socketUrl);

const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatModal');
const closeChatModal = document.getElementById('closeChatModal');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');

chatButton.addEventListener('click', () => {
  chatModal.style.display = 'flex';
  chatInput.focus();
});

closeChatModal.addEventListener('click', () => {
  chatModal.style.display = 'none';
});

chatModal.addEventListener('click', (e) => {
  if (e.target === chatModal) {
    chatModal.style.display = 'none';
  }
});

socket.onmessage = (event) => {
  try {
    const { user, text } = JSON.parse(event.data);
    const div = document.createElement('div');
    const isMe = user === loggedInUser?.username;
    div.style.cssText = isMe ? 'background: var(--primary-light); color: white;' : '';
    div.textContent = `${user}: ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    console.error('Invalid WS payload', err);
  }
};

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.send(JSON.stringify({ user: loggedInUser?.username, text }));
  chatInput.value = '';
}

sendChatButton.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

window.addEventListener('beforeunload', () => socket.close());

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();
  listExpenses();
  fetchUserDetails().then(displayUserDetails);
  fetchSettlements();
});
