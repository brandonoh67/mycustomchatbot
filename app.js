// CONFIGURATION
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE";

// BRAND & COMPANY CONFIGURATION
const BRAND_CONFIG = {
  companyName: "Cornerstone Family Dentistry",
  avatarText: "CFD",
  welcomeMessage: "Hi I'm your virtual assistant for " + BRAND_CONFIG.companyName + "! How can I assist you today?",
  sampleQuestions: [
    "How do I schedule an appointment?",
    "What services do you offer?",
    "Where is your office located?",
    "What insurance plans do you accept?"
  ]
};

// DEFAULT BOT CONFIGURATION
const DEFAULT_CONFIG = {
  model: "gpt-4o-mini",
  theme: "light",
  fontSize: "normal",
  patientName: "",
  patientContact: "",
  patientCategory: "", // child, adult, senior, or empty
  systemPrompt: `You are the official virtual assistant for Cornerstone Family Dentistry, a family dental practice in Garland, Texas (website: https://www.csfdentistry.com/).

Your primary goal is to assist current and prospective patients politely, professionally, and accurately.

SOURCE & KNOWLEDGE GUIDELINES:

1. PRACTICE-SPECIFIC QUESTIONS (Cornerstone Family Dentistry):
   - Practice Name: Cornerstone Family Dentistry
   - Location: Garland, Texas
   - Phone: (972) 271-1302
   - Website: https://www.csfdentistry.com/
   - Primary Services: General dentistry, preventive cleanings, exams, crowns, bridges, dental implants, cosmetic dentistry, pediatric dentistry, senior dental care, and same-day emergency dentistry.
   - Direct patients to call the Garland office directly at (972) 271-1302 or visit www.csfdentistry.com to book appointments or confirm insurance details.

2. CLICKABLE LINKS & CONTACTS:
   - Always format telephone numbers as clickable tel links: <a href="tel:9722711302">(972) 271-1302</a>.
   - Always format website URLs as HTML links: <a href="https://www.csfdentistry.com/" target="_blank">www.csfdentistry.com</a>.

3. GENERAL DENTAL & ORAL HEALTH QUESTIONS:
   - For general oral hygiene or clinical questions, base answers on established dental authority standards (ADA).

4. MEDICAL & SAFETY BOUNDARIES:
   - Online answers cannot replace a professional clinical examination.
   - For severe dental pain, bleeding, or acute trauma, IMMEDIATELY advise the user to contact Cornerstone Family Dentistry at <a href="tel:9722711302">(972) 271-1302</a>.`,
  temperature: 0.2
};

// STATE MANAGEMENT
let currentConfig = loadSavedConfig();
let attachedFile = null;
let userMessageCount = 0;
let hasPromptedForContact = false;
let toastTimeout = null;

// DOM ELEMENTS
const chatLauncher = document.getElementById("chat-launcher");
const chatShell = document.getElementById("chat-shell");
const closeWidgetBtn = document.getElementById("close-widget-btn");

const chatFeed = document.getElementById("chat-feed");
const questionForm = document.getElementById("question-form");
const userInput = document.getElementById("question-input");
const askButton = document.getElementById("ask-button");

// BRANDING DOM ELEMENTS
const brandH1 = document.getElementById("brand-h1");
const brandAvatar = document.getElementById("brand-avatar");
const sampleQuestionsContainer = document.getElementById("sample-questions");

// FILE UPLOAD DOM ELEMENTS
const fileUploadInput = document.getElementById("file-upload-input");
const attachFileBtn = document.getElementById("attach-file-btn");
const filePreviewBar = document.getElementById("file-preview-bar");
const fileNameDisplay = document.getElementById("file-name");
const removeFileBtn = document.getElementById("remove-file-btn");

// HISTORY & SETTINGS DOM ELEMENTS
const historyToggleBtn = document.getElementById("history-toggle-btn");
const historyCloseBtn = document.getElementById("history-close-btn");
const historyOverlay = document.getElementById("history-overlay");
const historyList = document.getElementById("history-list");
const clearAllHistoryBtn = document.getElementById("clear-all-history-btn");

const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsForm = document.getElementById("settings-form");
const settingTheme = document.getElementById("setting-theme");
const settingFontSize = document.getElementById("setting-font-size");
const settingPatientCategory = document.getElementById("setting-patient-category");
const settingPatientName = document.getElementById("setting-patient-name");
const settingPatientContact = document.getElementById("setting-patient-contact");
const settingCreativity = document.getElementById("setting-creativity");
const settingSystemPrompt = document.getElementById("setting-system-prompt");
const clearChatBtn = document.getElementById("clear-chat-btn");

// CONVERSATION HISTORY
let conversationHistory = initializeFreshHistory();

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initBrandUI();
  applyThemePreference();
  applyFontSizePreference();
  initFirstWelcomeMessage();
  renderSampleQuestions();

  if (userInput) {
    setTimeout(() => userInput.focus(), 300);
  }

  // --- FLOATING WIDGET TOGGLES ---
  if (chatLauncher) chatLauncher.addEventListener("click", openWidget);
  if (closeWidgetBtn) closeWidgetBtn.addEventListener("click", closeWidget);

  // --- CHAT HISTORY OVERLAY HANDLERS ---
  if (historyToggleBtn) {
    historyToggleBtn.addEventListener("click", () => {
      renderHistoryList();
      historyOverlay.classList.remove("hidden");
    });
  }

  if (historyCloseBtn) {
    historyCloseBtn.addEventListener("click", () => historyOverlay.classList.add("hidden"));
  }

  if (historyOverlay) {
    historyOverlay.addEventListener("click", (e) => {
      if (e.target === historyOverlay) historyOverlay.classList.add("hidden");
    });
  }

  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener("click", () => {
      clearAllHistoryData();
    });
  }

  // --- SETTINGS OVERLAY TOGGLE LOGIC ---
  if (settingsToggleBtn) {
    settingsToggleBtn.addEventListener("click", () => {
      syncSettingsUI();
      settingsOverlay.classList.remove("hidden");
    });
  }

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener("click", () => settingsOverlay.classList.add("hidden"));
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
    });
  }

  // --- LIVE SETTINGS CHANGE LISTENERS ---
  if (settingTheme) {
    settingTheme.addEventListener("change", () => {
      currentConfig.theme = settingTheme.value;
      applyThemePreference();
      saveConfig();
    });
  }

  if (settingFontSize) {
    settingFontSize.addEventListener("change", () => {
      currentConfig.fontSize = settingFontSize.value;
      applyFontSizePreference();
      saveConfig();
    });
  }

  // --- SAVE SETTINGS FORM SUBMIT ---
  if (settingsForm) {
    settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();

      currentConfig.theme = settingTheme ? settingTheme.value : "light";
      currentConfig.fontSize = settingFontSize ? settingFontSize.value : "normal";
      currentConfig.patientCategory = settingPatientCategory ? settingPatientCategory.value : "";
      currentConfig.patientName = settingPatientName ? settingPatientName.value.trim() : "";
      currentConfig.patientContact = settingPatientContact ? settingPatientContact.value.trim() : "";
      currentConfig.temperature = parseFloat(settingCreativity.value);
      currentConfig.systemPrompt = settingSystemPrompt.value.trim();

      saveConfig();
      applyThemePreference();
      applyFontSizePreference();

      updateInFeedCategoryStatusDisplay(currentConfig.patientCategory);

      conversationHistory = initializeFreshHistory();
      if (conversationHistory.length > 0 && conversationHistory[0].role === "system") {
        conversationHistory[0].content = currentConfig.systemPrompt;
      }

      settingsOverlay.classList.add("hidden");
      showToast("Settings saved successfully!");
    });
  }

  // --- FILE ATTACHMENT HANDLERS ---
  if (attachFileBtn && fileUploadInput) {
    attachFileBtn.addEventListener("click", () => fileUploadInput.click());
    
    fileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleFileSelect(file);
    });
  }

  if (removeFileBtn) removeFileBtn.addEventListener("click", clearFileAttachment);

  // Clear Chat History Button (inside Settings)
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
      clearAllHistoryData();
      settingsOverlay.classList.add("hidden");
    });
  }

  // Question Form Submit Handler
  if (questionForm) questionForm.addEventListener("submit", handleSubmit);

  // Handle 'Enter' key inside <textarea>
  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        questionForm.requestSubmit();
      }
    });

    userInput.addEventListener("input", () => {
      userInput.style.height = "auto";
      userInput.style.height = `${Math.min(userInput.scrollHeight, 80)}px`;
    });
  }
});

/* WIDGET OPEN / CLOSE TOGGLES */

function openWidget() {
  chatShell.classList.remove("collapsed");
  chatLauncher.classList.add("hidden");

  setTimeout(() => {
    if (userInput) userInput.focus();
  }, 200);
}

function closeWidget() {
  chatShell.classList.add("collapsed");
  chatLauncher.classList.remove("hidden");
}

/* BRAND & DYNAMIC UI HELPERS */

function initBrandUI() {
  if (brandH1) brandH1.textContent = "Cornerstone Dentistry";
  if (brandAvatar) brandAvatar.textContent = BRAND_CONFIG.avatarText;
}

function initializeFreshHistory() {
  const history = [{ role: "system", content: currentConfig.systemPrompt }];
  
  if (currentConfig.patientCategory) {
    const promptContext = getCategorySystemInstruction(currentConfig.patientCategory);
    if (promptContext) {
      history.push({ role: "system", content: promptContext });
    }
  }

  if (currentConfig.patientName && currentConfig.patientContact) {
    history.push({
      role: "system",
      content: `[PATIENT CONTACT SAVED]: Name: ${currentConfig.patientName}, Contact: ${currentConfig.patientContact}.`
    });
  }

  return history;
}

function initFirstWelcomeMessage() {
  chatFeed.innerHTML = `<div class="chat-divider"><span>Today</span></div>`;
  appendBotMessage(BRAND_CONFIG.welcomeMessage, false);
  conversationHistory = initializeFreshHistory();
  conversationHistory.push({ role: "assistant", content: BRAND_CONFIG.welcomeMessage });

  if (!currentConfig.patientCategory) {
    appendInFeedAgeSelector();
  } else {
    appendCategoryStatus(currentConfig.patientCategory);
  }
}

function renderSampleQuestions() {
  if (!sampleQuestionsContainer || !BRAND_CONFIG.sampleQuestions) return;

  sampleQuestionsContainer.innerHTML = "";
  sampleQuestionsContainer.classList.remove("hidden");

  BRAND_CONFIG.sampleQuestions.forEach((qText) => {
    const chipBtn = document.createElement("button");
    chipBtn.type = "button";
    chipBtn.className = "sample-question-chip";
    chipBtn.textContent = qText;

    chipBtn.addEventListener("click", () => {
      userInput.value = qText;
      userInput.focus();
      questionForm.requestSubmit();
    });

    sampleQuestionsContainer.appendChild(chipBtn);
  });
}

function hideSampleQuestions() {
  if (sampleQuestionsContainer) {
    sampleQuestionsContainer.innerHTML = "";
    sampleQuestionsContainer.classList.add("hidden");
  }
}

function applyThemePreference() {
  if (chatShell) {
    if (currentConfig.theme === "dark") {
      chatShell.classList.add("dark-theme");
    } else {
      chatShell.classList.remove("dark-theme");
    }
  }
}

function applyFontSizePreference() {
  if (chatFeed) {
    if (currentConfig.fontSize === "large") {
      chatFeed.classList.add("large-font");
    } else {
      chatFeed.classList.remove("large-font");
    }
  }
}

/* IN-FEED AGE / PATIENT CATEGORY SELECTOR */

function appendInFeedAgeSelector() {
  const existingStatus = chatFeed.querySelector(".chat-status-wrapper");
  if (existingStatus) existingStatus.remove();

  const cardDiv = document.createElement("div");
  cardDiv.className = "message bot age-prompt-wrapper";
  cardDiv.innerHTML = `
    <span class="message-sender">${BRAND_CONFIG.companyName}</span>
    <div class="age-card">
      <p class="age-card-title">Who is this visit for?</p>
      <p class="age-card-subtitle">This helps me give you the most accurate answers.</p>
      <div class="age-buttons-group">
        <button type="button" class="age-chip-btn" data-category="child">🧒 Child / Teen</button>
        <button type="button" class="age-chip-btn" data-category="adult">👤 Adult</button>
        <button type="button" class="age-chip-btn" data-category="senior">👴 Senior (65+)</button>
      </div>
    </div>
  `;

  chatFeed.appendChild(cardDiv);
  scrollToBottom();

  const buttons = cardDiv.querySelectorAll(".age-chip-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-category");
      setPatientCategory(category, cardDiv);
    });
  });
}

function getCategorySystemInstruction(category) {
  if (category === "child") {
    return "[PATIENT CONTEXT]: The user is asking about or on behalf of a Child/Teen. Keep responses warm, encouraging, simple to understand, reassuring about dental anxiety, and highlight pediatric dentistry or parent guidance.";
  } else if (category === "senior") {
    return "[PATIENT CONTEXT]: The user is a Senior (65+) or inquiring for one. Use clear, polite, structured explanations. Highlight comfortable dental options, senior care, implants, dentures, and accessibility when relevant.";
  } else if (category === "adult") {
    return "[PATIENT CONTEXT]: The user is an Adult patient. Provide efficient, clear, professional answers focusing on scheduling, insurance, and comprehensive care.";
  }
  return "";
}

function setPatientCategory(category, cardDiv) {
  currentConfig.patientCategory = category;
  saveConfig();
  syncSettingsUI();

  if (cardDiv) cardDiv.remove();
  appendCategoryStatus(category);

  conversationHistory = initializeFreshHistory();
  scrollToBottom();
}

function appendCategoryStatus(category) {
  const existing = chatFeed.querySelector(".chat-status-wrapper");
  if (existing) existing.remove();

  if (!category) return;

  let categoryLabel = "Adult";
  if (category === "child") categoryLabel = "Child / Teen";
  if (category === "senior") categoryLabel = "Senior (65+)";

  const container = document.createElement("div");
  container.className = "chat-status-wrapper";
  container.innerHTML = `
    <div class="status-line">
      <span>Tailoring for <strong>${categoryLabel}</strong></span>
      <button type="button" class="status-change-btn">Change</button>
    </div>
  `;

  chatFeed.insertBefore(container, chatFeed.children[1] || null);

  const changeBtn = container.querySelector(".status-change-btn");
  changeBtn.addEventListener("click", () => {
    currentConfig.patientCategory = "";
    saveConfig();
    syncSettingsUI();
    container.remove();
    appendInFeedAgeSelector();
  });
}

function updateInFeedCategoryStatusDisplay(category) {
  const existing = chatFeed.querySelector(".chat-status-wrapper");
  if (!category) {
    if (existing) existing.remove();
    const agePrompt = chatFeed.querySelector(".age-prompt-wrapper");
    if (!agePrompt) appendInFeedAgeSelector();
  } else {
    if (existing) {
      appendCategoryStatus(category);
    } else {
      const agePrompt = chatFeed.querySelector(".age-prompt-wrapper");
      if (agePrompt) agePrompt.remove();
      appendCategoryStatus(category);
    }
  }
}

/* TOAST POPUP HELPER WITH SMOOTH FADE */

function showToast(message) {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2000);
}

/* IN-FEED CONTACT PROMPT LOGIC */

function shouldTriggerContactPrompt(userText) {
  if (hasPromptedForContact || (currentConfig.patientName && currentConfig.patientContact)) return false;

  const lower = userText.toLowerCase();
  const isSchedulingIntent = lower.includes("schedule") || lower.includes("appointment") || lower.includes("book") || lower.includes("call me") || lower.includes("contact");

  if (isSchedulingIntent || userMessageCount >= 2) {
    hasPromptedForContact = true;
    return true;
  }
  return false;
}

function appendContactPromptCard() {
  const cardDiv = document.createElement("div");
  cardDiv.className = "message bot contact-prompt-wrapper";
  cardDiv.innerHTML = `
    <span class="message-sender">${BRAND_CONFIG.companyName}</span>
    <div class="contact-card">
      <p class="contact-card-title">Would you like our team to follow up with you?</p>
      <p class="contact-card-subtitle">Leave your phone or email and we’ll reach out during office hours.</p>
      <form class="contact-card-form">
        <input type="text" class="contact-input-name" placeholder="Your Name" required />
        <input type="text" class="contact-input-info" placeholder="Phone or Email" required />
        <button type="submit" class="contact-submit-btn">Request Follow-Up</button>
      </form>
    </div>
  `;

  chatFeed.appendChild(cardDiv);
  scrollToBottom();

  const form = cardDiv.querySelector(".contact-card-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = cardDiv.querySelector(".contact-input-name").value.trim();
    const infoInput = cardDiv.querySelector(".contact-input-info").value.trim();

    if (!nameInput || !infoInput) return;

    currentConfig.patientName = nameInput;
    currentConfig.patientContact = infoInput;
    saveConfig();
    syncSettingsUI();

    cardDiv.innerHTML = `
      <span class="message-sender">${BRAND_CONFIG.companyName}</span>
      <div class="message-bubble success-bubble">
        ✓ Thanks ${escapeHtml(nameInput)}! We've saved your info (${escapeHtml(infoInput)}). Our front desk will follow up with you soon!
      </div>
    `;

    conversationHistory.push({
      role: "system",
      content: `[PATIENT CONTACT SAVED]: Name: ${nameInput}, Contact: ${infoInput}. Acknowledge if asked.`
    });

    scrollToBottom();
  });
}

/* CHAT HISTORY DRAWER & INDIVIDUAL DELETE HELPERS */

function saveChatHistory() {
  localStorage.setItem("chatbot_saved_messages", JSON.stringify(conversationHistory));
}

function clearAllHistoryData() {
  userMessageCount = 0;
  hasPromptedForContact = false;
  currentConfig.patientCategory = "";
  currentConfig.patientName = "";
  currentConfig.patientContact = "";
  saveConfig();
  chatFeed.innerHTML = `<div class="chat-divider"><span>Today</span></div>`;
  conversationHistory = initializeFreshHistory();
  saveChatHistory();
  initFirstWelcomeMessage();
  renderSampleQuestions();
  renderHistoryList();
  showToast("Chat history cleared!");
}

function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = "";

  const saved = localStorage.getItem("chatbot_saved_messages");
  if (!saved) {
    historyList.innerHTML = `<p class="history-empty">No previous saved conversations found.</p>`;
    return;
  }

  try {
    const messages = JSON.parse(saved);
    const userMessageEntries = [];
    messages.forEach((msg, idx) => {
      if (msg.role === "user") {
        userMessageEntries.push({ index: idx, content: msg.content, timestamp: msg.timestamp || "Today" });
      }
    });

    if (userMessageEntries.length === 0) {
      historyList.innerHTML = `<p class="history-empty">No previous saved conversations found.</p>`;
      return;
    }

    userMessageEntries.forEach((entry) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "history-item";

      const textSpan = document.createElement("div");
      textSpan.className = "history-item-text";
      textSpan.textContent = entry.content;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "history-delete-btn";
      deleteBtn.title = "Delete this entry";
      deleteBtn.innerHTML = "🗑️";

      deleteBtn.addEventListener("click", () => {
        deleteSingleHistoryItem(entry.index);
      });

      itemDiv.appendChild(textSpan);
      itemDiv.appendChild(deleteBtn);
      historyList.appendChild(itemDiv);
    });
  } catch (e) {
    historyList.innerHTML = `<p class="history-empty">No previous saved conversations found.</p>`;
  }
}

function deleteSingleHistoryItem(msgIndex) {
  if (msgIndex >= 0 && msgIndex < conversationHistory.length) {
    if (conversationHistory[msgIndex + 1] && conversationHistory[msgIndex + 1].role === "assistant") {
      conversationHistory.splice(msgIndex, 2);
    } else {
      conversationHistory.splice(msgIndex, 1);
    }

    saveChatHistory();
    renderHistoryList();
    showToast("Message entry deleted");
  }
}

/* FILE ATTACHMENT HELPERS */

function handleFileSelect(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    attachedFile = {
      name: file.name,
      content: e.target.result
    };
    fileNameDisplay.textContent = file.name;
    filePreviewBar.classList.remove("hidden");
  };
  reader.readAsText(file);
}

function clearFileAttachment() {
  attachedFile = null;
  fileUploadInput.value = "";
  filePreviewBar.classList.add("hidden");
}

/* SUBMIT & API LOGIC */

async function handleSubmit(event) {
  event.preventDefault();

  const rawMessageText = userInput.value.trim();
  if (!rawMessageText && !attachedFile) return;

  hideSampleQuestions();
  userMessageCount++;

  let displayMessage = rawMessageText;
  let apiPayloadMessage = rawMessageText;

  if (attachedFile) {
    displayMessage = rawMessageText 
      ? `📄 [Attached: ${attachedFile.name}]\n\n${rawMessageText}` 
      : `📄 [Attached: ${attachedFile.name}]`;

    apiPayloadMessage = `[Attached File: ${attachedFile.name}]\n--- File Content Start ---\n${attachedFile.content}\n--- File Content End ---\n\n${rawMessageText}`;
  }

  appendUserMessage(displayMessage);
  
  userInput.value = "";
  userInput.style.height = "28px";
  clearFileAttachment();

  const timestampString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  conversationHistory.push({ role: "user", content: apiPayloadMessage, timestamp: timestampString });

  setLoadingState(true);

  const typingIndicatorElement = appendTypingIndicator();

  try {
    const botResponse = await fetchOpenAIResponse();
    typingIndicatorElement.remove();
    appendBotMessage(botResponse);
    
    conversationHistory.push({ role: "assistant", content: botResponse, timestamp: timestampString });
    saveChatHistory();

    if (shouldTriggerContactPrompt(rawMessageText)) {
      setTimeout(() => {
        appendContactPromptCard();
      }, 600);
    }
  } catch (error) {
    console.error("API Call Error:", error);
    typingIndicatorElement.remove();
    appendBotMessage('Sorry, I encountered an error retrieving a response. Please check your connection or contact our Garland office directly at <a href="tel:9722711302">(972) 271-1302</a>.');
  } finally {
    setLoadingState(false);
  }
}

async function fetchOpenAIResponse() {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_CONFIG.model,
      messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
      temperature: currentConfig.temperature
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* LOCALSTORAGE HELPERS */

function loadSavedConfig() {
  const saved = localStorage.getItem("chatbot_config");
  if (!saved) return { ...DEFAULT_CONFIG };

  try {
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  localStorage.setItem("chatbot_config", JSON.stringify(currentConfig));
}

function syncSettingsUI() {
  if (settingTheme) settingTheme.value = currentConfig.theme || "light";
  if (settingFontSize) settingFontSize.value = currentConfig.fontSize || "normal";
  if (settingPatientCategory) settingPatientCategory.value = currentConfig.patientCategory || "";
  if (settingPatientName) settingPatientName.value = currentConfig.patientName || "";
  if (settingPatientContact) settingPatientContact.value = currentConfig.patientContact || "";
  if (settingCreativity) settingCreativity.value = (currentConfig.temperature ?? 0.2).toString();
  if (settingSystemPrompt) settingSystemPrompt.value = currentConfig.systemPrompt || DEFAULT_CONFIG.systemPrompt;
}

function appendUserMessage(text, autoScroll = true) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message user";
  msgDiv.innerHTML = `
    <span class="message-sender">You</span>
    <div class="message-bubble">${escapeHtml(text)}</div>
  `;
  chatFeed.appendChild(msgDiv);
  if (autoScroll) scrollToBottom();
}

function appendBotMessage(text, autoScroll = true) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message bot";
  msgDiv.innerHTML = `
    <span class="message-sender">${BRAND_CONFIG.companyName}</span>
    <div class="message-bubble">${formatBotResponse(text)}</div>
  `;
  chatFeed.appendChild(msgDiv);
  if (autoScroll) scrollToBottom();
}

function appendTypingIndicator() {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message bot";
  msgDiv.id = "active-typing-indicator";
  msgDiv.innerHTML = `
    <span class="message-sender">${BRAND_CONFIG.companyName}</span>
    <div class="typing-indicator">
      <span class="typing-text">Thinking</span>
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatFeed.appendChild(msgDiv);
  scrollToBottom();
  return msgDiv;
}

function setLoadingState(isLoading) {
  userInput.disabled = isLoading;
  askButton.disabled = isLoading;
  if (attachFileBtn) attachFileBtn.disabled = isLoading;
}

function scrollToBottom() {
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}

function formatBotResponse(text) {
  if (text.includes("<a href=")) {
    return text.replace(/\n/g, "<br>");
  }
  return escapeHtml(text);
}