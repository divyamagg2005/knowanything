# KnowAnything - AI Assistant

**Privacy-first, context-aware AI conversations for any webpage**

A Chrome browser extension that lets you have intelligent conversations with selected text using Google's Gemini AI. Simply highlight any text on any webpage, and a floating chat interface appears to answer your questions based strictly on that context.

Built for **VIBE HACK 2.0** 🚀

---

## ✨ Features

### 🎯 Core Functionality
- **Context-Aware AI**: Chat with any selected text on any webpage
- **Strict Context Adherence**: AI responses are based ONLY on the selected text and its surrounding paragraphs
- **Universal Compatibility**: Works on all websites, including PDFs and iframes
- **Image Analysis**: Upload or paste images (Ctrl+V) for visual analysis in relation to your text

### 🎨 User Interface
- **Floating Popup**: Draggable chat window that appears near your selection
- **Side Panel Mode**: Toggle to full-height side panel for extended conversations
- **Elegant Design**: Refined editorial aesthetic with warm tones and smooth animations
- **Responsive**: Adapts to different screen sizes and contexts

### 🔒 Privacy & Security
- **Privacy-First**: Your API key is stored locally in your browser
- **No Data Collection**: No user data is sent to any server except Google's Gemini API
- **Direct API Communication**: Your data goes directly to Google's API, nowhere else
- **Local Processing**: All context extraction happens in your browser

### ⚡ Advanced Features
- **Conversation History**: Maintains context across multiple questions
- **Multi-Frame Support**: Works seamlessly in iframes and embedded content
- **Context Menu Integration**: Right-click selected text to chat
- **Manual Context Mode**: Paste text from PDFs or any source directly in the popup
- **Image Upload**: Support for multiple images per message

---

## 📦 Installation

### Option 1: Load Unpacked Extension (Development)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/context-chat-extension.git
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → Extensions → Manage Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

4. **Load the extension**
   - Click "Load unpacked"
   - Select the extension directory containing `manifest.json`

5. **Configure your API key** (see Configuration section below)

### Option 2: Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store soon!

---

## ⚙️ Configuration

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Setting Up the Extension

1. Click the extension icon in your Chrome toolbar
2. Paste your API key in the input field
3. Click "💾 Save"
4. Optionally click "🧪 Test" to verify the key works

---

## 🚀 Usage

### Basic Usage

1. **Select Text**
   - Highlight any text on any webpage
   - The chat popup will automatically appear near your selection

2. **Ask Questions**
   - Type your question in the input field
   - Press Enter or click the send button
   - Get AI-powered answers based on the selected context

3. **Continue Conversation**
   - Ask follow-up questions
   - The AI maintains conversation context
   - All responses are based on the original selected text

### Advanced Usage

#### Using the Context Menu
1. Select text on any webpage
2. Right-click the selection
3. Choose "Chat with KnowAnything"
4. The chat popup appears with your selection

#### Side Panel Mode
- Click the maximize button (⛶) in the chat header
- The popup expands to a full-height side panel
- Click again to return to floating mode

#### Image Analysis
1. **Upload Images**:
   - Click the image icon (📷) in the chat input
   - Select one or more images
   
2. **Paste Images**:
   - Copy an image from anywhere
   - Press `Ctrl+V` in the chat input
   - The image will be analyzed in relation to your selected text

#### Manual KnowAnything
1. Click the extension icon
2. Scroll to "Quick Chat" section
3. Paste text from PDFs or any source
4. Click "💬 Start Chat"
5. A new chat window opens with your custom context

---

## 🏗️ Project Structure

```
knowanything/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js           # Service worker - API calls & messaging
├── content.js              # Content script - UI & context extraction
├── popup/
│   ├── popup.html          # Extension popup interface
│   └── popup.js            # Popup logic & settings
├── options.html            # Settings page
├── options.js              # Settings page logic
├── styles/
│   └── popup.css          # Chat interface styles
├── icons/
│   ├── icon16.png         # Extension icon (16x16)
│   ├── icon48.png         # Extension icon (48x48)
│   └── icon128.png        # Extension icon (128x128)
└── README.md              # This file
```

---

## 🔧 Technical Details

### Architecture

- **Manifest Version**: V3 (latest Chrome extension standard)
- **AI Model**: Google Gemini 2.5 Flash
- **Permissions**: `activeTab`, `scripting`, `storage`, `contextMenus`, `webNavigation`
- **Host Permissions**: `<all_urls>` (required to work on all websites)

### Key Components

#### Background Service Worker (`background.js`)
- Handles all API communication with Google Gemini
- Manages context menu integration
- Processes messages from content scripts
- Implements strict context adherence through system instructions

#### Content Script (`content.js`)
- Injects chat UI into web pages
- Extracts selected text and surrounding context
- Handles user interactions (dragging, clicking, typing)
- Manages conversation history and image uploads
- Supports both floating and side panel modes

#### Popup Interface (`popup.html` & `popup.js`)
- API key configuration
- Extension status display
- Manual context chat feature
- Quick access to settings

### Context Extraction Algorithm

1. Captures user's selected text
2. Identifies the containing block-level element
3. Extracts previous paragraph (before context)
4. Extracts next paragraph (after context)
5. Includes page title and URL
6. Sends structured context to AI with strict instructions

### AI Configuration

```javascript
{
  model: "gemini-2.5-flash",
  temperature: 0.4,        // Lower for factual responses
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024
}
```

---

## 🎨 Design Philosophy

### Visual Design
- **Warm Editorial Aesthetic**: Inspired by premium editorial design
- **Color Palette**: Warm browns (#8b7355) with cream backgrounds (#fdfcfb)
- **Typography**: Segoe UI system font for clarity and elegance
- **Animations**: Smooth, subtle animations using cubic-bezier easing

### UX Principles
- **Non-Intrusive**: Popup appears only when needed
- **Contextual**: Always near the user's selection
- **Flexible**: Draggable and resizable interface
- **Accessible**: Keyboard shortcuts, high contrast support, reduced motion

---

## 🔐 Privacy & Data Handling

### What We Store
- **API Key**: Stored locally in Chrome's storage API
- **No User Data**: No browsing history, selections, or conversations are stored

### What We Send
- **To Google Gemini API Only**:
  - Your selected text and surrounding context
  - Your questions
  - Any images you choose to upload
  - Your API key for authentication

### What We DON'T Do
- ❌ Track your browsing
- ❌ Store your conversations
- ❌ Send data to third-party servers
- ❌ Collect analytics or telemetry

---

## 🛠️ Development

### Prerequisites
- Google Chrome or Chromium-based browser
- Node.js (optional, for future build tools)
- Google Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/divyamagg2005/knowanything.git
   cd context-chat-extension
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

3. **Make changes**
   - Edit files as needed
   - Click the refresh icon on the extension card to reload
   - For content script changes, refresh the web page

### Testing

1. **Test on different websites**
   - News articles
   - Documentation pages
   - PDFs
   - Iframes/embedded content

2. **Test features**
   - Text selection and context extraction
   - Conversation flow
   - Image upload/paste
   - Side panel toggle
   - API key configuration

### Debugging

- **Background Script**: `chrome://extensions/` → Click "service worker"
- **Content Script**: Open DevTools on any webpage
- **Popup**: Right-click extension icon → "Inspect popup"

---

## 📝 API Reference

### Gemini API Endpoint
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### System Instruction
The extension uses a strict system instruction to ensure AI responses stay within context:

```
You are an AI assistant that answers questions ONLY using the provided context.

CRITICAL RULES:
1. Base your answers EXCLUSIVELY on the provided context
2. If the answer cannot be derived from the context, respond with: 
   "This information is not present in the selected text or its surrounding context."
3. Do not use external knowledge or make assumptions
4. Be concise and direct in your responses
5. When quoting, use exact words from the context
```

---

## 🚧 Known Limitations

- **API Key Required**: Users must provide their own Google Gemini API key
- **Context Size**: Limited to selected text + surrounding paragraphs
- **Rate Limits**: Subject to Google Gemini API rate limits
- **Chrome Only**: Currently designed for Chrome/Chromium browsers

---

## 🗺️ Roadmap

### Planned Features
- [ ] Support for other AI models (GPT-4, Claude, etc.)
- [ ] Conversation export (JSON, Markdown)
- [ ] Custom system prompts
- [ ] Keyboard shortcuts customization
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Firefox compatibility

### Under Consideration
- [ ] Conversation history storage (optional)
- [ ] Text-to-speech for responses
- [ ] Integration with note-taking apps
- [ ] Custom CSS themes

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow the existing code style
- Test your changes thoroughly
- Update documentation as needed
- Keep commits focused and descriptive

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini API** for powering the AI responses
- **VIBE HACK 2.0** for the inspiration and motivation
- All contributors and testers

---

### FAQ

**Q: Why do I need my own API key?**  
A: To maintain privacy and avoid costs, users provide their own keys. Google offers generous free tiers.

**Q: Does this work with PDFs?**  
A: Yes! You can either select text directly in PDF viewers or paste content into the manual context feature.

**Q: Can I use this offline?**  
A: No, the extension requires internet connectivity to communicate with the Gemini API.

**Q: Is my data secure?**  
A: Yes. Your API key is stored locally, and all data is sent directly to Google's Gemini API over HTTPS.

**Q: Why isn't the popup appearing?**  
A: Ensure you've selected enough text (minimum 3 characters) and configured your API key.

---

## 📊 Stats

- **Version**: 1.0.0
- **Manifest Version**: 3
- **Supported Browsers**: Chrome 88+, Edge 88+
- **AI Model**: Gemini 2.5 Flash

---

**Made with ❤️ for VIBE HACK 2.0**

If you find this extension useful, please give it a ⭐ on GitHub!
