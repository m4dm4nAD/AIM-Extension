// Get current tab information
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Update the popup with current status
async function updateStatus() {
  const tab = await getCurrentTab();
  const statusDiv = document.getElementById('currentStatus');
  const statusMessage = document.getElementById('statusMessage');

  // Get stored data for this domain
  chrome.storage.local.get(['authAttempts', 'alerts'], function(data) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const authAttempt = data.authAttempts?.[domain];

    if (authAttempt?.suspicious) {
      statusDiv.className = 'status danger';
      statusMessage.textContent = `⚠️ Warning: Suspicious activity detected on ${domain}`;
    } else if (tab.url.startsWith('https://')) {
      statusDiv.className = 'status safe';
      statusMessage.textContent = `✅ No suspicious activity detected on ${domain}`;
    } else {
      statusDiv.className = 'status warning';
      statusMessage.textContent = `⚠️ This site is not using HTTPS`;
    }

    // Update alert history
    updateAlertHistory(data.alerts || []);
  });
}

// Update the alert history section
function updateAlertHistory(alerts) {
  const historyDiv = document.getElementById('alertHistory');
  historyDiv.innerHTML = '';

  if (alerts.length === 0) {
    historyDiv.innerHTML = '<p>No recent alerts</p>';
    return;
  }

  alerts.slice(-5).reverse().forEach(alert => {
    const alertElement = document.createElement('div');
    alertElement.className = 'history-item';
    alertElement.innerHTML = `
      <strong>${alert.domain}</strong><br>
      ${alert.message}<br>
      <small>${new Date(alert.timestamp).toLocaleString()}</small>
    `;
    historyDiv.appendChild(alertElement);
  });
}

// Clear history button handler
document.getElementById('clearHistory').addEventListener('click', () => {
  chrome.storage.local.set({ alerts: [] }, () => {
    updateAlertHistory([]);
  });
});

// Initialize popup
document.addEventListener('DOMContentLoaded', updateStatus);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'status_update') {
    updateStatus();
  }
}); 