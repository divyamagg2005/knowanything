/**
 * Popup Script - Context Chat Extension
 * Handles extension popup interactions and settings
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check API key configuration
  checkAPIKeyStatus();
  
  // Add event listeners for future features
  setupEventListeners();
});

/**
 * Check if API key is configured
 */
async function checkAPIKeyStatus() {
  // This would check if API key is set in storage or background script
  // For now, we'll assume it's configured
  const statusElement = document.querySelector('.status');
  
  // You could implement API key storage in chrome.storage here
  // and check its status
}

/**
 * Setup event listeners for popup interactions
 */
function setupEventListeners() {
  // Future: Add settings, API key configuration, etc.
  
  // Example: Open options page
  const links = document.querySelectorAll('a[href="#options"]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  });
}

/**
 * Get extension statistics
 */
async function getStats() {
  try {
    const stats = await chrome.storage.local.get(['totalChats', 'totalMessages']);
    return {
      totalChats: stats.totalChats || 0,
      totalMessages: stats.totalMessages || 0
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { totalChats: 0, totalMessages: 0 };
  }
}

/**
 * Update statistics display
 */
async function updateStatsDisplay() {
  const stats = await getStats();
  // Update UI with stats if elements exist
}