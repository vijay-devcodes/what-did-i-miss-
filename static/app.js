/**
 * What Did I Miss? - Frontend Application Logic
 * Implements reactive state, API calls, demo loaders, real-time filters, export & copy.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // State Management
  const state = {
    demoChats: {},
    currentAnalysis: null,
    activeCategory: "all",
    searchQuery: "",
    selectedPriority: "all",
    activeTab: "paste", // "paste" or "upload"
    geminiApiKey: localStorage.getItem("what_did_i_miss_api_key") || ""
  };

  // DOM Elements
  const chatTextarea = document.getElementById("chat-textarea");
  const userNameInput = document.getElementById("user-name-input");
  const charCounter = document.getElementById("char-counter");
  const clearInputBtn = document.getElementById("clear-input-btn");
  const analyzeBtn = document.getElementById("analyze-btn");
  const engineStatusPill = document.getElementById("engine-status-pill");
  const engineStatusText = document.getElementById("engine-status-text");

  // Tab Elements
  const tabPaste = document.getElementById("tab-paste");
  const tabUpload = document.getElementById("tab-upload");
  const pasteContainer = document.getElementById("paste-container");
  const uploadContainer = document.getElementById("upload-container");
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileChosenName = document.getElementById("file-chosen-name");

  // UI States
  const emptyState = document.getElementById("empty-state");
  const loadingState = document.getElementById("loading-state");
  const resultsContainer = document.getElementById("results-container");
  const loadingStepText = document.getElementById("loading-step-text");
  const loadingProgressBar = document.getElementById("loading-progress-bar");
  const tryDemoEmptyBtn = document.getElementById("try-demo-empty-btn");

  // Stats
  const statMessages = document.getElementById("stat-messages");
  const statTasks = document.getElementById("stat-tasks");
  const statDeadlines = document.getElementById("stat-deadlines");
  const statMentions = document.getElementById("stat-mentions");
  const sentimentBadge = document.getElementById("sentiment-badge");
  const analysisModeBadge = document.getElementById("analysis-mode-badge");
  const overallSummaryText = document.getElementById("overall-summary-text");

  // Filter & Search
  const searchFilterInput = document.getElementById("search-filter-input");
  const prioritySelectFilter = document.getElementById("priority-select-filter");
  const categoryPillsContainer = document.getElementById("category-pills");
  const cardsFeed = document.getElementById("cards-feed");
  const filterEmptyState = document.getElementById("filter-empty-state");

  // Action Buttons
  const copySummaryBtn = document.getElementById("copy-summary-btn");
  const downloadTxtBtn = document.getElementById("download-txt-btn");
  const downloadJsonBtn = document.getElementById("download-json-btn");

  // Modals
  const privacyModal = document.getElementById("privacy-modal");
  const openPrivacyModalBtn = document.getElementById("open-privacy-modal-btn");
  const closePrivacyModalBtn = document.getElementById("close-privacy-modal-btn");
  const confirmPrivacyModalBtn = document.getElementById("confirm-privacy-modal-btn");

  const settingsModal = document.getElementById("settings-modal");
  const openSettingsModalBtn = document.getElementById("open-settings-modal-btn");
  const closeSettingsModalBtn = document.getElementById("close-settings-modal-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const clearApiKeyBtn = document.getElementById("clear-api-key-btn");
  const settingsApiKeyInput = document.getElementById("settings-api-key-input");

  // --- INITIALIZATION ---
  init();

  async function init() {
    setupEventListeners();
    await checkHealth();
    await loadDemoChats();

    if (state.geminiApiKey) {
      settingsApiKeyInput.value = state.geminiApiKey;
    }
  }

  // --- API CALLS ---
  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        if (data.gemini_api_configured || state.geminiApiKey) {
          engineStatusText.textContent = "AI: Gemini Live Ready";
          engineStatusPill.classList.remove("text-slate-300");
          engineStatusPill.classList.add("text-emerald-300", "border-emerald-500/30");
        } else {
          engineStatusText.textContent = "AI: Smart Offline Ready";
          engineStatusPill.classList.remove("text-slate-300");
          engineStatusPill.classList.add("text-sky-300", "border-sky-500/30");
        }
      }
    } catch {
      engineStatusText.textContent = "Server Offline";
    }
  }

  async function loadDemoChats() {
    try {
      const res = await fetch("/api/demo-chats");
      if (res.ok) {
        state.demoChats = await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch remote demo chats:", err);
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Character counter
    chatTextarea.addEventListener("input", () => {
      charCounter.textContent = `${chatTextarea.value.length} chars`;
    });

    // Clear input
    clearInputBtn.addEventListener("click", () => {
      chatTextarea.value = "";
      charCounter.textContent = "0 chars";
      fileChosenName.classList.add("hidden");
      fileChosenName.textContent = "";
      fileInput.value = "";
    });

    // Demo pills
    document.querySelectorAll(".demo-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-demo");
        loadDemo(key);
      });
    });

    tryDemoEmptyBtn.addEventListener("click", () => {
      loadDemo("hackathon_crunch");
    });

    // Tab switching
    tabPaste.addEventListener("click", () => switchTab("paste"));
    tabUpload.addEventListener("click", () => switchTab("upload"));

    // File Drag & Drop
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-indigo-500", "bg-indigo-500/10");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-indigo-500", "bg-indigo-500/10");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-indigo-500", "bg-indigo-500/10");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    });

    // Analyze CTA
    analyzeBtn.addEventListener("click", handleAnalyze);

    // Filter events
    searchFilterInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderFilteredCards();
    });

    prioritySelectFilter.addEventListener("change", (e) => {
      state.selectedPriority = e.target.value;
      renderFilteredCards();
    });

    categoryPillsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-pill");
      if (!btn) return;
      const cat = btn.getAttribute("data-cat");
      state.activeCategory = cat;

      // Update pill classes
      document.querySelectorAll(".cat-pill").forEach(p => {
        p.classList.remove("bg-indigo-600", "text-white");
        p.classList.add("bg-navy-900", "text-slate-400");
      });
      btn.classList.add("bg-indigo-600", "text-white");
      btn.classList.remove("bg-navy-900", "text-slate-400");

      renderFilteredCards();
    });

    // Copy & Export
    copySummaryBtn.addEventListener("click", copyFormattedSummary);
    downloadTxtBtn.addEventListener("click", downloadTextSummary);
    downloadJsonBtn.addEventListener("click", downloadJsonSummary);

    // Modals
    openPrivacyModalBtn.addEventListener("click", () => toggleModal(privacyModal, true));
    closePrivacyModalBtn.addEventListener("click", () => toggleModal(privacyModal, false));
    confirmPrivacyModalBtn.addEventListener("click", () => toggleModal(privacyModal, false));

    openSettingsModalBtn.addEventListener("click", () => toggleModal(settingsModal, true));
    closeSettingsModalBtn.addEventListener("click", () => toggleModal(settingsModal, false));
    saveSettingsBtn.addEventListener("click", saveSettings);
    clearApiKeyBtn.addEventListener("click", clearStoredApiKey);

    // Close modals on outside click
    [privacyModal, settingsModal].forEach(m => {
      m.addEventListener("click", (e) => {
        if (e.target === m) toggleModal(m, false);
      });
    });
  }

  // --- TAB TOGGLE ---
  function switchTab(mode) {
    state.activeTab = mode;
    if (mode === "paste") {
      tabPaste.classList.add("bg-slate-800", "text-white");
      tabPaste.classList.remove("text-slate-400");
      tabUpload.classList.remove("bg-slate-800", "text-white");
      tabUpload.classList.add("text-slate-400");
      pasteContainer.classList.remove("hidden");
      uploadContainer.classList.add("hidden");
    } else {
      tabUpload.classList.add("bg-slate-800", "text-white");
      tabUpload.classList.remove("text-slate-400");
      tabPaste.classList.remove("bg-slate-800", "text-white");
      tabPaste.classList.add("text-slate-400");
      uploadContainer.classList.remove("hidden");
      pasteContainer.classList.add("hidden");
    }
  }

  // --- DEMO LOADER ---
  function loadDemo(key) {
    const demo = state.demoChats[key];
    if (!demo) {
      showToast("Demo chat data loading...", "info");
      return;
    }

    switchTab("paste");
    chatTextarea.value = demo.content;
    userNameInput.value = demo.default_user || "Alex";
    charCounter.textContent = `${demo.content.length} chars`;

    showToast(`Loaded ${demo.title} demo chat!`, "success");
    // Scroll smoothly to chat box
    chatTextarea.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // --- FILE UPLOADER ---
  async function handleFileUpload(file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast("File is too large! Maximum allowed size is 2MB.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      showToast(`Uploading ${file.name}...`, "info");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      chatTextarea.value = data.text;
      charCounter.textContent = `${data.text.length} chars`;

      fileChosenName.textContent = `✓ Uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      fileChosenName.classList.remove("hidden");

      switchTab("paste");
      showToast("File imported into conversation box!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // --- ANALYZE HANDLER ---
  async function handleAnalyze() {
    const text = chatTextarea.value.trim();
    if (!text) {
      showToast("Please paste chat messages or select a Demo Chat first!", "warning");
      chatTextarea.focus();
      return;
    }

    const userName = userNameInput.value.trim();

    // UI Loading state
    emptyState.classList.add("hidden");
    resultsContainer.classList.add("hidden");
    loadingState.classList.remove("hidden");
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add("opacity-50", "cursor-not-allowed");

    // Animated loading messages
    const steps = [
      "Parsing conversation timestamps & speakers...",
      "Extracting actionable tasks and deadlines...",
      "Detecting urgent decisions & meetings...",
      "Synthesizing executive briefing..."
    ];
    let stepIdx = 0;
    loadingStepText.textContent = steps[0];
    loadingProgressBar.style.width = "25%";

    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      loadingStepText.textContent = steps[stepIdx];
      loadingProgressBar.style.width = `${((stepIdx + 1) / steps.length) * 100}%`;
    }, 600);

    try {
      const payload = {
        text: text,
        user_name: userName || null,
        api_key: state.geminiApiKey || null
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to analyze chat.");
      }

      const data = await res.json();
      state.currentAnalysis = data;

      displayResults(data);
      showToast("Analysis complete!", "success");
    } catch (err) {
      clearInterval(stepInterval);
      loadingState.classList.add("hidden");
      emptyState.classList.remove("hidden");
      showToast(err.message, "error");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }

  // --- DISPLAY RESULTS ---
  function displayResults(data) {
    loadingState.classList.add("hidden");
    resultsContainer.classList.remove("hidden");

    // Populate Key Metrics
    statMessages.textContent = data.stats.total_messages || 0;
    statTasks.textContent = data.tasks.length || 0;
    statDeadlines.textContent = data.deadlines.length || 0;
    statMentions.textContent = data.direct_mentions.length || 0;

    // Badges
    sentimentBadge.textContent = data.sentiment_or_vibe || "Focused";
    if (data.mode === "gemini") {
      analysisModeBadge.textContent = "Engine: Live Gemini";
      analysisModeBadge.className = "px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono";
    } else {
      analysisModeBadge.textContent = "Engine: Smart Heuristic";
      analysisModeBadge.className = "px-2.5 py-0.5 text-xs font-medium rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono";
    }

    overallSummaryText.textContent = data.overall_summary;

    // Update Category Pill Counts
    document.getElementById("count-all").textContent =
      data.announcements.length + data.tasks.length + data.deadlines.length +
      data.meetings.length + data.decisions.length + data.direct_mentions.length + data.uncertainties.length;
    document.getElementById("count-announcements").textContent = data.announcements.length;
    document.getElementById("count-tasks").textContent = data.tasks.length;
    document.getElementById("count-deadlines").textContent = data.deadlines.length;
    document.getElementById("count-meetings").textContent = data.meetings.length;
    document.getElementById("count-decisions").textContent = data.decisions.length;
    document.getElementById("count-mentions").textContent = data.direct_mentions.length;
    document.getElementById("count-uncertainties").textContent = data.uncertainties.length;

    renderFilteredCards();

    // Scroll to results on mobile
    if (window.innerWidth < 1024) {
      resultsContainer.scrollIntoView({ behavior: "smooth" });
    }
  }

  // --- RENDER FILTERED CARDS ---
  function renderFilteredCards() {
    if (!state.currentAnalysis) return;

    const data = state.currentAnalysis;
    const cat = state.activeCategory;
    const query = state.searchQuery;
    const prio = state.selectedPriority;

    cardsFeed.innerHTML = "";
    let visibleCount = 0;

    // 1. Direct Mentions Cards
    if (cat === "all" || cat === "mentions") {
      data.direct_mentions.forEach(item => {
        if (matchesFilter(item.message + " " + item.sender + " " + item.relevance, item.priority, query, prio)) {
          cardsFeed.appendChild(createMentionCard(item));
          visibleCount++;
        }
      });
    }

    // 2. Announcements Cards
    if (cat === "all" || cat === "announcements") {
      data.announcements.forEach(item => {
        if (matchesFilter(item.title + " " + item.details + " " + item.announced_by, item.importance, query, prio)) {
          cardsFeed.appendChild(createAnnouncementCard(item));
          visibleCount++;
        }
      });
    }

    // 3. Deadlines Cards
    if (cat === "all" || cat === "deadlines") {
      data.deadlines.forEach(item => {
        if (matchesFilter(item.title + " " + item.due_date + " " + item.related_to, item.urgency, query, prio)) {
          cardsFeed.appendChild(createDeadlineCard(item));
          visibleCount++;
        }
      });
    }

    // 4. Action Items Cards
    if (cat === "all" || cat === "tasks") {
      data.tasks.forEach(item => {
        if (matchesFilter(item.task + " " + item.assignee + " " + item.deadline, item.priority, query, prio)) {
          cardsFeed.appendChild(createTaskCard(item));
          visibleCount++;
        }
      });
    }

    // 5. Meetings Cards
    if (cat === "all" || cat === "meetings") {
      data.meetings.forEach(item => {
        if (matchesFilter(item.title + " " + item.date_time + " " + item.venue_or_link + " " + item.agenda, "Medium", query, prio)) {
          cardsFeed.appendChild(createMeetingCard(item));
          visibleCount++;
        }
      });
    }

    // 6. Decisions Cards
    if (cat === "all" || cat === "decisions") {
      data.decisions.forEach(item => {
        if (matchesFilter(item.decision + " " + item.context + " " + item.agreed_by, "Medium", query, prio)) {
          cardsFeed.appendChild(createDecisionCard(item));
          visibleCount++;
        }
      });
    }

    // 7. Uncertainties Cards
    if (cat === "all" || cat === "uncertainties") {
      data.uncertainties.forEach(item => {
        if (matchesFilter(item.topic + " " + item.missing_info, "Low", query, prio)) {
          cardsFeed.appendChild(createUncertaintyCard(item));
          visibleCount++;
        }
      });
    }

    // Empty filter feedback
    if (visibleCount === 0) {
      filterEmptyState.classList.remove("hidden");
    } else {
      filterEmptyState.classList.add("hidden");
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function matchesFilter(text, priority, query, selectedPrio) {
    const textMatches = !query || text.toLowerCase().includes(query);
    const prioMatches = selectedPrio === "all" || priority.toLowerCase() === selectedPrio.toLowerCase();
    return textMatches && prioMatches;
  }

  // --- CARD GENERATORS ---
  function getPriorityBadgeClass(prio) {
    if (prio === "High") return "badge-prio-high";
    if (prio === "Medium") return "badge-prio-medium";
    return "badge-prio-low";
  }

  function createMentionCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-sky-400 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">
            <i data-lucide="at-sign" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-semibold text-sky-300">Direct Mention from ${escapeHtml(item.sender)}</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${getPriorityBadgeClass(item.priority)}">
          ${item.priority} Urgency
        </span>
      </div>
      <div class="text-xs font-mono text-slate-200 bg-navy-950/70 p-2.5 rounded-lg border border-slate-800">
        "${escapeHtml(item.message)}"
      </div>
      <div class="text-[11px] text-slate-400">
        <strong class="text-slate-300">Why it matters:</strong> ${escapeHtml(item.relevance)}
      </div>
    `;
    return card;
  }

  function createAnnouncementCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-purple-500 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
            <i data-lucide="megaphone" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-bold text-white">${escapeHtml(item.title)}</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${getPriorityBadgeClass(item.importance)}">
          ${item.importance} Importance
        </span>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(item.details)}</p>
      ${item.announced_by ? `<div class="text-[11px] text-slate-500">Announced by: <span class="text-slate-300">${escapeHtml(item.announced_by)}</span></div>` : ""}
    `;
    return card;
  }

  function createDeadlineCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-amber-500 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-bold text-white">${escapeHtml(item.title)}</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full ${getPriorityBadgeClass(item.urgency)}">
          ${item.urgency} Urgency
        </span>
      </div>
      <div class="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
        <span>Due: ${escapeHtml(item.due_date)}</span>
      </div>
      ${item.related_to ? `<div class="text-[11px] text-slate-400">Context: ${escapeHtml(item.related_to)}</div>` : ""}
    `;
    return card;
  }

  function createTaskCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-emerald-500 space-y-2.5";
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" class="task-checkbox mt-0.5 rounded border-slate-700 bg-navy-900 text-indigo-600 focus:ring-0">
          <span class="task-desc text-xs font-medium text-slate-200 leading-snug">${escapeHtml(item.task)}</span>
        </label>
        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap ${getPriorityBadgeClass(item.priority)}">
          ${item.priority}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
        <div class="flex items-center gap-1 text-slate-300">
          <i data-lucide="user-check" class="w-3 h-3 text-indigo-400"></i>
          <span>Assignee: <strong>${escapeHtml(item.assignee)}</strong></span>
        </div>
        <div class="flex items-center gap-1">
          <i data-lucide="clock" class="w-3 h-3 text-slate-500"></i>
          <span>Deadline: ${escapeHtml(item.deadline)}</span>
        </div>
      </div>
    `;

    // Interactive checkbox strike
    const chk = card.querySelector(".task-checkbox");
    const desc = card.querySelector(".task-desc");
    chk.addEventListener("change", () => {
      if (chk.checked) {
        desc.classList.add("line-through", "text-slate-500");
        showToast("Task completed!", "success");
      } else {
        desc.classList.remove("line-through", "text-slate-500");
      }
    });

    return card;
  }

  function createMeetingCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-indigo-500 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-bold text-white">${escapeHtml(item.title)}</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          Meeting
        </span>
      </div>
      <div class="text-xs text-slate-300">
        <strong class="text-indigo-300">When:</strong> ${escapeHtml(item.date_time)}
      </div>
      <div class="text-xs text-slate-400">
        <strong class="text-slate-300">Location/Link:</strong> <span class="text-electric-400 underline">${escapeHtml(item.venue_or_link)}</span>
      </div>
      ${item.agenda ? `<div class="text-[11px] text-slate-400">Agenda: ${escapeHtml(item.agenda)}</div>` : ""}
    `;
    return card;
  }

  function createDecisionCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-teal-500 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">
            <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-bold text-white">Decision Reached</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
          Confirmed
        </span>
      </div>
      <p class="text-xs text-slate-200 font-medium">${escapeHtml(item.decision)}</p>
      ${item.context ? `<div class="text-[11px] text-slate-400">${escapeHtml(item.context)}</div>` : ""}
      ${item.agreed_by ? `<div class="text-[11px] text-slate-500">Agreed by: <span class="text-slate-300">${escapeHtml(item.agreed_by)}</span></div>` : ""}
    `;
    return card;
  }

  function createUncertaintyCard(item) {
    const card = document.createElement("div");
    card.className = "glass-panel p-4 rounded-xl border-l-4 border-l-rose-500 space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs">
            <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
          </span>
          <span class="text-xs font-bold text-white">${escapeHtml(item.topic)}</span>
        </div>
        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
          Unconfirmed / Missing Info
        </span>
      </div>
      <p class="text-xs text-slate-300">${escapeHtml(item.missing_info)}</p>
    `;
    return card;
  }

  // --- COPY & EXPORT ---
  function generateFormattedMarkdown() {
    if (!state.currentAnalysis) return "";
    const d = state.currentAnalysis;

    let md = `# What Did I Miss? — Executive Briefing\n\n`;
    md += `**Overview:** ${d.overall_summary}\n\n`;
    md += `**Team Tone:** ${d.sentiment_or_vibe}\n\n`;

    if (d.direct_mentions.length > 0) {
      md += `## 🎯 Direct Mentions\n`;
      d.direct_mentions.forEach(m => {
        md += `- **From ${m.sender}** [${m.priority}]: "${m.message}" (${m.relevance})\n`;
      });
      md += `\n`;
    }

    if (d.announcements.length > 0) {
      md += `## 🔥 Announcements\n`;
      d.announcements.forEach(a => {
        md += `- **${a.title}** [${a.importance}]: ${a.details}\n`;
      });
      md += `\n`;
    }

    if (d.deadlines.length > 0) {
      md += `## ⏰ Strict Deadlines\n`;
      d.deadlines.forEach(dl => {
        md += `- **${dl.title}**: Due ${dl.due_date} [${dl.urgency}]\n`;
      });
      md += `\n`;
    }

    if (d.tasks.length > 0) {
      md += `## ✅ Action Items & Tasks\n`;
      d.tasks.forEach(t => {
        md += `- [ ] **${t.task}** | Assignee: ${t.assignee} | Due: ${t.deadline} [${t.priority}]\n`;
      });
      md += `\n`;
    }

    if (d.meetings.length > 0) {
      md += `## 📅 Scheduled Meetings\n`;
      d.meetings.forEach(m => {
        md += `- **${m.title}**: ${m.date_time} at ${m.venue_or_link}\n`;
      });
      md += `\n`;
    }

    if (d.decisions.length > 0) {
      md += `## ⚖️ Decisions Made\n`;
      d.decisions.forEach(dec => {
        md += `- **Decision**: ${dec.decision} (${dec.context})\n`;
      });
      md += `\n`;
    }

    if (d.uncertainties.length > 0) {
      md += `## ❓ Missing / Unconfirmed Information\n`;
      d.uncertainties.forEach(u => {
        md += `- **${u.topic}**: ${u.missing_info}\n`;
      });
      md += `\n`;
    }

    md += `---\n*Generated by "What Did I Miss?" • Strict Truth-in-AI Guarantee*\n`;
    return md;
  }

  async function copyFormattedSummary() {
    const text = generateFormattedMarkdown();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Briefing copied to clipboard as Markdown!", "success");
    } catch {
      showToast("Unable to copy to clipboard", "error");
    }
  }

  function downloadTextSummary() {
    const text = generateFormattedMarkdown();
    if (!text) return;
    downloadFile("what-did-i-miss-summary.txt", text, "text/plain");
    showToast("Downloaded summary as .txt!", "success");
  }

  function downloadJsonSummary() {
    if (!state.currentAnalysis) return;
    const jsonStr = JSON.stringify(state.currentAnalysis, null, 2);
    downloadFile("what-did-i-miss-analysis.json", jsonStr, "application/json");
    showToast("Exported analysis as JSON!", "success");
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- MODALS & SETTINGS ---
  function toggleModal(modal, show) {
    if (show) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    } else {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  function saveSettings() {
    const key = settingsApiKeyInput.value.trim();
    if (key) {
      state.geminiApiKey = key;
      localStorage.setItem("what_did_i_miss_api_key", key);
      showToast("Gemini API key saved to browser storage!", "success");
      engineStatusText.textContent = "AI: Gemini Live Ready";
      engineStatusPill.classList.remove("text-sky-300");
      engineStatusPill.classList.add("text-emerald-300", "border-emerald-500/30");
    } else {
      clearStoredApiKey();
    }
    toggleModal(settingsModal, false);
  }

  function clearStoredApiKey() {
    state.geminiApiKey = "";
    localStorage.removeItem("what_did_i_miss_api_key");
    settingsApiKeyInput.value = "";
    showToast("Cleared stored API key. Using Smart Offline Engine.", "info");
    checkHealth();
  }

  // --- UTILITIES ---
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");

    let borderClass = "border-slate-700";
    let icon = "info";
    let textClass = "text-slate-200";

    if (type === "success") {
      borderClass = "border-emerald-500/40 text-emerald-300";
      icon = "check-circle";
    } else if (type === "warning") {
      borderClass = "border-amber-500/40 text-amber-300";
      icon = "alert-circle";
    } else if (type === "error") {
      borderClass = "border-rose-500/40 text-rose-300";
      icon = "alert-triangle";
    }

    toast.className = `toast-enter pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-navy-900/90 backdrop-blur-md border ${borderClass} shadow-xl text-xs`;
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
