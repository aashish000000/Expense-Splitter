Auth.requireAuth();

const loggedInUser = Auth.getUser();

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const groupId = getQueryParam('groupId');
const groupName = getQueryParam('groupName');

if (!groupId) {
  alert('Missing groupId in URL');
  window.location.href = 'home.html';
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
  users.forEach((user) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.textContent = `${user.username} - Balance: $${user.balance.toFixed(2)}`;
    usersList.appendChild(li);
  });
}

async function addExpense(name, amount) {
  try {
    const response = await fetch(`/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount }),
    });
    if (!response.ok) throw new Error('Failed to add expense');
    alert('Expense added successfully!');
    listExpenses();
    fetchUserDetails().then(displayUserDetails);
  } catch (error) {
    console.error('Error adding expense:', error);
    alert('Failed to add expense');
  }
}

async function listExpenses() {
  document.getElementById('gname').textContent = groupName;
  try {
    const response = await fetch(`/groups/${groupId}/expenses`);
    if (!response.ok) throw new Error('Failed to fetch expenses');

    const data = await response.json();
    const expensesList = document.getElementById('expensesList');
    expensesList.innerHTML = '';

    if (data.expenses.length === 0) {
      expensesList.innerHTML = '<li class="list-item">No expenses yet</li>';
      return;
    }

    data.expenses.forEach((expense) => {
      const listItem = document.createElement('li');
      listItem.className = 'list-item';
      listItem.textContent = `${expense.name}: $${expense.amount.toFixed(2)}`;
      expensesList.appendChild(listItem);
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
  }
}

document.getElementById('addExpenseButton').addEventListener('click', () => {
  const name = document.getElementById('expenseName').value.trim();
  const amount = document.getElementById('expenseAmount').value;

  if (!name || !amount) {
    alert('Please fill in all fields');
    return;
  }

  addExpense(name, parseFloat(amount));
  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
});

document.getElementById('iPaidButton').addEventListener('click', async () => {
  const userId = loggedInUser?.id;
  if (!userId) {
    alert('User ID is missing.');
    return;
  }

  try {
    const response = await fetch(`/groups/${groupId}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId }),
    });

    if (response.ok) {
      alert('Payment status updated successfully!');
      fetchUserDetails().then(displayUserDetails);
    } else {
      alert('Failed to update payment status.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while updating payment status.');
  }
});

document.getElementById('deleteExpenseButton').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete this group?')) return;

  try {
    const response = await fetch(`/groups/${groupId}`, { method: 'DELETE' });

    if (response.ok) {
      alert('Group deleted successfully!');
      window.location.href = 'home.html';
    } else {
      const error = await response.json();
      alert(`Failed to delete group: ${error.message}`);
    }
  } catch (err) {
    console.error('Error deleting group:', err);
    alert('An error occurred while deleting the group.');
  }
});

document.getElementById('edit-btn').addEventListener('click', function () {
  const groupNameElement = document.getElementById('gname');
  const currentName = groupNameElement.textContent;

  groupNameElement.innerHTML = `
    <input type="text" id="edit-input" value="${currentName}" class="form-group" style="display:inline-block;width:auto;margin:0;" />
    <button id="save-btn" class="btn">Save</button>
  `;

  document.getElementById('save-btn').addEventListener('click', async function () {
    const newName = document.getElementById('edit-input').value.trim();
    if (!newName) {
      alert('Please enter a name');
      return;
    }

    try {
      const response = await fetch(`/groups/${groupId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });

      if (response.ok) {
        groupNameElement.textContent = newName;
        const url = new URL(window.location);
        url.searchParams.set('groupName', newName);
        window.history.replaceState({}, '', url);
      } else {
        const error = await response.json();
        alert('Error: ' + error.message);
      }
    } catch (error) {
      console.error(error);
      alert('Error updating group name');
    }
  });
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
  listExpenses();
  fetchUserDetails().then(displayUserDetails);
});
