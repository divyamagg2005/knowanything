/**
 * Content Script - KnowAnything Extension
 * Handles text selection, context extraction, and floating popup UI
 */

let chatPopup = null;
let selectedContext = null;
let conversationHistory = [];
let uploadedImages = [];
let isSidePanelMode = false;

// Constants
const MIN_SELECTION_LENGTH = 3;
const POPUP_OFFSET = 10;

/**
 * Initialize the extension on page load
 */
function init() {
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  
  // Close popup when clicking outside
  document.addEventListener('mousedown', handleOutsideClick);
}

/**
 * Handle showing popup from context menu
 */
function handleShowPopup() {
  console.log('[KnowAnything] handleShowPopup called');
  
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  console.log('[KnowAnything] Selected text:', selectedText);
  
  if (!selectedText || selectedText.length < MIN_SELECTION_LENGTH) {
    console.log('[KnowAnything] No valid selection found, selection length:', selectedText.length);
    return;
  }
  
  // Extract context
  selectedContext = extractContext(selection);
  
  if (selectedContext) {
    // Reset conversation for new selection
    conversationHistory = [];
    
    // Get selection position
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      console.log('[KnowAnything] Selection rect:', rect);
      
      // Show popup near selection center
      const x = rect.left + (rect.width / 2);
      const y = rect.bottom;
      
      console.log('[KnowAnything] Showing popup at:', x, y);
      showPopup(x, y);
    } catch (error) {
      console.error('[KnowAnything] Error getting selection rect:', error);
      // Fallback to center of screen
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      showPopup(x, y);
    }
  } else {
    console.log('[KnowAnything] Failed to extract context');
  }
}

/**
 * Extract selected text and surrounding context
 */
function extractContext(selection) {
  try {
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return null;
    
    // Get the range and container
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find the closest block-level element
    let contextElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container;
    
    while (contextElement && !isBlockElement(contextElement)) {
      contextElement = contextElement.parentElement;
    }
    
    if (!contextElement) {
      contextElement = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container;
    }
    
    // Get surrounding context
    const beforeText = getBeforeContext(contextElement);
    const afterText = getAfterContext(contextElement);
    
    return {
      selectedText,
      beforeContext: beforeText,
      afterContext: afterText,
      pageTitle: document.title,
      pageUrl: window.location.href,
      fullContext: contextElement.textContent.trim()
    };
  } catch (error) {
    console.error('Error extracting context:', error);
    return null;
  }
}

/**
 * Check if element is block-level
 */
function isBlockElement(element) {
  const blockElements = ['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE', 'MAIN', 'NAV', 'BLOCKQUOTE', 'PRE', 'LI', 'TD', 'TH'];
  return blockElements.includes(element.tagName);
}

/**
 * Get text from previous paragraph/block
 */
function getBeforeContext(element) {
  let prev = element.previousElementSibling;
  let attempts = 0;
  
  while (prev && attempts < 3) {
    if (isBlockElement(prev) && prev.textContent.trim()) {
      return prev.textContent.trim();
    }
    prev = prev.previousElementSibling;
    attempts++;
  }
  
  // Try parent's previous sibling
  if (element.parentElement) {
    const parentPrev = element.parentElement.previousElementSibling;
    if (parentPrev && isBlockElement(parentPrev)) {
      return parentPrev.textContent.trim();
    }
  }
  
  return '';
}

/**
 * Get text from next paragraph/block
 */
function getAfterContext(element) {
  let next = element.nextElementSibling;
  let attempts = 0;
  
  while (next && attempts < 3) {
    if (isBlockElement(next) && next.textContent.trim()) {
      return next.textContent.trim();
    }
    next = next.nextElementSibling;
    attempts++;
  }
  
  // Try parent's next sibling
  if (element.parentElement) {
    const parentNext = element.parentElement.nextElementSibling;
    if (parentNext && isBlockElement(parentNext)) {
      return parentNext.textContent.trim();
    }
  }
  
  return '';
}

/**
 * Create and show the floating popup
 */
function showPopup(x, y) {
  console.log('[KnowAnything] showPopup called with x:', x, 'y:', y);
  
  // Remove existing popup
  if (chatPopup) {
    chatPopup.remove();
  }
  
  // Create popup container
  chatPopup = document.createElement('div');
  chatPopup.id = 'context-chat-popup';
  console.log('[KnowAnything] Created popup element');
  chatPopup.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>KnowAnything</span>
      </div>
      <div class="chat-header-actions">
        <button class="maximize-btn" title="Toggle Side Panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
        <button class="close-btn" title="Close">×</button>
      </div>
    </div>
    
    <div class="selected-text-container">
      <div class="selected-text-label">Selected Text</div>
      <div class="selected-text">${escapeHtml(selectedContext.selectedText)}</div>
    </div>
    
    <div class="chat-messages" id="chat-messages"></div>
    
    <div class="chat-input-container">
      <div class="image-preview-container" id="image-preview-container"></div>
      <div class="chat-input-row">
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Ask a question or paste an image (Ctrl+V)..."
          autocomplete="off"
        />
        <div class="chat-input-buttons">
          <input type="file" id="image-file-input" accept="image/*" multiple style="display: none;" />
          <button class="image-upload-btn" id="image-upload-btn" title="Upload Image">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button id="send-btn" title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatPopup);
  console.log('[KnowAnything] Popup appended to body');
  
  // Position the popup
  positionPopup(x, y);
  console.log('[KnowAnything] Popup positioned');
  
  // Add event listeners
  setupPopupListeners();
  
  // Focus input
  const input = chatPopup.querySelector('#chat-input');
  setTimeout(() => input.focus(), 100);
}

/**
 * Position popup near cursor, keeping it on screen
 */
function positionPopup(x, y) {
  const popup = chatPopup;
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x + POPUP_OFFSET;
  let top = y + POPUP_OFFSET;
  
  // Keep popup on screen horizontally
  if (left + rect.width > viewportWidth) {
    left = x - rect.width - POPUP_OFFSET;
  }
  
  if (left < 0) {
    left = 10;
  }
  
  // Keep popup on screen vertically
  if (top + rect.height > viewportHeight) {
    top = y - rect.height - POPUP_OFFSET;
  }
  
  if (top < 0) {
    top = 10;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Setup event listeners for popup interactions
 */
function setupPopupListeners() {
  const closeBtn = chatPopup.querySelector('.close-btn');
  const maximizeBtn = chatPopup.querySelector('.maximize-btn');
  const sendBtn = chatPopup.querySelector('#send-btn');
  const input = chatPopup.querySelector('#chat-input');
  const imageUploadBtn = chatPopup.querySelector('#image-upload-btn');
  const imageFileInput = chatPopup.querySelector('#image-file-input');

  closeBtn.addEventListener('click', closePopup);
  maximizeBtn.addEventListener('click', toggleSidePanel);
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

  // Add paste event listener for images
  input.addEventListener('paste', handlePaste);

  // Make popup draggable (only in floating mode)
  if (!isSidePanelMode) {
    makePopupDraggable();
  }
}

/**
 * Make popup draggable
 */
function makePopupDraggable() {
  const header = chatPopup.querySelector('.chat-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('.close-btn') || e.target.closest('.maximize-btn')) return;
    if (isSidePanelMode) return;

    isDragging = true;
    initialX = e.clientX - chatPopup.offsetLeft;
    initialY = e.clientY - chatPopup.offsetTop;
    header.style.cursor = 'grabbing';
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    chatPopup.style.left = `${currentX}px`;
    chatPopup.style.top = `${currentY}px`;
  }

  function dragEnd() {
    isDragging = false;
    header.style.cursor = 'grab';
  }
}

/**
 * Send message to AI
 */
async function sendMessage() {
  const input = chatPopup.querySelector('#chat-input');
  const message = input.value.trim();

  if (!message && uploadedImages.length === 0) return;

  // Clear input
  input.value = '';

  // Add user message to UI (with images if any)
  addMessageToUI('user', message, uploadedImages.length > 0 ? [...uploadedImages] : null);

  // Clear image previews
  const images = [...uploadedImages];
  uploadedImages = [];
  updateImagePreview();

  // Show loading indicator
  const loadingId = addMessageToUI('assistant', '');
  showLoadingIndicator(loadingId);

  // Disable input while processing
  input.disabled = true;
  chatPopup.querySelector('#send-btn').disabled = true;
  chatPopup.querySelector('#image-upload-btn').disabled = true;

  try {
    // Send to background script for API call
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
      // Add conversation to history
      conversationHistory.push({
        role: 'user',
        content: message,
        images: images.length > 0 ? images : null
      });
      conversationHistory.push({
        role: 'assistant',
        content: response.data.response
      });

      // Update UI with response
      updateMessageInUI(loadingId, response.data.response);
    } else {
      updateMessageInUI(loadingId, `Error: ${response.error}`);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    updateMessageInUI(loadingId, 'Sorry, there was an error processing your request.');
  } finally {
    // Re-enable input
    input.disabled = false;
    chatPopup.querySelector('#send-btn').disabled = false;
    chatPopup.querySelector('#image-upload-btn').disabled = false;
    input.focus();
  }
}

/**
 * Add message to chat UI
 */
function addMessageToUI(role, content, images = null) {
  const messagesContainer = chatPopup.querySelector('#chat-messages');
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

/**
 * Show loading indicator for a message
 */
function showLoadingIndicator(messageId) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    messageDiv.classList.add('loading');
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = '<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>';
  }
}

/**
 * Update existing message in UI
 */
function updateMessageInUI(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.textContent = content;

    // Remove loading class if present
    messageDiv.classList.remove('loading');
  }
}

/**
 * Close popup
 */
function toggleSidePanel() {
  if (!chatPopup) return;

  isSidePanelMode = !isSidePanelMode;

  if (isSidePanelMode) {
    // Entering side panel mode - snap to right edge
    chatPopup.classList.add('side-panel');
    chatPopup.querySelector('.chat-header').style.cursor = 'default';
    
    // Clear inline positioning to let CSS take over
    chatPopup.style.right = '0px';
    chatPopup.style.top = '0px';
    chatPopup.style.left = 'auto';
  } else {
    // Exiting side panel mode - return to floating
    chatPopup.classList.remove('side-panel');
    chatPopup.querySelector('.chat-header').style.cursor = 'grab';
    
    // Position in center-right of screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    chatPopup.style.right = 'auto';
    chatPopup.style.left = `${viewportWidth - 420}px`;
    chatPopup.style.top = `${(viewportHeight - 600) / 2}px`;
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
  const container = chatPopup.querySelector('#image-preview-container');
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

function closePopup() {
  if (chatPopup) {
    chatPopup.remove();
    chatPopup = null;
    selectedContext = null;
    conversationHistory = [];
    uploadedImages = [];
    isSidePanelMode = false;
  }
}

/**
 * Handle clicks outside popup
 */
function handleOutsideClick(event) {
  if (chatPopup && !chatPopup.contains(event.target)) {
    // Don't close immediately on selection
    const selection = window.getSelection();
    if (!selection.toString().trim()) {
      // Delay to allow for re-selection
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (!newSelection.toString().trim()) {
          closePopup();
        }
      }, 100);
    }
  }
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(message, sender, sendResponse) {
  console.log('[KnowAnything] Received message:', message);
  
  if (message.type === 'SHOW_POPUP') {
    handleShowPopup();
    sendResponse({ success: true });
  } else if (message.type === 'CLOSE_POPUP') {
    closePopup();
    sendResponse({ success: true });
  }
  return true;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}