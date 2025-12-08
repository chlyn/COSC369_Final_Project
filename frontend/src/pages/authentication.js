/* ------------------------------------------------------------------------------------------
/* SIMPLE CLIENT-SIDE AUTH STATE
------------------------------------------------------------------------------------------ */

const STORAGE_KEY = "currentUser";
const PASSWORD_SESSION_KEY = "userPasswordSession";

export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw).id || null;
  } catch {
    return null;
  }
}

export function getCurrentUserPassword() {
  // Get password from sessionStorage (only available during current session)
  return sessionStorage.getItem(PASSWORD_SESSION_KEY);
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

function setSessionPassword(password) {
  if (!password) {
    sessionStorage.removeItem(PASSWORD_SESSION_KEY);
  } else {
    sessionStorage.setItem(PASSWORD_SESSION_KEY, password);
  }
}

function applyUserToUI(user) {
  if (!user) return;

  const name = user.name || "User";
  const email = user.email || "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join("");

  const profileImg = document.querySelector(".profile-btn .profile-img");
  const profileName = document.querySelector(".profile-btn .profile-name");
  const profileUsername = document.querySelector(
    ".profile-btn .profile-username"
  );

  if (profileImg) profileImg.textContent = initials;
  if (profileName) profileName.textContent = name;
  if (profileUsername) {
    const username =
      email && email.includes("@") ? email.split("@")[0] : "student";
    profileUsername.textContent = username;
  }

  const welcomeName = document.querySelector(
    "#page-welcome .welcome-text .text_1"
  );
  if (welcomeName) {
    const firstName = name.split(" ")[0] || "there";
    welcomeName.textContent = `Hello, ${firstName}!`;
  }
}

export function logout() {
  // Clear stored user and password
  setCurrentUser(null);
  setSessionPassword(null);

  // Flip UI back to auth
  const authContainer = document.getElementById("auth");
  const appContent = document.getElementById("app-content");

  if (authContainer) authContainer.style.display = "flex";
  if (appContent) appContent.classList.add("hidden");

  // Close profile dropdown if it's open
  const profileMenu = document.getElementById("profile-menu");
  if (profileMenu) profileMenu.classList.remove("open");
}

/* ------------------------------------------------------------------------------------------
/* AUTHENTICATION SETUP
------------------------------------------------------------------------------------------ */

function showError(errorId, message) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;

  const textEl = errorEl.querySelector(".auth-error-text");
  if (textEl) textEl.textContent = message;

  errorEl.classList.remove("hidden");
}

function hideError(errorId) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;
  errorEl.classList.add("hidden");
}

export function setupAuth(onAuthComplete) {
  const authContainer = document.getElementById("auth");
  const appContent = document.getElementById("app-content");

  const signupSection = document.getElementById("auth-signup");
  const loginSection = document.getElementById("auth-login");

  if (!authContainer || !appContent || !signupSection || !loginSection) {
    return;
  }

  // HOOK SIGN OUT BUTTON (this menu is in the sidebar)
  const signOutBtn = document.querySelector(
    "#profile-menu .profile-menu-item:last-child"
  );
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      logout();
    });
  }

  const existing = getCurrentUser();
  // If we already have a stored user, skip auth screens
  if (existing) {
    applyUserToUI(existing);
    authContainer.style.display = "none";
    appContent.classList.remove("hidden");

    if (typeof onAuthComplete === "function") {
      onAuthComplete(existing);
    }
    return;
  }

  function showSection(mode) {
    const isSignup = mode === "signup";
    signupSection.classList.toggle("active", isSignup);
    loginSection.classList.toggle("active", !isSignup);
  }

  const switchButtons = authContainer.querySelectorAll("[data-switch]");
  switchButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.switch; // "signup" or "login"
      if (!mode) return;
      showSection(mode);
      // Clear errors when switching forms
      hideError("login-error");
      hideError("signup-error");
    });
  });

  // Show login by default
  showSection("login");

  // Password visibility toggles
  const passwordWrappers = authContainer.querySelectorAll(".password-field");

  passwordWrappers.forEach((wrapper) => {
    const input = wrapper.querySelector(".password-input");
    const toggleBtn = wrapper.querySelector(".password-toggle");

    if (!input || !toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      const newType = isHidden ? "text" : "password";

      input.type = newType;
      const isNowVisible = newType === "text";

      toggleBtn.setAttribute("aria-pressed", String(isNowVisible));
      toggleBtn.querySelector(".material-icons").textContent = isNowVisible
        ? "visibility"
        : "visibility_off";
    });
  });

  function completeAuth(user, password) {
    if (user) {
      setCurrentUser(user);
      applyUserToUI(user);
      // Store password in sessionStorage for this session only
      if (password) {
        setSessionPassword(password);
      }
    }
    authContainer.style.display = "none";
    appContent.classList.remove("hidden");

    // normal login / signup
    if (typeof onAuthComplete === "function") {
      onAuthComplete(user);
    }
  }

  // SIGN UP
  const createForm = signupSection.querySelector("#create-form");
  if (createForm) {
    const firstNameInput = signupSection.querySelector(
      ".name-field .form-label:nth-child(1) input"
    );
    const lastNameInput = signupSection.querySelector(
      ".name-field .form-label:nth-child(2) input"
    );
    const emailInput = signupSection.querySelector('input[type="email"]');
    const passwordInput = signupSection.querySelector("#signup-password");

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput)
        return;

      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!firstName || !lastName || !email || !password) return;

      // Clear any previous errors
      hideError("signup-error");

      try {
        const res = await fetch("http://localhost:3001/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          showError("signup-error", data.error || "Failed to create account.");
          return;
        }

        completeAuth(data.user, password);
      } catch (err) {
        console.error("Signup error:", err);
        showError(
          "signup-error",
          "Sorry, something went wrong creating your account."
        );
      }
    });
  }

  // LOGIN
  const loginForm = loginSection.querySelector("#login-form");
  if (loginForm) {
    const loginEmail = loginSection.querySelector('input[type="email"]');
    const loginPassword = loginSection.querySelector("#login-password");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginEmail || !loginPassword) return;

      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      if (!email || !password) return;

      // Clear any previous errors
      hideError("login-error");

      try {
        const res = await fetch("http://localhost:3001/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          showError("login-error", data.error || "Invalid email or password.");
          return;
        }

        completeAuth(data.user, password);
      } catch (err) {
        console.error("Login error:", err);
        showError("login-error", "Sorry, something went wrong logging you in.");
      }
    });
  }
}
