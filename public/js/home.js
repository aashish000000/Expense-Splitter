Auth.requireAuth();

const loggedInUser = Auth.getUser();

document.getElementById('logout').addEventListener('click', () => Auth.logout());

async function loadGroups() {
  try {
    const userId = loggedInUser?.id;
    if (!userId) {
      console.error('User ID not found');
      return;
    }

    const response = await fetch(`/api/loadmygroup?id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch groups');

    const groups = await response.json();
    const groupListContainer = document.querySelector('.group-list');

    groupListContainer.innerHTML = '<h3>Your Groups</h3>';

    if (groups.length === 0) {
      groupListContainer.innerHTML += '<p class="text-center">No groups yet. Create or join one!</p>';
      return;
    }

    groups.forEach((group) => {
      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';
      groupItem.textContent = group.name;
      groupItem.dataset.groupId = group.id;
      groupItem.addEventListener('click', () => {
        window.location.href = `group-details.html?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`;
      });
      groupListContainer.appendChild(groupItem);
    });
  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

document.getElementById('create-group-btn').addEventListener('click', async () => {
  const groupName = prompt('Enter the name of the group:');
  if (!groupName) return;

  try {
    const response = await fetch('/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName, userId: loggedInUser?.id }),
    });

    if (response.ok) {
      const data = await response.json();
      alert(`Group "${data.group.name}" created successfully!`);
      loadGroups();
    } else {
      const error = await response.json();
      alert(`Error: ${error.message}`);
    }
  } catch (err) {
    console.error('Error creating group:', err);
    alert('Failed to create group. Please try again.');
  }
});

document.getElementById('join-group-btn').addEventListener('click', async () => {
  const groupCode = prompt('Enter the group code to join:');
  if (!groupCode) return;

  try {
    const response = await fetch('/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: groupCode, userId: loggedInUser?.id }),
    });

    if (response.ok) {
      const data = await response.json();
      alert(`Successfully joined group "${data.group.name}"!`);
      loadGroups();
    } else {
      const error = await response.json();
      alert(`Error: ${error.message}`);
    }
  } catch (err) {
    console.error('Error joining group:', err);
    alert('Failed to join group. Please try again.');
  }
});

window.addEventListener('DOMContentLoaded', loadGroups);
