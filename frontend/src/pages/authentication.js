export function setupAuth() {
  const passwordInput = document.getElementById("password-input");
  const toggleBtn = document.querySelector(".password-toggle");

  if (!passwordInput || !toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.setAttribute("aria-pressed", String(isHidden));

    toggleBtn.querySelector(".material-icons").textContent = isHidden
      ? "visibility"
      : "visibility_off";
  });
}
