// Check authentication
fetch('/api/session')
    .then(res => res.json())
    .then(data => {
        if (!data.authenticated) {
            window.location.href = 'login.html';
        } else if (data.username !== 'ranjan') {
            alert('Access Denied: Admin only');
            window.location.href = 'index.html';
        }
    })
    .catch(err => {
        console.error('Session check failed:', err);
        window.location.href = 'login.html';
    });

const logsTableBody = document.getElementById('logsTableBody');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchLogs');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let allLogs = []; // Store logs for client-side filtering

async function loadLogs() {
    try {
        logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading logs...</td></tr>';

        const response = await fetch('/api/admin/logs');
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }

        allLogs = await response.json();
        renderLogs(allLogs);
    } catch (error) {
        console.error('Error loading logs:', error);
        logsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error loading logs: ${error.message}</td></tr>`;
    }
}

function renderLogs(logs) {
    if (logs.length === 0) {
        logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No logs found</td></tr>';
        return;
    }

    logsTableBody.innerHTML = logs.map(log => {
        // Format date and time in 12-hour format
        const dateObj = new Date(log.timestamp);
        const date = dateObj.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
        const time = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        const dateTime = `${date}, ${time}`;

        let badgeClass = 'badge';
        let badgeStyle = '';

        // Match styles from style.css logic or use specific colors
        const actionType = log.actiontype || log.actionType || 'UNKNOWN';

        if (actionType.includes('ADD')) badgeStyle = 'background-color: #2f855a; color: white; border-color: #2f855a;';
        else if (actionType === 'UPDATE') badgeStyle = 'background-color: #b8860b; color: white; border-color: #b8860b;';
        else if (actionType.includes('DELETE')) badgeStyle = 'background-color: #c53030; color: white; border-color: #c53030;';
        else if (actionType === 'DEDUCT') badgeStyle = 'background-color: #dd6b20; color: white; border-color: #dd6b20;';

        return `
      <tr>
        <td>${dateTime}</td>
        <td><strong>${log.username || 'Unknown'}</strong></td>
        <td><span class="badge" style="${badgeStyle}">${actionType}</span></td>
        <td>${log.details || ''}</td>
        <td>
            <button class="action-btn delete-btn" onclick="deleteLog(${log.id})">Delete</button>
        </td>
      </tr>
    `;
    }).join('');
}

// Global delete function
window.deleteLog = async function (id) {
    if (!confirm("Are you sure you want to delete this specific log entry?")) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/logs/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            // Remove row locally or reload
            // Optimistic update could be done here, but reload is safer
            loadLogs();
        } else {
            alert('Failed to delete log: ' + data.error);
        }
    } catch (err) {
        console.error('Delete log error:', err);
        alert('Network error while deleting log');
    }
};

// Filter logs based on search input
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();

    if (!term) {
        renderLogs(allLogs);
        return;
    }

    const filtered = allLogs.filter(log => {
        // Prepare searchable strings
        const dateObj = new Date(log.timestamp);
        const dateStr = dateObj.toLocaleDateString(); // e.g., 12/10/2025
        const user = (log.username || '').toLowerCase();
        const action = (log.actiontype || log.actionType || '').toLowerCase();
        const details = (log.details || '').toLowerCase();

        return user.includes(term) ||
            action.includes(term) ||
            details.includes(term) ||
            dateStr.includes(term);
    });

    renderLogs(filtered);
});

// Clear History
clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm("Are you sure you want to clear the ENTIRE audit history? This cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch('/api/admin/logs', {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            loadLogs(); // Reload (should be empty)
        } else {
            alert('Failed to clear history: ' + data.error);
        }
    } catch (err) {
        console.error('Clear history error:', err);
        alert('Network error while clearing history');
    }
});

refreshBtn.addEventListener('click', loadLogs);

// Initial load
document.addEventListener('DOMContentLoaded', loadLogs);
