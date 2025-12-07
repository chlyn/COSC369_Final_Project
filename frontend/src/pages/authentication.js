/* ------------------------------------------------------------------------------------------
/* AUTHENTICATION SETUP */

export function setupAuth() {
    const authContainer = document.getElementById("auth");
    const appContent = document.getElementById("app-content");

    const signupSection = document.getElementById("auth-signup");
    const loginSection = document.getElementById("auth-login");

    if (!authContainer || !appContent || !signupSection || !loginSection) {
        return;
    }

    // witch between signup / login sections
    function showSection(mode) {
        const isSignup = mode === "signup";

        signupSection.classList.toggle("active", isSignup);
        loginSection.classList.toggle("active", !isSignup);
    }

    // Buttons that switch between modes
    const switchButtons = authContainer.querySelectorAll("[data-switch]");
    switchButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
        const mode = btn.dataset.switch; // "signup" or "login"
        if (!mode) return;
        showSection(mode);
        });
    });

    // Show signup by default
    showSection("login");

    // Password visibility toggles (for both forms)
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

    // Handle submit: hide auth, show app content 
    function completeAuth() {
        authContainer.style.display = "none";
        appContent.classList.remove("hidden");
    }

    const createForm = document.getElementById("create-form");
    const loginForm = document.getElementById("login-form");

    if (createForm) {
        createForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // TODO: hook into real signup later
        completeAuth();
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // TODO: hook into real login later
        completeAuth();
        });
    }
}
