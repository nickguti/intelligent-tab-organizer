document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleBtn = document.getElementById('toggleVisibility');
  const eyeIcon = document.getElementById('eye-icon');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('status');

  // Load existing API key if present
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    
    if (isPassword) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });

  // Save API key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
      showStatus('Please enter a valid API key.', 'error');
      return;
    }

    // Save to chrome storage
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      showStatus('Configuration saved successfully!', 'success');
      
      // Change button state temporarily
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = `
        <span>Saved!</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
      }, 2000);
    });
  });

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = `status-message ${type} show`;
    
    setTimeout(() => {
      statusMsg.className = 'status-message';
    }, 3000);
  }
});
