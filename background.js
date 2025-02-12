// Keep track of authentication attempts
let authAttempts = new Map();

// Listen for outgoing requests
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const url = new URL(details.url);
    const domain = url.hostname;
    const timestamp = Date.now();

    // Check if this is a login request (you'll need to adjust these patterns for specific services)
    if (isLoginRequest(details)) {
      if (!authAttempts.has(domain)) {
        authAttempts.set(domain, {
          initialRequest: timestamp,
          connections: [details.ip || url.origin],
          suspicious: false
        });
      } else {
        const attempt = authAttempts.get(domain);
        
        // If we see a new connection for the same domain within a short timeframe
        if (!attempt.connections.includes(details.ip || url.origin)) {
          attempt.connections.push(details.ip || url.origin);
          
          // If we see multiple different connections for the same auth flow
          if (attempt.connections.length > 1 && 
              timestamp - attempt.initialRequest < 30000) { // 30 seconds threshold
            attempt.suspicious = true;
            notifyUser(domain);
          }
        }
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]
);

// Helper function to identify login requests
function isLoginRequest(details) {
  // Add patterns for common login endpoints
  const loginPatterns = [
    /\/login/i,
    /\/signin/i,
    /\/oauth/i,
    /\/auth/i,
    // Add more patterns as needed
  ];

  // Check if the URL matches any login patterns
  return loginPatterns.some(pattern => 
    pattern.test(details.url) && details.method === 'POST'
  );
}

// Function to notify user of suspicious activity
function notifyUser(domain) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Potential MITM Attack Detected!',
    message: `Suspicious authentication pattern detected for ${domain}. Multiple connection attempts detected during login flow. This might be an attempt to intercept your 2FA code.`
  });

  chrome.storage.local.get(['alerts'], function(data) {
    const alerts = data.alerts || [];
    alerts.push({
      domain: domain,
      message: `Suspicious authentication pattern detected`,
      timestamp: Date.now()
    });
    chrome.storage.local.set({ alerts });
  });
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [domain, attempt] of authAttempts) {
    if (now - attempt.initialRequest > 300000) { // 5 minutes
      authAttempts.delete(domain);
    }
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

// Enhanced request monitoring
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