Auth.requireAuth();

const loggedInUser = Auth.getUser();

document.getElementById('logout').addEventListener('click', () => Auth.logout());

async function loadGroups() {
  const groupListContainer = document.querySelector('.group-list');
  
  groupListContainer.innerHTML = `
    <h3>Your Groups</h3>
    <div class="skeleton" style="height: 60px; margin-bottom: 10px;"></div>
    <div class="skeleton" style="height: 60px; margin-bottom: 10px;"></div>
  `;

  try {
    const userId = loggedInUser?.id;
    if (!userId) {
      console.error('User ID not found');
      return;
    }

    const response = await fetch(`/api/loadmygroup?id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch groups');

    const groups = await response.json();
    
    groupListContainer.innerHTML = '<h3>Your Groups</h3>';

    if (groups.length === 0) {
      groupListContainer.innerHTML += `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No groups yet.<br>Create or join one to get started!</p>
        </div>
      `;
      return;
    }

    groups.forEach((group) => {
      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';
      groupItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>${group.name}</strong>
          <span style="color: var(--text-light); font-size: 0.85rem;">
            ${group.memberCount || 0} members · ${group.expenseCount || 0} expenses
          </span>
        </div>
      `;
      groupItem.dataset.groupId = group.id;
      groupItem.addEventListener('click', () => {
        window.location.href = `group-details.html?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`;
      });
      groupListContainer.appendChild(groupItem);
    });
  } catch (error) {
    console.error('Error loading groups:', error);
    groupListContainer.innerHTML = `
      <h3>Your Groups</h3>
      <div class="empty-state">
        <p>Failed to load groups. <a href="#" onclick="loadGroups()">Try again</a></p>
      </div>
    `;
  }
}

document.getElementById('create-group-btn').addEventListener('click', async () => {
  const groupName = await Modal.prompt('Create a Group', 'Enter group name...');
  if (!groupName) return;

  const btn = document.getElementById('create-group-btn');
  btn.classList.add('btn-loading');
  btn.disabled = true;

  try {
    const response = await fetch('/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName, userId: loggedInUser?.id }),
    });

    const data = await response.json();

    if (response.ok) {
      Toast.success(`Group "${data.group.name}" created!`);
      loadGroups();
    } else {
      Toast.error(data.message || 'Failed to create group');
    }
  } catch (err) {
    console.error('Error creating group:', err);
    Toast.error('Failed to create group. Please try again.');
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
});

document.getElementById('join-group-btn').addEventListener('click', async () => {
  const groupCode = await Modal.prompt('Join a Group', 'Enter group name or code...');
  if (!groupCode) return;

  const btn = document.getElementById('join-group-btn');
  btn.classList.add('btn-loading');
  btn.disabled = true;

  try {
    const response = await fetch('/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: groupCode, userId: loggedInUser?.id }),
    });

    const data = await response.json();

    if (response.ok) {
      Toast.success(`Joined "${data.group.name}"!`);
      loadGroups();
    } else {
      Toast.error(data.message || 'Failed to join group');
    }
  } catch (err) {
    console.error('Error joining group:', err);
    Toast.error('Failed to join group. Please try again.');
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
});

window.addEventListener('DOMContentLoaded', loadGroups);
