document.addEventListener('DOMContentLoaded', () => {
  const organizeBtn = document.getElementById('organizeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const statusMsg = document.getElementById('status');

  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (!result.geminiApiKey) {
      showStatus('Please configure API key first in Settings.', 'error');
      organizeBtn.disabled = true;
    }
  });

  organizeBtn.addEventListener('click', () => {
    const originalText = organizeBtn.innerHTML;
    organizeBtn.innerHTML = '<span>Organizing...</span>';
    organizeBtn.disabled = true;
    showStatus('Processing tabs (might take a few seconds)...', 'info');
    
    chrome.runtime.sendMessage({ action: 'organizeAll' }, (response) => {
      organizeBtn.innerHTML = originalText;
      organizeBtn.disabled = false;
      
      if (!response) {
        showStatus('Error: No response from background.', 'error');
        return;
      }

      if (response.status === 'success') {
        showStatus(`Done! Processed ${response.processed} tabs.`, 'success');
      } else if (response.status === 'error') {
        showStatus(`Error: ${response.message}`, 'error');
      }
    });
  });

  settingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = `status-message ${type} show`;
    statusMsg.style.color = type === 'error' ? '#ef4444' : type === 'info' ? '#a5b4fc' : '#10b981';
    
    if (type !== 'info') {
      setTimeout(() => {
        statusMsg.className = 'status-message';
      }, 5000);
    }
  }
});
