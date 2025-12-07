/* ------------------------------------------------------------------------------------------


JS TABLE OF CONTENTS:

1. Script               imports, initialize app, wiring UI and pages together
2. UI                   page navigation, sidebar set up, user profile menu behavior 
3. Welcome Page         setup UI, suggested prompt buttons, triggers chat messages
4. Chat Page            sending messages, voice input, chat history update, new chat rest
5. Chat History         loading history list, loading individual conversation into page
6. Schedule Page        calendar & courses UI setup, semester menu behavior, add & drop modals               


------------------------------------------------------------------------------------------ */



/* IMPORTING ALL JS FILES */
import { showPage, setupNavigation, setupUserMenu } from "./ui.js";
import { setupWelcomePage } from "./pages/welcome.js";
import { loadChatHistory } from "./pages/chatHistory.js";
import { sendMessage, startVoiceRecognition, addMessage, getChatHistory, getCurrentConversationId, setCurrentConversationId, setupChatInputHandlers, resetChatState, setupNewChatView } from "./pages/chat.js";
import { SchedulePage as setupSchedulePage, loadScheduleCourses } from "./pages/schedule.js";
import { setupAuth } from "./pages/authentication.js";



/* ------------------------------------------------------------------------------------------
/* INITIALIZING APP */

document.addEventListener("DOMContentLoaded", () => {

  setupAuth();

  window.showAppPage = showPage;

  setupNavigation({
    onNewChat: () => {

      resetChatState();

      setupNewChatView();
    },
    onSchedulePage: () => {
      loadScheduleCourses();
    },
  });

  setupUserMenu();

  setupSchedulePage();

  setupWelcomePage((text) => {
    sendMessage(text);
  });

  setupChatInputHandlers();

  showPage("page-welcome", "Welcome");

  loadChatHistory({
    addMessage,
    showPage,
    getChatHistory,
    getCurrentConversationId,
    setCurrentConversationId,
  });
});