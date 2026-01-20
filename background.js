// Keep track of authentication attempts in memory
let authAttempts = new Map();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'login_attempt') {
      handleLoginAttempt(message, sender);
    } else if (message.type === '2fa_field_detected') {
      handle2FAField(message, sender);
    } else if (message.type === 'suspicious_domain') {
      handleSuspiciousDomain(message, sender);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Handle login attempts
function handleLoginAttempt(message, sender) {
  try {
    const url = new URL(sender.url);
    const domain = url.hostname;
    const timestamp = Date.now();

    if (!authAttempts.has(domain)) {
      authAttempts.set(domain, {
        initialRequest: timestamp,
        connections: [sender.url],
        suspicious: false
      });
    } else {
      const attempt = authAttempts.get(domain);
      if (!attempt.connections.includes(sender.url)) {
        attempt.connections.push(sender.url);
      }
    }

    // Store to persistent storage
    chrome.storage.local.get(['authAttempts'], function(data) {
      const attempts = data.authAttempts || {};
      attempts[domain] = authAttempts.get(domain);
      chrome.storage.local.set({ authAttempts: attempts });
    });
  } catch (error) {
    console.error('Error handling login attempt:', error);
  }
}

// Handle 2FA field detection
function handle2FAField(message, sender) {
  try {
    const url = new URL(sender.url);
    const domain = url.hostname;
    chrome.storage.local.get(['alerts'], function(data) {
      const alerts = data.alerts || [];
      alerts.push({
        domain: domain,
        message: '2FA field detected - monitor for suspicious activity',
        timestamp: Date.now(),
        type: '2fa_detection'
      });
      chrome.storage.local.set({ alerts });
    });
  } catch (error) {
    console.error('Error handling 2FA field:', error);
  }
}

// Handle suspicious domain detection
function handleSuspiciousDomain(message, sender) {
  try {
    notifyUser(message.domain, `This domain is similar to ${message.similarTo}`);
  } catch (error) {
    console.error('Error handling suspicious domain:', error);
  }
}


// Helper function to identify login requests
function isLoginRequest(details) {
  // Add patterns for common login endpoints
  const loginPatterns = [
    /\/login/i,
    /\/signin/i,
    /\/oauth/i,
    /\/auth/i,
  ];

  // Check if the URL matches any login patterns
  return loginPatterns.some(pattern => 
    pattern.test(details.url) && details.method === 'POST'
  );
}

// Function to notify user of suspicious activity
function notifyUser(domain, customMessage = null) {
  try {
    const message = customMessage || `Suspicious authentication pattern detected for ${domain}. Multiple connection attempts detected during login flow. This might be an attempt to intercept your 2FA code.`;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Potential MITM Attack Detected!',
      message: message
    });

    chrome.storage.local.get(['alerts'], function(data) {
      const alerts = data.alerts || [];
      alerts.push({
        domain: domain,
        message: customMessage || 'Suspicious authentication pattern detected',
        timestamp: Date.now()
      });
      chrome.storage.local.set({ alerts });
    });
  } catch (error) {
    console.error('Error notifying user:', error);
  }
}

// Cleanup old entries periodically
setInterval(() => {
  try {
    const now = Date.now();
    for (const [domain, attempt] of authAttempts) {
      if (now - attempt.initialRequest > 300000) { // 5 minutes
        authAttempts.delete(domain);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, 60000); // Clean up every minute

// Additional detection for 2FA specific endpoints
function is2FARequest(details) {
  const twoFactorPatterns = [
    /\/2fa/i,
    /\/mfa/i,
    /\/verify/i,
    /\/authenticate/i,
    /\/totp/i
  ];

  return twoFactorPatterns.some(pattern => pattern.test(details.url));
}
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    const url = new URL(details.url);
    const domain = url.hostname;

    if (is2FARequest(details)) {
      const attempt = authAttempts.get(domain);
      if (attempt && attempt.suspicious) {
        // Block the request or warn user
        return {cancel: true};
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);