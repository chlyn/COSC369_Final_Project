const CHAT_HISTORY = [];
let CURRENT_CONVERSATION_ID = null;

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------------------------
  // PAGE NAVIGATION & TOPBAR

  const topbarTitle = document.getElementById("topbar-title");
  const pages = document.querySelectorAll(".page");
  const navItems = document.querySelectorAll(".nav-item[data-page]");

  function showPage(pageId, title) {
    // Hiding all pages by default
    pages.forEach((page) => page.classList.remove("active"));

    // Showing the choosen page
    const choosen = document.getElementById(pageId);
    if (choosen) choosen.classList.add("active");

    // Hiding the top bar when on the welcome page
    const topbar = document.querySelector(".topbar");
    if (pageId === "page-welcome") {
      topbar.classList.add("hidden");
    } else {
      topbar.classList.remove("hidden");
    }

    // Updating the topbar title according to choosen page
    if (title && topbarTitle) {
      topbarTitle.textContent = title;
    }
  }

  window.showAppPage = showPage;

  // Navigation button (New Chat and Schedule)
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.dataset.page;
      const title = btn.dataset.title || btn.innerText.trim();

      // If user clicks "New Chat", reset conversation + history
      if (pageId === "page-chat" && title === "New Chat") {
        CURRENT_CONVERSATION_ID = null;
        CHAT_HISTORY.length = 0;

        const container = document.getElementById("chat-messages");
        if (container) {
          container.innerHTML = "";
        }
      }

      // Updating active css style
      navItems.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      // Showing the correct page
      showPage(pageId, title);
    });
  });

  // ------------------------------------------------------------------------------
  // USER PROFILE MENU

  const profileBtn = document.getElementById("profile-btn");
  const profileMenu = document.getElementById("profile-menu");
  const profileMenuItems = document.querySelectorAll(
    ".profile-menu-item[data-page]"
  );

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle("open");
    });

    // Close when clicking outside
    document.addEventListener("click", () => {
      profileMenu.classList.remove("open");
    });

    profileMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Profile menu navigating to pages (e.g., Profile)
  profileMenuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageId = item.dataset.page;
      const title = item.dataset.title || item.innerText.trim();

      if (pageId) {
        showPage(pageId, title);

        navItems.forEach((n) => n.classList.remove("active"));

        const navMatch = document.querySelector(
          `.nav-item[data-page="${pageId}"]`
        );
        if (navMatch) {
          navMatch.classList.add("active");
        }
      }

      profileMenu.classList.remove("open");
    });
  });

  // ------------------------------------------------------------------------------
  // SEMESTER MENU

  const semesterBtn = document.getElementById("semester-btn");
  const semesterMenu = document.getElementById("semester-menu");
  const semesterItems = document.querySelectorAll(".semester-menu-item");
  const semesterBtnLabel = semesterBtn
    ? semesterBtn.querySelector("span")
    : null;
  const CURRENT_SEMESTER = "Fall 2025";

  // (B) Initialize active semester on load
  if (semesterBtn && semesterBtnLabel && semesterItems.length > 0) {
    // Try to find matching menu item
    let activeItem = Array.from(semesterItems).find(
      (item) => item.textContent.trim() === CURRENT_SEMESTER
    );

    // Fallback: if not found, use the first option
    if (!activeItem) activeItem = semesterItems[0];

    // Set button label
    semesterBtnLabel.textContent = activeItem.textContent.trim();

    // Mark as active
    activeItem.classList.add("active");
  }

  // Toggle menu open/close
  if (semesterBtn && semesterMenu) {
    semesterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      semesterMenu.style.display =
        semesterMenu.style.display === "flex" ? "none" : "flex";
    });

    // Clicking outside closes it
    document.addEventListener("click", () => {
      semesterMenu.style.display = "none";
    });

    // Prevent menu from closing when clicking inside
    semesterMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // When selecting a semester
  semesterItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();

      const label = item.textContent.trim();

      // Update button text
      if (semesterBtnLabel) {
        semesterBtnLabel.textContent = label;
      }

      // Update active state in the menu
      semesterItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      console.log("Selected semester:", label);
    });
  });

  // ------------------------------------------------------------------------------
  // WELCOME PAGE

  // Suggested tasks on welcome page
  const suggestedTasks = [
    { text: "Show my weekly schedule", icon: "event" },
    { text: "Add a new class", icon: "add" },
    { text: "Drop a class", icon: "remove" },
    { text: "Recommend classes", icon: "auto_awesome" },
  ];

  const welcomePage = document.getElementById("page-welcome");

  if (welcomePage) {
    const container = document.getElementById("suggested-prompts");
    container.innerHTML = "";

    suggestedTasks.forEach((task) => {
      const btn = document.createElement("button");
      btn.classList.add("suggested-btn");

      btn.innerHTML = `
                <div class="icon-box">
                    <span class="material-icons">${task.icon}</span>
                </div>
                <span>${task.text}</span>
            `;

      btn.addEventListener("click", () => {
        sendMessage(task.text);
      });

      container.appendChild(btn);
    });
  }

  // ------------------------------------------------------------------------------
  // WIRING CHAT INPUTS

  document.querySelectorAll(".chat-input input").forEach((input) => {
    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  });

  // Send button
  document.querySelectorAll(".chat-input .send").forEach((btn) => {
    btn.addEventListener("click", sendMessage);
  });

  // Mic button
  document.querySelectorAll(".chat-input .mic").forEach((btn) => {
    btn.addEventListener("click", startVoiceRecognition);
  });

  generateCalendar();
  showPage("page-welcome", "Welcome");

  // Load chat history into sidebar
  loadChatHistory();
});

// ------------------------------------------------------------------------------
// Getting the text input from the active page

function getActiveInput() {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return null;
  return activePage.querySelector(".chat-input input");
}

// ------------------------------------------------------------------------------
// VOICE RECOGNITION

function startVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    alert(
      "Your browser does not support speech recognition. Please use Google Chrome."
    );
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    const input = getActiveInput();
    if (input) input.value = transcript;
  };

  recognition.start();
}

// ------------------------------------------------------------------------------
// SEND MESSAGE

async function sendMessage(text) {
  const activePage = document.querySelector(".page.active");
  const isWelcome = activePage && activePage.id === "page-welcome";

  // 1) Decide what text we’re sending
  let input = getActiveInput();
  let message = text != null ? text : input ? input.value.trim() : "";

  if (!message) return;

  // 2) If we're on the welcome page, switch to chat page first
  if (isWelcome && window.showAppPage) {
    // update nav active state to Chat
    const navItems = document.querySelectorAll(".nav-item[data-page]");
    const chatNav = document.querySelector('.nav-item[data-page="page-chat"]');
    navItems.forEach((item) => item.classList.remove("active"));
    if (chatNav) chatNav.classList.add("active");

    // switch page (title "New Chat" from your HTML data-title)
    window.showAppPage("page-chat", "New Chat");

    // after switching, use the chat page input as the "active" input
    input = document.querySelector("#page-chat .chat-input input");
  }

  // 3) Clear whichever input we're using
  if (input) input.value = "";

  // 4) Add user message to chat + history
  addMessage(message, "user");

  // 5) Show a temporary "Thinking..." bubble
  const container = document.getElementById("chat-messages");
  const thinkingBubble = document.createElement("div");
  thinkingBubble.classList.add("chat-message", "bot");
  thinkingBubble.textContent = "Thinking...";
  container.appendChild(thinkingBubble);
  container.scrollTop = container.scrollHeight;

  // 6) Call your Express + Gemini backend
  try {
    const res = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: CHAT_HISTORY,
        conversationId: CURRENT_CONVERSATION_ID,
      }),
    });

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await res.json();
    const reply = data.reply || "Sorry, I couldn't generate a response.";

    // update conversation id once backend sends it
    if (data.conversationId) {
      CURRENT_CONVERSATION_ID = data.conversationId;
    }

    thinkingBubble.innerHTML = reply;

    // Store bot reply in history
    CHAT_HISTORY.push({
      role: "assistant",
      content: reply,
    });
  } catch (err) {
    console.error("Chat error:", err);
    thinkingBubble.textContent = "Error: I couldn't reach the AI server.";
  }

  // Refresh sidebar chat list
  loadChatHistory();
}

function addMessage(text, sender = "user") {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.classList.add("chat-message", sender);
  bubble.innerHTML = text;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;

  // store in history for the backend
  CHAT_HISTORY.push({
    role: sender === "user" ? "user" : "assistant",
    content: text,
  });
}

function generateCalendar() {
  const container = document.getElementById("calendar-grid");

  if (!container) return;

  // Days of week
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // TIMES — 7:00 AM → 11:00 PM
  const times = [];
  for (let hour = 7; hour <= 23; hour++) {
    let suffix = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12 || 12;
    times.push(`${displayHour}:00 ${suffix}`);
  }

  // Build header row
  let headerHTML = `
        <div class="calendar-header">
            <div class="corner-cell"></div>
            ${days.map((day) => `<div class="day-cell">${day}</div>`).join("")}
        </div>
    `;

  // Build time rows
  let rowsHTML = times
    .map((time) => {
      return `
                <div class="time-row">
                    <div class="time-cell">${time}</div>
                    ${days
                      .map(
                        (day) =>
                          `<div class="slot-cell" data-day="${day.toLowerCase()}" data-time="${time}"></div>`
                      )
                      .join("")}
                </div>
            `;
    })
    .join("");

  container.innerHTML = headerHTML + rowsHTML;
}

// ------------------------------------------------------------------------------
// CHAT HISTORY: load list + load a specific conversation
// ------------------------------------------------------------------------------

async function loadChatHistory() {
  const list = document.querySelector(".chat-history-list");
  if (!list) return;

  try {
    const res = await fetch("http://localhost:3001/api/conversations");
    if (!res.ok) throw new Error("Failed to fetch conversations");

    const conversations = await res.json();

    // Clear previous items
    list.innerHTML = "";

    if (!conversations.length) {
      const empty = document.createElement("div");
      empty.textContent = "No conversations yet";
      empty.classList.add("empty-history");
      list.appendChild(empty);
      return;
    }

    conversations.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.classList.add("nav-item", "history-item");
      btn.textContent = c.title || "Untitled chat";
      btn.dataset.id = c.id;

      btn.addEventListener("click", () => {
        // highlight selected history item
        document
          .querySelectorAll(".history-item")
          .forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");

        loadConversation(c.id, c.title);
      });

      list.appendChild(btn);
    });
  } catch (err) {
    console.error("loadChatHistory error:", err);
  }
}

async function loadConversation(conversationId, title) {
  try {
    const res = await fetch(
      `http://localhost:3001/api/conversations/${conversationId}`
    );
    if (!res.ok) throw new Error("Failed to fetch conversation");

    const convo = await res.json();

    // Set the current conversation id
    CURRENT_CONVERSATION_ID = convo.id;

    // Clear in-memory history and UI
    CHAT_HISTORY.length = 0;

    const container = document.getElementById("chat-messages");
    if (container) container.innerHTML = "";

    // Make sure we are on the Chat page
    if (window.showAppPage) {
      window.showAppPage("page-chat", title || "Chat");

      // Update nav active state
      const navItems = document.querySelectorAll(".nav-item[data-page]");
      navItems.forEach((item) => item.classList.remove("active"));
      const chatNav = document.querySelector(
        '.nav-item[data-page="page-chat"]'
      );
      if (chatNav) chatNav.classList.add("active");
    }

    // Rebuild UI + CHAT_HISTORY from stored messages
    (convo.messages || []).forEach((m) => {
      const sender = m.role === "assistant" ? "bot" : "user";
      addMessage(m.content, sender);
    });
  } catch (err) {
    console.error("loadConversation error:", err);
  }
}
