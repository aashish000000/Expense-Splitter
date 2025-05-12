const API_BASE_URL = 'http://localhost:3000';

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function fetchUserDetails(groupId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/users`);
        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }
        const data = await response.json();
        return data.users; // Assuming the API returns an array of { username, balance }
    } catch (error) {
        console.error('Error fetching user details:', error);
        return [];
    }
}

function displayUserDetails(users) {
    const usersList = document.getElementById('users');
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.username} - Balance: $${user.balance.toFixed(2)}`;
        usersList.appendChild(li);
    });
}

async function addExpense(groupId, name, amount) {
    try {
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, amount }),
        });
        if (!response.ok) {
            throw new Error('Failed to add expense');
        }
        alert('Expense added successfully!');
        window.location.reload();
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense');
    }
}

document.getElementById('addExpenseButton').addEventListener('click', () => {
    const groupId = getQueryParam('groupId');
    const name = document.getElementById('expenseName').value;
    const amount = document.getElementById('expenseAmount').value;

    if (!name || !amount) {
        alert('Please fill in all fields');
        return;
    }

    addExpense(groupId, name, parseFloat(amount));
});

// Fetch and display user details on page load
const groupId = getQueryParam('groupId');
if (groupId) {
    fetchUserDetails(groupId).then(displayUserDetails);
}

async function listExpenses() {
    const groupName = getQueryParam('groupName');
    const gname = document.getElementById('gname');
    gname.textContent = groupName;
    try {
        const groupId = getQueryParam('groupId');
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/expenses`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch expenses');
        }

        const data = await response.json(); // Get the response object
        const expenses = data.expenses; // Access the expenses array
        const expensesList = document.getElementById('expensesList');
        expensesList.innerHTML = ''; // Clear existing list

        expenses.forEach(expense => {
            const listItem = document.createElement('li');
            listItem.textContent = `${expense.name}: $${expense.amount}`;
            expensesList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        alert('Failed to fetch expenses');
    }
}

document.addEventListener('DOMContentLoaded', listExpenses);
 
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

document.getElementById('iPaidButton').addEventListener('click', async () => {
    const groupId = getQueryParam('groupId');
    const userId = loggedInUser?.id;
    const url = `${API_BASE_URL}/groups/${groupId}/paid`;

    if (!groupId || !userId) {
        alert('Group ID or User ID is missing.');
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: userId, status: 'paid' }),
        });

        if (response.ok) {
            const result = await response.json();
            fetchUserDetails(groupId).then(displayUserDetails);
            alert('Payment status updated successfully!');
            console.log(result);
        } else {
            alert('Failed to update payment status.');
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating payment status.');
    }
});

document.getElementById('deleteExpenseButton').addEventListener('click', async () => {
    const groupId = getQueryParam('groupId'); // Updated variable name for clarity
    
    if (!groupId) {
        alert('Group ID is required!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, { // Updated endpoint to target groups
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Group deleted successfully!');
            window.location.href = 'home.html'; // Redirect to home page after successful deletion
        } else {
            const error = await response.json();
            alert(`Failed to delete group: ${error.message}`); // Updated error message
        }
    } catch (err) {
        console.error('Error deleting group:', err); // Updated error log
        alert('An error occurred while deleting the group.');
    }
});

document.getElementById('edit-btn').addEventListener('click', function () {
    const groupNameElement = document.getElementById('gname');
    const currentName = groupNameElement.textContent;
    const groupId = getQueryParam('groupId'); 

    // Replace group name with an input field and save button
    groupNameElement.innerHTML = `
        <input type="text" id="edit-input" value="${currentName}" />
        <button id="save-btn">Save</button>
    `;

    document.getElementById('save-btn').addEventListener('click', function () {
        const newName = document.getElementById('edit-input').value;

        // Send PATCH request to the backend
        fetch(`${API_BASE_URL}/groupdelete/${groupId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newName }), // Use "newName" to match the backend
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update group name');
                }
                return response.json();
            })
            .then(data => {
                // Update the UI with the new group name
                groupNameElement.textContent = newName;
            })
            .catch(error => {
                console.error(error);
                alert('Error updating group name');
            });
    });
});
/* ---------- 1.  Grab query-string params ---------- */
const params     = new URLSearchParams(window.location.search);
const groupName  = params.get('groupName');

/* Guard against missing groupId */
if (!groupId) {
  alert('Missing groupId in URL');
  throw new Error('groupId required');
}

/* ---------- 2.  Build the correct WebSocket URL ---------- */
const isSecure   = location.protocol === 'https:';
const wsScheme   = isSecure ? 'wss:' : 'ws:';

// If page is opened via file://, location.host === ''  ➜ default to localhost:3000
const backendHost = location.host || 'localhost:3000';

const socketUrl = `${wsScheme}//${backendHost}/ws/${groupId}`;
const socket    = new WebSocket(socketUrl);

/* ---------- 3.  DOM refs ---------- */
const chatButton     = document.getElementById('chatButton');
const chatModal      = document.getElementById('chatModal');
const closeChatModal = document.getElementById('closeChatModal');
const chatMessages   = document.getElementById('chatMessages');
const chatInput      = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');

/* ---------- 4.  Modal open/close ---------- */
chatButton.addEventListener('click', () => {
  chatModal.style.display = 'block';
  chatInput.focus();
});
closeChatModal.addEventListener('click', () => {
  chatModal.style.display = 'none';
});

/* ---------- 5.  Incoming messages ---------- */
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

/* ---------- 6.  Send message ---------- */
sendChatButton.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

function sendChat() {
  const text = chatInput.value.trim();
  var currentUsername = loggedInUser?.username;
  if (!text) return;
  socket.send(JSON.stringify({ user: currentUsername, text })); // set currentUsername earlier at login
  chatInput.value = '';
}

/* ---------- 7.  Cleanup ---------- */
window.addEventListener('beforeunload', () => socket.close());

