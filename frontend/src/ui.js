/* ------------------------------------------------------------------------------------------
/* PAGE & TOOLBAR SETUP */

export function showPage(pageId, title) {
  const topbarTitle = document.getElementById("topbar-title");
  const pages = document.querySelectorAll(".page");
  const topbar = document.querySelector(".topbar");

  // Hiding all pages by default
  pages.forEach((page) => page.classList.remove("active"));

  // Showing the chosen page
  const choosen = document.getElementById(pageId);
  if (choosen) choosen.classList.add("active");

  // Fire profile event globally when profile page appears
  if (pageId === "page-profile") {
    document.dispatchEvent(new Event("show-profile-page"));
  }

  // Hiding the top bar when on the Welcome Page
  if (topbar) {
    if (pageId === "page-welcome") {
      topbar.classList.add("hidden");
    } else {
      topbar.classList.remove("hidden");
    }
  }

  // Updating the topbar title according to chosen page
  if (title && topbarTitle) {
    topbarTitle.textContent = title;
  }
}

/* ------------------------------------------------------------------------------------------
/* SIDEBAR NAVIGATION SETUP */

export function setupNavigation({
  onNewChat,
  onSchedulePage,
  onProfilePage,
} = {}) {
  const navItems = document.querySelectorAll(".nav-item[data-page]");

  // Main navigation implementation
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.dataset.page;
      const title = btn.dataset.title || btn.innerText.trim();

      // "New Chat" logic
      if (pageId === "page-chat" && title === "New Chat") {
        if (typeof onNewChat === "function") {
          onNewChat();
        }
      }

      // Schedule page logic
      if (pageId === "page-schedule" && typeof onSchedulePage === "function") {
        onSchedulePage();
      }

      // Profile page logic
      if (pageId === "page-profile" && typeof onProfilePage === "function") {
        onProfilePage();
      }

      // Removing the active state from all nav buttons
      navItems.forEach((item) => item.classList.remove("active"));

      // Highlighting the chosen page in the nav bar
      btn.classList.add("active");

      // Navigating to the correct page
      showPage(pageId, title);
    });
  });
}

/* ------------------------------------------------------------------------------------------
/* USER PROFILE MENU SETUP */

export function setupUserMenu() {
  const profileBtn = document.getElementById("profile-btn");
  const profileMenu = document.getElementById("profile-menu");

  if (profileBtn && profileMenu) {
    // Opening and closing the menu
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle("open");
    });

    // Closing menu when clicked anywhere outside of the menu
    document.addEventListener("click", () => {
      profileMenu.classList.remove("open");
    });

    // Preventing the menu from closing after choosing a page
    profileMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Handle clicking menu items like "Profile"
  const profileMenuItems = document.querySelectorAll(
    ".profile-menu-item[data-page]"
  );

  profileMenuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageId = item.dataset.page;
      const title = item.dataset.title || item.innerText.trim();

      if (pageId) {
        showPage(pageId, title);

        if (pageId === "page-profile") {
          document.dispatchEvent(new Event("show-profile-page"));
        }
      }

      profileMenu.classList.remove("open");
    });
  });
}

/* ------------------------------------------------------------------------------------------
/* EXPORTING UI */

export const UI = {
  showPage,
  setupNavigation,
  setupUserMenu,
};
