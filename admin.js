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

        let badgeClass = 'bg-secondary';

        // Safety check for actionType
        const actionType = log.actiontype || log.actionType || 'UNKNOWN';

        if (actionType.includes('ADD')) badgeClass = 'bg-add';
        else if (actionType === 'UPDATE') badgeClass = 'bg-update';
        else if (actionType === 'DELETE') badgeClass = 'bg-delete';
        else if (actionType === 'DEDUCT') badgeClass = 'bg-deduct';

        return `
      <tr>
        <td>${dateTime}</td>
        <td><strong>${log.username || 'Unknown'}</strong></td>
        <td><span class="badge-action ${badgeClass}">${actionType}</span></td>
        <td>${log.details || ''}</td>
      </tr>
    `;
    }).join('');
}

refreshBtn.addEventListener('click', loadLogs);

// Initial load
document.addEventListener('DOMContentLoaded', loadLogs);
