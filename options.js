const apiKeyInput = document.getElementById('apiKey');
const settingsForm = document.getElementById('settingsForm');
const statusDiv = document.getElementById('status');
const toggleVisibility = document.getElementById('toggleVisibility');
const testBtn = document.getElementById('testBtn');

function showStatus(message, isSuccess) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${isSuccess ? 'success' : 'error'} show`;
  
  setTimeout(() => {
    statusDiv.classList.remove('show');
  }, 5000);
}

toggleVisibility.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibility.textContent = '🙈 Hide key';
  } else {
    apiKeyInput.type = 'password';
    toggleVisibility.textContent = '👁️ Show key';
  }
});

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading saved settings', false);
  }
}

async function saveSettings(apiKey) {
  try {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    showStatus('✓ Settings saved successfully!', true);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('✗ Error saving settings: ' + error.message, false);
  }
}

async function testApiKey(apiKey) {
  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const testBody = {
    contents: [{
      role: 'user',
      parts: [{ text: 'Hello' }]
    }],
    generationConfig: {
      maxOutputTokens: 10
    }
  };

  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody)
    });

    if (response.ok) {
      showStatus('✓ API key is valid and working!', true);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API returned status ${response.status}`;
      showStatus(`✗ API key test failed: ${errorMessage}`, false);
      return false;
    }
  } catch (error) {
    showStatus('✗ Connection test failed: ' + error.message, false);
    return false;
  }
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('✗ Please enter an API key', false);
    return;
  }

  if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    showStatus('✗ Please enter a valid API key, not the placeholder', false);
    return;
  }

  await saveSettings(apiKey);
});

testBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('✗ Please enter an API key first', false);
    return;
  }

  if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    showStatus('✗ Please enter a valid API key, not the placeholder', false);
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = '🔄 Testing...';
  
  await testApiKey(apiKey);
  
  testBtn.disabled = false;
  testBtn.textContent = '🧪 Test Connection';
});

loadSettings();
