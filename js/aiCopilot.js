'use strict';

// ── AI Copilot Implementation ──────────────────────────────────────

let chatHistory = [];
const SYSTEM_PROMPT = `You are SimuLab AI Copilot, an expert in electronics, Arduino C++, and circuit debugging. 
You are integrated directly into a browser-based simulator.
The user will ask you questions about their circuit or code.
Along with their message, you will receive a snapshot of their workspace, including:
1. The current C++ code
2. The components on the breadboard (JSON)
3. The wires connecting them (JSON)
4. Any recent compiler errors

Your job is to:
- Explain why code fails to compile.
- Point out wiring mistakes (e.g. "You connected an LED without a resistor", "You connected a digital pin to an analog sensor").
- Suggest code snippets to achieve their goals.
- Be concise and friendly. Format code snippets using markdown.`;

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function parseMarkdown(md) {
  // Very basic markdown parser for code blocks and bold text
  let html = md.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/```(cpp|javascript|js)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function addMessageToUI(role, text) {
  const chat = document.getElementById('ai-chat');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  
  if (role === 'user') {
    div.textContent = text; // Safe text
  } else {
    // For AI, we parse basic markdown
    div.innerHTML = parseMarkdown(escapeHTML(text));
  }
  
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Ensure local storage key is loaded on startup
window.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('gemini_key');
  if(savedKey) {
    const keyInput = document.getElementById('ai-apikey');
    if(keyInput) keyInput.value = savedKey;
  }
});

async function sendAI(overridePrompt = null) {
  const inputEl = document.getElementById('ai-input');
  const userText = overridePrompt || inputEl.value.trim();
  if(!userText) return;
  
  const apiKey = document.getElementById('ai-apikey').value.trim();
  if(!apiKey) {
    alert("Please paste your Gemini API Key at the top of the AI pane first!");
    return;
  }

  if(!overridePrompt) inputEl.value = '';
  addMessageToUI('user', userText);

  // Build the workspace context
  const code = typeof getEditorValue === 'function' ? getEditorValue() : '';
  const compsJson = typeof comps !== 'undefined' ? JSON.stringify(comps) : '[]';
  const wiresJson = typeof wires !== 'undefined' ? JSON.stringify(wires) : '[]';
  
  // Grab the last error from the UI if it's visible
  let lastError = '';
  const errPanel = document.getElementById('err-panel');
  if(errPanel && errPanel.classList.contains('show')) {
    lastError = document.getElementById('err-body').innerText;
  }

  const contextBlock = `
--- WORKSPACE CONTEXT ---
[Code]
${code}

[Components]
${compsJson}

[Wires]
${wiresJson}

[Latest Compiler Error]
${lastError}
-------------------------
`;

  const payloadText = contextBlock + "\n\nUser: " + userText;

  // Build messages array for Gemini
  const messages = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to help.' }] }
  ];

  // Append history
  for(let msg of chatHistory) {
    messages.push(msg);
  }

  // Append current message with context
  messages.push({ role: 'user', parts: [{ text: payloadText }] });

  const aiMsgDiv = document.createElement('div');
  aiMsgDiv.className = 'ai-msg ai';
  aiMsgDiv.innerHTML = '<i>Thinking...</i>';
  document.getElementById('ai-chat').appendChild(aiMsgDiv);
  document.getElementById('ai-chat').scrollTop = document.getElementById('ai-chat').scrollHeight;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: messages })
    });

    if(!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "API Error");
    }

    const data = await res.json();
    const replyText = data.candidates[0].content.parts[0].text;
    
    // Update history (without the giant context block to save tokens, just the user intent)
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    chatHistory.push({ role: 'model', parts: [{ text: replyText }] });

    aiMsgDiv.innerHTML = parseMarkdown(escapeHTML(replyText));

  } catch (err) {
    aiMsgDiv.innerHTML = `<span style="color:#ef4444">Error: ${escapeHTML(err.message)}</span>`;
  }
}

// Hook for triggering AI from the compiler error panel
function triggerAIForError() {
  showPane('ai');
  sendAI("My code failed to compile. Can you look at the error and my code and tell me exactly how to fix it?");
}
