function checkDomainSimilarity() {
    const currentDomain = window.location.hostname;
    const knownDomains = ['google.com', 'facebook.com', 'amazon.com']; // Add more
    
    for (const domain of knownDomains) {
      const similarity = calculateLevenshteinDistance(currentDomain, domain);
      if (similarity > 0.8 && currentDomain !== domain) {
        chrome.runtime.sendMessage({
          type: 'suspicious_domain',
          domain: currentDomain,
          similarTo: domain
        });
      }
    }
  }

// Listen for form submissions
document.addEventListener('submit', function(event) {
  if (event.target.tagName === 'FORM') {
    const formData = new FormData(event.target);
    const hasPasswordField = Array.from(formData.entries()).some(([key, value]) => {
      const input = event.target.querySelector(`[name="${key}"]`);
      return input && input.type === 'password';
    });

    if (hasPasswordField) {
      chrome.runtime.sendMessage({
        type: 'login_attempt',
        url: window.location.href,
        timestamp: Date.now()
      });
    }
  }
});

// Monitor for 2FA input fields
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    mutation.addedNodes.forEach(function(node) {
      if (node.nodeType === 1) { // Element node
        const twoFactorInputs = node.querySelectorAll('input[type="text"], input[type="number"]');
        twoFactorInputs.forEach(input => {
          if (is2FAInput(input)) {
            chrome.runtime.sendMessage({
              type: '2fa_field_detected',
              url: window.location.href,
              timestamp: Date.now()
            });
          }
        });
      }
    });
  });
});

// Helper function to identify potential 2FA inputs
function is2FAInput(input) {
  const patterns = [
    /2fa/i,
    /mfa/i,
    /verify/i,
    /code/i,
    /totp/i,
    /authenticator/i
  ];
  
  // Check input attributes
  const attributes = [
    input.id,
    input.name,
    input.className,
    input.placeholder
  ];

  return patterns.some(pattern => 
    attributes.some(attr => attr && pattern.test(attr))
  );
}

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true
});