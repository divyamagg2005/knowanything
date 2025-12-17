/**
 * Content Script - Context Chat Extension
 * Handles text selection, context extraction, and floating popup UI
 */

let chatPopup = null;
let selectedContext = null;
let conversationHistory = [];

// Constants
const MIN_SELECTION_LENGTH = 3;
const POPUP_OFFSET = 10;

/**
 * Initialize the extension on page load
 */
function init() {
  // Listen for text selection
  document.addEventListener('mouseup', handleTextSelection);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  
  // Close popup when clicking outside
  document.addEventListener('mousedown', handleOutsideClick);
}

/**
 * Handle text selection events
 */
function handleTextSelection(event) {
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Ignore small or empty selections
    if (!selectedText || selectedText.length < MIN_SELECTION_LENGTH) {
      return;
    }
    
    // Ignore if clicking inside the popup
    if (chatPopup && chatPopup.contains(event.target)) {
      return;
    }
    
    // Extract context
    selectedContext = extractContext(selection);
    
    if (selectedContext) {
      // Reset conversation for new selection
      conversationHistory = [];
      
      // Show popup near selection
      showPopup(event.clientX, event.clientY);
    }
  }, 10);
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
  // Remove existing popup
  if (chatPopup) {
    chatPopup.remove();
  }
  
  // Create popup container
  chatPopup = document.createElement('div');
  chatPopup.id = 'context-chat-popup';
  chatPopup.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Context Chat</span>
      </div>
      <button class="close-btn" title="Close">×</button>
    </div>
    
    <div class="selected-text-container">
      <div class="selected-text-label">Selected Text</div>
      <div class="selected-text">${escapeHtml(selectedContext.selectedText)}</div>
    </div>
    
    <div class="chat-messages" id="chat-messages"></div>
    
    <div class="chat-input-container">
      <input 
        type="text" 
        id="chat-input" 
        placeholder="Ask a question about this text..."
        autocomplete="off"
      />
      <button id="send-btn" title="Send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(chatPopup);
  
  // Position the popup
  positionPopup(x, y);
  
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
  const sendBtn = chatPopup.querySelector('#send-btn');
  const input = chatPopup.querySelector('#chat-input');
  
  closeBtn.addEventListener('click', closePopup);
  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Make popup draggable
  makePopupDraggable();
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
    if (e.target.closest('.close-btn')) return;
    
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
  
  if (!message) return;
  
  // Clear input
  input.value = '';
  
  // Add user message to UI
  addMessageToUI('user', message);
  
  // Show loading indicator
  const loadingId = addMessageToUI('assistant', '');
  showLoadingIndicator(loadingId);
  
  // Disable input while processing
  input.disabled = true;
  chatPopup.querySelector('#send-btn').disabled = true;
  
  try {
    // Send to background script for API call
    const response = await chrome.runtime.sendMessage({
      type: 'CHAT_MESSAGE',
      payload: {
        message,
        context: selectedContext,
        conversationHistory
      }
    });
    
    if (response.success) {
      // Add conversation to history
      conversationHistory.push({
        role: 'user',
        content: message
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
    input.focus();
  }
}

/**
 * Add message to chat UI
 */
function addMessageToUI(role, content) {
  const messagesContainer = chatPopup.querySelector('#chat-messages');
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}-message`;
  messageDiv.id = messageId;
  messageDiv.innerHTML = `
    <div class="message-content">${escapeHtml(content)}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageId;
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
 * Show loading indicator
 */
function showLoadingIndicator(messageId) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    messageDiv.classList.add('loading');
    messageDiv.querySelector('.message-content').innerHTML = `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }
}

/**
 * Close popup
 */
function closePopup() {
  if (chatPopup) {
    chatPopup.remove();
    chatPopup = null;
    selectedContext = null;
    conversationHistory = [];
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
  if (message.type === 'CLOSE_POPUP') {
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