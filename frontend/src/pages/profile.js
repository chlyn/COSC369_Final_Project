import { getCurrentUser } from "./authentication.js";

export function setupProfilePage() {
  // Load profile info whenever profile page becomes visible
  document.addEventListener("show-profile-page", loadProfilePage);
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

  // Student ID (if your schema adds one later)
  document.getElementById("profile-student-id").textContent =
    user.studentId || "N/A";

  // Major, Minor
  document.getElementById("profile-major").textContent = "Computer Science";
  document.getElementById("profile-minor").textContent = "N/A";

  loadUserSchedule(user.id);
}

async function loadUserSchedule(userId) {
  try {
    const res = await fetch(
      `http://localhost:3001/api/schedule?userId=${userId}`
    );
    const data = await res.json();

    const container = document.getElementById("profile-classes");
    container.innerHTML = "";

    if (!data.classes || data.classes.length === 0) {
      container.innerHTML = "<span class='profile-pill'>No classes yet</span>";
      return;
    }

    data.classes.forEach((cls) => {
      const pill = document.createElement("span");
      pill.className = "profile-pill";
      pill.textContent = cls;
      container.appendChild(pill);
    });
  } catch (err) {
    console.error("Failed to load schedule:", err);
  }
}
