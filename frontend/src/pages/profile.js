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

    console.log("Schedule data received:", data); // Debug log

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
        pill.title = `${cls.start}—${cls.end}`;
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
