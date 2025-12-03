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

async function loadLogs() {
    try {
        logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading logs...</td></tr>';

        const response = await fetch('/api/admin/logs');
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }

        const logs = await response.json();
        renderLogs(logs);
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
        const date = new Date(log.timestamp).toLocaleString();
        let badgeClass = 'bg-secondary';

        if (log.actionType.includes('ADD')) badgeClass = 'bg-add';
        else if (log.actionType === 'UPDATE') badgeClass = 'bg-update';
        else if (log.actionType === 'DELETE') badgeClass = 'bg-delete';
        else if (log.actionType === 'DEDUCT') badgeClass = 'bg-deduct';

        return `
      <tr>
        <td>${date}</td>
        <td><strong>${log.username}</strong></td>
        <td><span class="badge-action ${badgeClass}">${log.actionType}</span></td>
        <td>${log.details}</td>
      </tr>
    `;
    }).join('');
}

refreshBtn.addEventListener('click', loadLogs);

// Initial load
document.addEventListener('DOMContentLoaded', loadLogs);
