# AIM Detection Extension

A Chrome/Edge browser extension that detects potential Man-in-the-Middle (MITM) attacks during the authentication process, with special focus on protecting 2FA (Two-Factor Authentication) flows.

## Features

- **Login Attempt Monitoring**: Tracks authentication requests to identify suspicious patterns
- **Domain Similarity Detection**: Uses Levenshtein distance algorithm to detect domains similar to known sites (phishing prevention)
- **2FA Field Detection**: Monitors for Two-Factor Authentication input fields and alerts users
- **HTTPS Verification**: Checks if the current site uses HTTPS
- **Alert History**: Maintains a history of detected suspicious activities
- **Real-time Notifications**: Sends desktop notifications when suspicious activity is detected

## How It Works

### Content Script (content.js)
- Monitors form submissions for password fields
- Detects 2FA input fields through mutation observers
- Checks domain similarity against known legitimate domains
- Sends detected events to the background script

### Background Script (background.js)
- Receives and processes messages from content scripts
- Maintains authentication attempt records
- Stores alerts in chrome.storage for persistent access
- Creates notifications for suspicious activities
- Periodically cleans up old records

### Popup (popup.html & popup.js)
- Displays current site security status
- Shows recent alert history
- Allows users to clear alert records
- Updates in real-time based on background script messages

## Installation

1. Clone or download this repository
2. Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the `AIM-Extension` folder
5. The extension icon will appear in your toolbar

## Usage

- The extension runs automatically in the background
- A popup displays when you click the extension icon
- Green status indicates no suspicious activity
- Yellow status indicates HTTPS is not in use
- Red status indicates suspicious activity detected
- Check "Recent Alerts" section for history of detections

## File Structure

```
AIM-Extension/
├── manifest.json           # Extension configuration
├── background.js           # Background service worker
├── content.js             # Content script for pages
├── popup/
│   ├── popup.html         # Popup UI
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Technical Details

### Levenshtein Distance
The extension uses the Levenshtein distance algorithm to calculate string similarity between the current domain and known legitimate domains. A similarity threshold of 0.8 (80%) is used to flag suspicious domains.

### Known Domains Monitored
- google.com
- facebook.com
- amazon.com
- microsoft.com
- apple.com

You can expand this list in `content.js` by modifying the `knownDomains` array.

## Permissions Used

- `tabs`: To read current active tab information
- `storage`: To store alerts and authentication attempts
- `notifications`: To display alerts to the user
- `webNavigation`: To track navigation events
- `<all_urls>`: To monitor all websites

## Error Handling

All functions include try-catch blocks to ensure graceful error handling and prevent extension crashes.

## Future Improvements

- Machine learning-based phishing detection
- Integration with known phishing databases
- Custom domain whitelist/blacklist
- Enhanced 2FA detection for specific services
- Export alerts to CSV/JSON
- Settings page for customization

## License

This extension is provided as-is for educational and security purposes.

## Support

For issues or feature requests, please review the code and error logs in the browser's extension management page.