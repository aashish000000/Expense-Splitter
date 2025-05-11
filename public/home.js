// Retrieve loggedInUser from localStorage
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

///logout button ko function ho

document.getElementById('logout').addEventListener('click', function() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
});

// Select buttons
const createGroupBtn = document.getElementById('create-group-btn');
const joinGroupBtn = document.getElementById('join-group-btn');

// API Base URL
const API_BASE_URL = 'http://localhost:3000';

//yo function le group haru ko list load garxa ani group haru ko name dekhaunxa
async function loadGroups() {
    try {
        // Retrieve user ID from localStorage
        const userId = loggedInUser?.id;
        if (!userId) {
            console.error('User ID not found in localStorage');
            return;
        }

        // Call the API to load groups
        const response = await fetch(`${API_BASE_URL}/api/loadmygroup?id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch groups');
        }

        const groups = await response.json();

        // Get the group list container
        const groupListContainer = document.querySelector('.group-list');

        // Clear any existing group items
        groupListContainer.innerHTML = `
            <h3>Your Groups</h3>
        `;

        // Map through the groups and create clickable group items
        groups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.textContent = group.name;
            groupItem.dataset.groupId = group.id; // Store group ID as a data attribute

            // Add a click event listener to handle group clicks
            groupItem.addEventListener('click', () => {
                handleGroupClick(group.id, group.name);
            });

            groupListContainer.appendChild(groupItem);
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}



// ya click garesi group ko details ma janxa according to kun group ma click gareko xa
function handleGroupClick(groupId, groupName) {
    console.log(`Group clicked: ID=${groupId}, Name=${groupName}`);
    // Perform an action, e.g., navigate to a group-specific page
    // Example: Redirect to a group details page
    window.location.href = `group-details.html?groupId=${groupId}&groupName=${encodeURIComponent(groupName)}`;
}

// Call loadGroups when the page loads
window.addEventListener('DOMContentLoaded', loadGroups);

/// group create garne function ho jasle backend ma gayera group create garxa
createGroupBtn.addEventListener('click', async () => {
    const groupName = prompt('Enter the name of the group:');
    if (!groupName) return;

    try {
        const response = await fetch(`${API_BASE_URL}/groups/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name: groupName,
                userId: loggedInUser?.id // Include the user ID
            }),
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Group "${data.group.name}" created successfully!`);
            // reload the page
            window.location.reload();
            // Optionally, update the UI
        } else {
            const error = await response.json();
            alert(`Error: ${error.message}`);
        }
    } catch (err) {
        console.error('Error creating group:', err);
        alert('Failed to create group. Please try again later.');
    }
});

// Event listener for "Join a Group"
joinGroupBtn.addEventListener('click', async () => {
    const groupCode = prompt('Enter the group code to join:');
    if (!groupCode) return;

    try {
        const response = await fetch(`${API_BASE_URL}/groups/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                code: groupCode,
                userId: loggedInUser?.id // Include the user ID
            }),
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Successfully joined group "${data.group.name}"!`);
            window.location.reload();
            // Optionally, update the UI
        } else {
            const error = await response.json();
            alert(`Error: ${error.message}`);
        }
    } catch (err) {
        console.error('Error joining group:', err);
        alert('Failed to join group. Please try again later.');
    }
});

window.addEventListener('DOMContentLoaded', loadGroups);