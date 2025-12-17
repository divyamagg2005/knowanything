/**
 * Popup Script - Context Chat Extension
 * Handles extension popup interactions and settings
 */

const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const testKeyBtn = document.getElementById('testKeyBtn');
const keyStatus = document.getElementById('keyStatus');
const statusText = document.getElementById('statusText');
const extensionStatus = document.getElementById('extensionStatus');
const manualContextInput = document.getElementById('manualContextInput');
const startChatBtn = document.getElementById('startChatBtn');

document.addEventListener('DOMContentLoaded', () => {
  loadAPIKey();
  checkAPIKeyStatus();
  setupEventListeners();
});

/**
 * Load saved API key
 */
async function loadAPIKey() {
  try {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

/**
 * Check if API key is configured
 */
async function checkAPIKeyStatus() {
  try {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (result.geminiApiKey && result.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      statusText.textContent = 'Extension active and ready';
      extensionStatus.style.background = '#e8f5e9';
      extensionStatus.style.borderColor = '#c8e6c9';
      extensionStatus.style.color = '#2e7d32';
    } else {
      statusText.textContent = 'API key not configured';
      extensionStatus.style.background = '#fff3e0';
      extensionStatus.style.borderColor = '#ffe0b2';
      extensionStatus.style.color = '#e65100';
    }
  } catch (error) {
    console.error('Error checking API key:', error);
  }
}

/**
 * Save API key
 */
async function saveAPIKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showKeyStatus('Please enter an API key', false);
    return;
  }

  if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    showKeyStatus('Please enter a valid API key', false);
    return;
  }

  try {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    showKeyStatus('✓ API key saved successfully!', true);
    checkAPIKeyStatus();
  } catch (error) {
    showKeyStatus('✗ Error saving API key', false);
  }
}

/**
 * Test API key
 */
async function testAPIKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showKeyStatus('Please enter an API key first', false);
    return;
  }

  testKeyBtn.disabled = true;
  testKeyBtn.textContent = '🔄 Testing...';
  
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
      showKeyStatus('✓ API key is valid and working!', true);
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API returned status ${response.status}`;
      showKeyStatus(`✗ Test failed: ${errorMessage}`, false);
    }
  } catch (error) {
    showKeyStatus('✗ Connection test failed', false);
  } finally {
    testKeyBtn.disabled = false;
    testKeyBtn.textContent = '🧪 Test';
  }
}

/**
 * Show status message
 */
function showKeyStatus(message, isSuccess) {
  keyStatus.textContent = message;
  keyStatus.style.color = isSuccess ? '#2e7d32' : '#c62828';
  keyStatus.style.fontWeight = '500';
}

/**
 * Start manual chat with custom context
 */
async function startManualChat() {
  const contextText = manualContextInput.value.trim();
  
  if (!contextText) {
    alert('Please paste some text to chat with');
    return;
  }
  
  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (!result.geminiApiKey || result.geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    alert('Please configure your Gemini API key first');
    return;
  }
  
  chrome.storage.local.set({ 
    manualContext: {
      selectedText: contextText,
      beforeContext: '',
      afterContext: '',
      pageTitle: 'Manual Context',
      pageUrl: 'manual://context',
      fullContext: contextText
    }
  });
  
  const chatWindowUrl = chrome.runtime.getURL('chat-window.html');
  chrome.windows.create({
    url: chatWindowUrl,
    type: 'popup',
    width: 450,
    height: 650,
    focused: true
  });
}

/**
 * Setup event listeners for popup interactions
 */
function setupEventListeners() {
  saveKeyBtn.addEventListener('click', saveAPIKey);
  testKeyBtn.addEventListener('click', testAPIKey);
  startChatBtn.addEventListener('click', startManualChat);
  
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveAPIKey();
    }
  });
}