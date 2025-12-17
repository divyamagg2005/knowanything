/**
 * Chat Window Script - Manual Context Chat
 */

let selectedContext = null;
let conversationHistory = [];
let uploadedImages = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadManualContext();
  setupEventListeners();
  
  const input = document.getElementById('chat-input');
  input.focus();
});

async function loadManualContext() {
  try {
    const result = await chrome.storage.local.get(['manualContext']);
    if (result.manualContext) {
      selectedContext = result.manualContext;
      document.getElementById('contextDisplay').textContent = selectedContext.selectedText;
    } else {
      document.getElementById('contextDisplay').textContent = 'No context loaded';
    }
  } catch (error) {
    console.error('Error loading manual context:', error);
    document.getElementById('contextDisplay').textContent = 'Error loading context';
  }
}

function setupEventListeners() {
  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('chat-input');
  const imageUploadBtn = document.getElementById('image-upload-btn');
  const imageFileInput = document.getElementById('image-file-input');

  sendBtn.addEventListener('click', sendMessage);

  imageUploadBtn.addEventListener('click', () => {
    imageFileInput.click();
  });

  imageFileInput.addEventListener('change', handleImageUpload);

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('paste', handlePaste);
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message && uploadedImages.length === 0) return;

  input.value = '';

  addMessageToUI('user', message, uploadedImages.length > 0 ? [...uploadedImages] : null);

  const images = [...uploadedImages];
  uploadedImages = [];
  updateImagePreview();

  const loadingId = addMessageToUI('assistant', '');
  showLoadingIndicator(loadingId);

  input.disabled = true;
  document.getElementById('send-btn').disabled = true;
  document.getElementById('image-upload-btn').disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHAT_MESSAGE',
      payload: {
        message,
        context: selectedContext,
        conversationHistory,
        images: images.length > 0 ? images : null
      }
    });

    if (response.success) {
      conversationHistory.push({
        role: 'user',
        content: message,
        images: images.length > 0 ? images : null
      });
      conversationHistory.push({
        role: 'assistant',
        content: response.data.response
      });

      updateMessageInUI(loadingId, response.data.response);
    } else {
      updateMessageInUI(loadingId, `Error: ${response.error}`);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    updateMessageInUI(loadingId, 'Sorry, there was an error processing your request.');
  } finally {
    input.disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('image-upload-btn').disabled = false;
    input.focus();
  }
}

function addMessageToUI(role, content, images = null) {
  const messagesContainer = document.getElementById('chat-messages');
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}-message`;
  messageDiv.id = messageId;

  let imagesHtml = '';
  if (images && images.length > 0) {
    imagesHtml = images.map(img => `<img src="${img}" class="message-image" />`).join('');
  }

  messageDiv.innerHTML = `
    <div class="message-content">${escapeHtml(content)}${imagesHtml}</div>
  `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageId;
}

function showLoadingIndicator(messageId) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    messageDiv.classList.add('loading');
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = '<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>';
  }
}

function updateMessageInUI(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.textContent = content;
    messageDiv.classList.remove('loading');
  }
}

function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImages.push(e.target.result);
        updateImagePreview();
      };
      reader.readAsDataURL(file);
    }
  });

  event.target.value = '';
}

function handlePaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      event.preventDefault();
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImages.push(e.target.result);
        updateImagePreview();
      };
      reader.readAsDataURL(blob);
    }
  }
}

function updateImagePreview() {
  const container = document.getElementById('image-preview-container');
  if (!container) return;

  if (uploadedImages.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = uploadedImages.map((img, index) => `
    <div class="image-preview">
      <img src="${img}" />
      <div class="image-preview-remove" data-index="${index}">×</div>
    </div>
  `).join('');

  container.querySelectorAll('.image-preview-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      uploadedImages.splice(index, 1);
      updateImagePreview();
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
