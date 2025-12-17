/**
 * Background Service Worker - Context Chat Extension
 * Handles Gemini API calls and inter-component messaging
 */

// Gemini API Configuration
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// System instruction for Gemini (strict context adherence)
const SYSTEM_INSTRUCTION = `You are an AI assistant that answers questions ONLY using the provided context. 

CRITICAL RULES:
1. Base your answers EXCLUSIVELY on the provided context (selected text, surrounding paragraphs, page information, and any images provided)
2. If the answer cannot be derived from the context, respond with: "This information is not present in the selected text or its surrounding context."
3. Do not use external knowledge or make assumptions beyond what's explicitly stated in the context
4. Be concise and direct in your responses
5. If the context is ambiguous, acknowledge the ambiguity
6. When quoting, use the exact words from the context
7. When images are provided, analyze them in relation to the selected text and context

You are helpful, accurate, and honest about the limitations of the provided context.`;

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHAT_MESSAGE') {
    handleChatMessage(message.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'context-chat',
    title: 'Chat with Context Chat',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'context-chat' && info.selectionText) {
    console.log('[Context Chat] Context menu clicked, tab ID:', tab.id);
    
    try {
      // Send message to all frames (important for PDFs and iframes)
      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      console.log('[Context Chat] Found frames:', frames?.length || 0);
      
      let messagesSent = 0;
      for (const frame of frames) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_POPUP',
            selectionText: info.selectionText
          }, { frameId: frame.frameId });
          messagesSent++;
          console.log('[Context Chat] Message sent to frame:', frame.frameId);
        } catch (frameError) {
          console.log('[Context Chat] Frame', frame.frameId, 'not ready or no content script');
        }
      }
      
      if (messagesSent === 0) {
        throw new Error('No frames responded');
      }
    } catch (error) {
      console.error('[Context Chat] Error sending message to content script:', error);
      console.log('[Context Chat] Content script may not be loaded. Trying to inject...');
      
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id, allFrames: true },
          files: ['styles/popup.css']
        });
        
        console.log('[Context Chat] Scripts injected, retrying...');
        
        setTimeout(async () => {
          try {
            const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
            for (const frame of frames) {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  type: 'SHOW_POPUP',
                  selectionText: info.selectionText
                }, { frameId: frame.frameId });
                console.log('[Context Chat] Retry: Message sent to frame:', frame.frameId);
              } catch (frameError) {
                console.log('[Context Chat] Retry: Frame', frame.frameId, 'still not ready');
              }
            }
          } catch (retryError) {
            console.error('[Context Chat] Failed to show popup after injection:', retryError);
          }
        }, 200);
      } catch (injectionError) {
        console.error('[Context Chat] Failed to inject content script:', injectionError);
      }
    }
  }
});

/**
 * Handle chat message and get AI response
 */
async function handleChatMessage(payload) {
  const { message, context, conversationHistory, images } = payload;
  
  // Retrieve API key from storage
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  
  // Validate API key
  if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key not configured. Please set your API key in the extension settings (right-click extension icon > Options).');
  }
  
  // Build the prompt with context
  const contextPrompt = buildContextPrompt(context);
  
  // Build conversation messages
  const messages = buildConversationMessages(contextPrompt, conversationHistory, message, images);
  
  // Call Gemini API
  const response = await callGeminiAPI(messages, geminiApiKey);
  
  return { response };
}

/**
 * Build context prompt from extracted context
 */
function buildContextPrompt(context) {
  let prompt = '=== CONTEXT FOR ANSWERING ===\n\n';
  
  // Page information
  prompt += `Page Title: ${context.pageTitle}\n`;
  prompt += `Page URL: ${context.pageUrl}\n\n`;
  
  // Before context
  if (context.beforeContext) {
    prompt += `--- Previous Paragraph ---\n${context.beforeContext}\n\n`;
  }
  
  // Selected text (most important)
  prompt += `--- SELECTED TEXT (PRIMARY FOCUS) ---\n${context.selectedText}\n\n`;
  
  // After context
  if (context.afterContext) {
    prompt += `--- Next Paragraph ---\n${context.afterContext}\n\n`;
  }
  
  prompt += '=== END CONTEXT ===\n\n';
  prompt += 'Answer questions based ONLY on the context above. Do not use external knowledge.';
  
  return prompt;
}

/**
 * Build conversation messages for Gemini API
 */
function buildConversationMessages(contextPrompt, conversationHistory, userMessage, images = null) {
  const messages = [];
  
  // Add context as initial user message (only on first message)
  if (conversationHistory.length === 0) {
    messages.push({
      role: 'user',
      parts: [{ text: contextPrompt }]
    });
    
    // Add acknowledgment from model
    messages.push({
      role: 'model',
      parts: [{ text: 'I understand. I will answer questions based only on the provided context.' }]
    });
  }
  
  // Add conversation history
  for (const msg of conversationHistory) {
    const parts = [{ text: msg.content }];
    
    // Add images if present in history
    if (msg.images && msg.images.length > 0) {
      msg.images.forEach(imageData => {
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.match(/data:([^;]+);/)[1];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      });
    }
    
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: parts
    });
  }
  
  // Add current user message with images if provided
  const currentParts = [{ text: userMessage || 'Please analyze the provided image(s) in relation to the selected text.' }];
  
  if (images && images.length > 0) {
    images.forEach(imageData => {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.match(/data:([^;]+);/)[1];
      currentParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    });
  }
  
  messages.push({
    role: 'user',
    parts: currentParts
  });
  
  return messages;
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(messages, apiKey) {
  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  
  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.4, // Lower temperature for more focused, factual responses
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  };
  
  try {
    console.log('[Context Chat] Sending request to Gemini API...');
    console.log('[Context Chat] Message count:', messages.length);
    console.log('[Context Chat] Has images:', messages.some(m => m.parts?.some(p => p.inlineData)));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Context Chat] Gemini API error:', errorData);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Context Chat] API Response:', JSON.stringify(data, null, 2));
    
    // Check if response was blocked by safety filters
    if (data.promptFeedback?.blockReason) {
      console.error('[Context Chat] Prompt blocked:', data.promptFeedback.blockReason);
      throw new Error(`Request blocked: ${data.promptFeedback.blockReason}`);
    }
    
    // Extract response text
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      // Check if candidate was blocked
      if (candidate.finishReason === 'SAFETY') {
        console.error('[Context Chat] Response blocked by safety filters:', candidate.safetyRatings);
        throw new Error('Response blocked by safety filters. Try rephrasing your question.');
      }
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const responseText = candidate.content.parts[0].text;
        console.log('[Context Chat] Response text length:', responseText?.length);
        return responseText;
      }
    }
    
    console.error('[Context Chat] No valid response in API data:', data);
    throw new Error('No response generated from API');
    
  } catch (error) {
    console.error('[Context Chat] Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Installation handler
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Context Chat Extension installed successfully!');
  }
});

console.log('Context Chat Extension background script loaded');