// Get current tab information
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.error('Error getting current tab:', error);
    return null;
  }
}

// Update the popup with current status
async function updateStatus() {
  try {
    const tab = await getCurrentTab();
    if (!tab) return;

    const statusDiv = document.getElementById('currentStatus');
    const statusMessage = document.getElementById('statusMessage');

    // Get stored data for this domain
    chrome.storage.local.get(['authAttempts', 'alerts'], function(data) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const authAttempts = data.authAttempts || {};
        const authAttempt = authAttempts[domain];

        if (authAttempt?.suspicious) {
          statusDiv.className = 'status danger';
          statusMessage.textContent = `Warning: Suspicious activity detected on ${domain}`;
        } else if (tab.url.startsWith('https://')) {
          statusDiv.className = 'status safe';
          statusMessage.textContent = `No suspicious activity detected on ${domain}`;
        } else {
          statusDiv.className = 'status warning';
          statusMessage.textContent = `This site is not using HTTPS`;
        }

        // Update alert history
        updateAlertHistory(data.alerts || []);
      } catch (error) {
        console.error('Error updating status:', error);
      }
    });
  } catch (error) {
    console.error('Error in updateStatus:', error);
  }
}

// Update the alert history section
function updateAlertHistory(alerts) {
  try {
    const historyDiv = document.getElementById('alertHistory');
    if (!historyDiv) return;

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
  } catch (error) {
    console.error('Error updating alert history:', error);
  }
}

// Clear history button handler
document.addEventListener('DOMContentLoaded', function() {
  try {
    const clearButton = document.getElementById('clearHistory');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        try {
          chrome.storage.local.set({ alerts: [] }, () => {
            updateAlertHistory([]);
          });
        } catch (error) {
          console.error('Error clearing history:', error);
        }
      });
    }
    updateStatus();
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'status_update') {
      updateStatus();
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}); 