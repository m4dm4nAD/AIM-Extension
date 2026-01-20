// Calculate Levenshtein distance to detect similar domains
function calculateLevenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

// Check for domain similarity
function checkDomainSimilarity() {
  try {
    const currentDomain = window.location.hostname;
    const knownDomains = ['google.com', 'facebook.com', 'amazon.com', 'microsoft.com', 'apple.com'];
    
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
  } catch (error) {
    console.error('Error checking domain similarity:', error);
  }
}

// Listen for form submissions
document.addEventListener('submit', function(event) {
  try {
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
  } catch (error) {
    console.error('Error handling form submission:', error);
  }
});

// Monitor for 2FA input fields
const observer = new MutationObserver(function(mutations) {
  try {
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
  } catch (error) {
    console.error('Error in mutation observer:', error);
  }
});

// Helper function to identify potential 2FA inputs
function is2FAInput(input) {
  try {
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
  } catch (error) {
    console.error('Error checking 2FA input:', error);
    return false;
  }
}

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run domain similarity check on page load
document.addEventListener('DOMContentLoaded', checkDomainSimilarity);
checkDomainSimilarity();