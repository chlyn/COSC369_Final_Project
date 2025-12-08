import { getCurrentUser, getCurrentUserPassword } from "./authentication.js";

let currentEditField = null;

export function setupProfilePage() {
  // Load profile info whenever profile page becomes visible
  document.addEventListener("show-profile-page", loadProfilePage);

  // Setup password toggle
  setupPasswordToggle();

  // Setup edit modal
  setupEditModal();
}

function setupPasswordToggle() {
  const toggleBtn = document.querySelector(
    "#page-profile .profile-password-toggle"
  );
  const passwordValue = document.getElementById("profile-password");

  if (!toggleBtn || !passwordValue) return;

  toggleBtn.addEventListener("click", () => {
    const icon = toggleBtn.querySelector(".material-icons");
    const isCurrentlyHidden = icon.textContent === "visibility_off";

    if (isCurrentlyHidden) {
      // Show password from sessionStorage
      const password = getCurrentUserPassword();
      if (password) {
        passwordValue.textContent = password;
      } else {
        passwordValue.textContent = "Not available";
      }
      toggleBtn.setAttribute("aria-pressed", "true");
      icon.textContent = "visibility";
    } else {
      // Hide password
      passwordValue.textContent = "********";
      toggleBtn.setAttribute("aria-pressed", "false");
      icon.textContent = "visibility_off";
    }
  });
}

function loadProfilePage() {
  console.log("PROFILE PAGE LOADED");

  const user = getCurrentUser();
  if (!user) return;

  // Name + Email
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;

  // Avatar initials
  const initials = user.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  document.getElementById("profile-avatar").textContent = initials;

  // Student ID
  document.getElementById("profile-student-id").textContent =
    user.studentId || "N/A";

  // Password - keep hidden by default
  const passwordValue = document.getElementById("profile-password");
  if (passwordValue) {
    passwordValue.textContent = "********";
  }

  // Major, Minor - load from user object
  document.getElementById("profile-major").textContent = user.major || "N/A";
  document.getElementById("profile-minor").textContent = user.minor || "N/A";

  loadUserSchedule(user.id);
}

function setupEditModal() {
  const modal = document.getElementById("edit-profile-modal");
  const closeBtn = document.getElementById("edit-profile-close");
  const cancelBtn = document.getElementById("edit-profile-cancel");
  const form = document.getElementById("edit-profile-form");
  const input = document.getElementById("edit-profile-input");
  const label = document.getElementById("edit-profile-label");
  const title = document.getElementById("edit-profile-title");

  if (!modal) return;

  // Open modal when edit buttons are clicked
  const editButtons = document.querySelectorAll(
    "#page-profile .profile-edit-btn"
  );
  editButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.edit;
      openEditModal(field);
    });
  });

  function openEditModal(field) {
    currentEditField = field;
    const user = getCurrentUser();
    if (!user) return;

    // Set modal title and label based on field
    const fieldNames = {
      name: "Name",
      email: "Email",
      major: "Major",
      minor: "Minor",
      password: "Password",
    };

    const fieldName = fieldNames[field] || "Field";
    title.textContent = `Edit ${fieldName}`;
    label.textContent = fieldName;

    // Pre-fill current value
    let currentValue = "";
    if (field === "name") {
      currentValue = user.name || "";
      input.type = "text";
      input.placeholder = "";
    } else if (field === "email") {
      currentValue = user.email || "";
      input.type = "text";
      input.placeholder = "";
    } else if (field === "major") {
      currentValue = document.getElementById("profile-major").textContent;
      if (currentValue === "N/A") currentValue = "";
      input.type = "text";
      input.placeholder = "";
    } else if (field === "minor") {
      currentValue = document.getElementById("profile-minor").textContent;
      if (currentValue === "N/A") currentValue = "";
      input.type = "text";
      input.placeholder = "";
    } else if (field === "password") {
      // Don't pre-fill password, leave blank for new password
      currentValue = "";
      input.type = "password";
      input.placeholder = "Enter new password";
    }

    input.value = currentValue;
    modal.classList.remove("modal-hidden");

    // Focus input
    setTimeout(() => input.focus(), 100);
  }

  function closeEditModal() {
    modal.classList.add("modal-hidden");
    form.reset();
    input.type = "text"; // Reset to text type
    input.placeholder = "";
    currentEditField = null;
  }

  // Close handlers
  if (closeBtn) {
    closeBtn.addEventListener("click", closeEditModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeEditModal);
  }

  // Click backdrop to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-backdrop")) {
      closeEditModal();
    }
  });

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newValue = input.value.trim();
    if (!newValue) return;

    const user = getCurrentUser();
    if (!user) return;

    // Update based on field
    if (currentEditField === "name") {
      try {
        const res = await fetch("http://localhost:3001/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, name: newValue }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to update name");
          return;
        }

        // Update local storage
        user.name = newValue;
        localStorage.setItem("currentUser", JSON.stringify(user));

        // Update UI
        document.getElementById("profile-name").textContent = newValue;

        // Update avatar initials
        const initials = newValue
          .split(" ")
          .map((x) => x[0])
          .join("")
          .toUpperCase();
        document.getElementById("profile-avatar").textContent = initials;

        // Update sidebar
        const profileName = document.querySelector(
          ".profile-btn .profile-name"
        );
        if (profileName) profileName.textContent = newValue;

        const profileImg = document.querySelector(".profile-btn .profile-img");
        if (profileImg) profileImg.textContent = initials;

        // Update welcome page
        const welcomeName = document.querySelector(
          "#page-welcome .welcome-text .text_1"
        );
        if (welcomeName) {
          const firstName = newValue.split(" ")[0] || "there";
          welcomeName.textContent = `Hello, ${firstName}!`;
        }
      } catch (err) {
        console.error("Error updating name:", err);
        alert("Failed to update name");
        return;
      }
    } else if (currentEditField === "email") {
      try {
        const res = await fetch("http://localhost:3001/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, email: newValue }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to update email");
          return;
        }

        // Update local storage
        user.email = newValue;
        localStorage.setItem("currentUser", JSON.stringify(user));

        // Update UI
        document.getElementById("profile-email").textContent = newValue;

        // Update sidebar username
        const profileUsername = document.querySelector(
          ".profile-btn .profile-username"
        );
        if (profileUsername) {
          const username = newValue.includes("@")
            ? newValue.split("@")[0]
            : "student";
          profileUsername.textContent = username;
        }
      } catch (err) {
        console.error("Error updating email:", err);
        alert("Failed to update email");
        return;
      }
    } else if (currentEditField === "major" || currentEditField === "minor") {
      try {
        const updateData = { userId: user.id };
        updateData[currentEditField] = newValue;

        const res = await fetch("http://localhost:3001/api/user/academic", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || `Failed to update ${currentEditField}`);
          return;
        }

        // Update local storage
        user[currentEditField] = newValue;
        localStorage.setItem("currentUser", JSON.stringify(user));

        // Update UI
        if (currentEditField === "major") {
          document.getElementById("profile-major").textContent = newValue;
        } else {
          document.getElementById("profile-minor").textContent = newValue;
        }
      } catch (err) {
        console.error(`Error updating ${currentEditField}:`, err);
        alert(`Failed to update ${currentEditField}`);
        return;
      }
    } else if (currentEditField === "password") {
      try {
        const res = await fetch("http://localhost:3001/api/user/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, password: newValue }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to update password");
          return;
        }

        // Update sessionStorage with new password
        sessionStorage.setItem("userPasswordSession", newValue);

        alert("Password updated successfully!");
      } catch (err) {
        console.error("Error updating password:", err);
        alert("Failed to update password");
        return;
      }
    }

    closeEditModal();
  });
}

async function loadUserSchedule(userId) {
  try {
    const res = await fetch(
      `http://localhost:3001/api/schedule?userId=${userId}`
    );
    const data = await res.json();

    console.log("Schedule data received:", data);

    const container = document.getElementById("profile-classes");
    container.innerHTML = "";

    if (!data.classes || data.classes.length === 0) {
      container.innerHTML = "<span class='profile-pill'>No classes yet</span>";
      return;
    }

    data.classes.forEach((cls) => {
      // Handle case where cls might be an object or already a string
      if (typeof cls === "string") {
        console.warn("Class item is a string, not an object:", cls);
        const pill = document.createElement("span");
        pill.className = "profile-pill";
        pill.textContent = cls;
        container.appendChild(pill);
        return;
      }

      const pill = document.createElement("span");
      pill.className = "profile-pill";

      // Try multiple possible property names for course code and name
      const code = cls.id || cls.code || cls.courseId || cls.courseCode || "";
      const name = cls.name || cls.title || cls.courseName || "";

      if (code && name) {
        pill.textContent = `${code} — ${name}`;
      } else if (code || name) {
        pill.textContent = code || name;
      } else {
        // If no recognizable properties, show all available properties
        console.warn("Unknown class structure:", cls);
        pill.textContent = JSON.stringify(cls);
      }

      // Build tooltip details
      const details = [];
      if (cls.professor || cls.instructor || cls.teacher) {
        details.push(cls.professor || cls.instructor || cls.teacher);
      }
      if (Array.isArray(cls.days) && cls.days.length) {
        details.push(cls.days.join(", "));
      } else if (typeof cls.days === "string" && cls.days) {
        details.push(cls.days);
      }
      if (cls.start && cls.end) {
        details.push(`${cls.start}—${cls.end}`);
      } else if (cls.time || cls.schedule) {
        details.push(cls.time || cls.schedule);
      }

      if (details.length > 0) {
        pill.title = details.join(" • ");
      }

      container.appendChild(pill);
    });
  } catch (err) {
    console.error("Failed to load schedule:", err);
    const container = document.getElementById("profile-classes");
    container.innerHTML =
      "<span class='profile-pill' style='color: #d00;'>Failed to load classes</span>";
  }
}
