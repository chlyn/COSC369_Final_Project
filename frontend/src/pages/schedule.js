/* ------------------------------------------------------------------------------------------
/* SEMESTER MENU UI SETUP */

export function setupSemesterMenuUI() {

    const semesterBtn = document.getElementById("semester-btn");
    const semesterMenu = document.getElementById("semester-menu");
    const semesterItems = document.querySelectorAll(".semester-menu-item");
    const semesterBtnLabel = semesterBtn
        ? semesterBtn.querySelector("span")
        : null;
    const CURRENT_SEMESTER = "Fall 2025";

    // Initializing current semester
    if (semesterBtn && semesterBtnLabel && semesterItems.length > 0) {
        
        // Finding current semester in the menu
        let activeItem = Array.from(semesterItems).find(
            item => item.textContent.trim() === CURRENT_SEMESTER
        );

        // If current semester not found, use the first option as a default
        if (!activeItem) activeItem = semesterItems[0];

        // Setting the button label to the active semester text
        semesterBtnLabel.textContent = activeItem.textContent.trim();

        // Marking that semester option as active
        activeItem.classList.add("active");

    }

    // Menu open and close implementation
    if (semesterBtn && semesterMenu) {

        semesterBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            semesterMenu.style.display = semesterMenu.style.display === "flex" ? "none" : "flex";
        });

        // Closing menu when clicked anywhere outside of the menu
        document.addEventListener("click", () => {
            semesterMenu.style.display = "none";
        });

        // Preventing the menu from closing after choosing a semester
        semesterMenu.addEventListener("click", (e) => {
            e.stopPropagation();
        });

    }

    // Main semester menu implementation
    semesterItems.forEach(item => {

        item.addEventListener("click", (e) => {

            e.stopPropagation();

            const label = item.textContent.trim();

            // Updating button label to the selected semester text
            if (semesterBtnLabel) {
                semesterBtnLabel.textContent = label;
            }

            // Updating which option appears active in the dropdown
            semesterItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

        });

    });

}



/* ------------------------------------------------------------------------------------------
/* ADD CLASS SETUP */

let addCourseModal = null;
let addCourseForm = null;
let addCourseInput = null;
let addCourseClose = null;
let addCourseCancel = null;

export function openAddCourseModal() {
    if (!addCourseModal) return;
    addCourseModal.classList.remove("modal-hidden");

    if (addCourseInput) {
        setTimeout(() => addCourseInput.focus(), 100);
    }
}

function closeAddCourseModal() {
    if (!addCourseModal) return;
    addCourseModal.classList.add("modal-hidden");
    if (addCourseForm) addCourseForm.reset();
}

function setupAddCourseModal() {
    addCourseModal = document.getElementById("add-course-modal");
    addCourseForm = document.getElementById("add-course-form");
    addCourseInput = document.getElementById("modal-course-id");
    addCourseClose = document.getElementById("add-course-close");
    addCourseCancel = document.getElementById("add-course-cancel");
    const addClassBtn = document.querySelector(".add-btn");

    if (addClassBtn) {
        addClassBtn.addEventListener("click", () => {
            openAddCourseModal();
        });
    }

    if (addCourseClose) {
        addCourseClose.addEventListener("click", closeAddCourseModal);
    }

    if (addCourseCancel) {
        addCourseCancel.addEventListener("click", closeAddCourseModal);
    }

    // Close when clicking backdrop
    if (addCourseModal) {
        addCourseModal.addEventListener("click", (e) => {
        // Only close if they clicked *outside* the dialog
        if (
            e.target === addCourseModal ||
            e.target.classList.contains("modal-backdrop")
        ) {
            closeAddCourseModal();
        }
        });
    }

    // Handle the actual "Add Course" submit
    if (addCourseForm && addCourseInput) {
        addCourseForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const courseId = addCourseInput.value.trim();
            if (!courseId) return;

            try {
                const res = await fetch("http://localhost:3001/api/schedule/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ courseId }),
                });

                const data = await res.json();

                if (!res.ok) {
                    alert(data.error || "Failed to add course.");
                    return;
                }

                closeAddCourseModal();
                await loadScheduleCourses();
                
            } catch (err) {
                console.error("addCourse error:", err);
                alert("Sorry, something went wrong adding this course.");
            }
        });
    }

}



/* ------------------------------------------------------------------------------------------
/* DROP CLASS SETUP */

let dropCourseModal = null;
let dropCourseMessage = null;
let dropCourseClose = null;
let dropCourseCancel = null;
let dropCourseConfirm = null;
let dropCourseCurrentId = null;

function openDropCourseModal(courseId) {
    if (!dropCourseModal) return;
    dropCourseCurrentId = courseId;

    if (dropCourseMessage) {
        dropCourseMessage.innerHTML = `Are you sure you want to drop out off  <strong>'${courseId}'</strong>?`;
    }

    dropCourseModal.classList.remove("modal-hidden");
}

function closeDropCourseModal() {
    dropCourseCurrentId = null;
    if (dropCourseModal) {
        dropCourseModal.classList.add("modal-hidden");
    }
}

async function dropCourse(courseId) {
    if (!courseId) return;

    try {
        const res = await fetch("http://localhost:3001/api/schedule/drop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId }),
        });

        if (!res.ok) {
            console.error("Drop failed", await res.text());
            alert("Sorry, something went wrong dropping this course.");
            return;
        }

        await loadScheduleCourses();
    } catch (err) {
        console.error("dropCourse error:", err);
        alert("Sorry, something went wrong dropping this course.");
    }
}

function setupDropCourseModal() {
    dropCourseModal = document.getElementById("drop-course-modal");
    dropCourseMessage = document.getElementById("drop-course-message");
    dropCourseClose = document.getElementById("drop-course-close");
    dropCourseCancel = document.getElementById("drop-course-cancel");
    dropCourseConfirm = document.getElementById("drop-course-confirm");

    if (!dropCourseModal) return;

    // Close button (X)
    if (dropCourseClose) {
        dropCourseClose.addEventListener("click", () => {
            closeDropCourseModal();
        });
    }

    // Cancel button
    if (dropCourseCancel) {
        dropCourseCancel.addEventListener("click", () => {
            closeDropCourseModal();
        });
    }

    // Confirm delete button
    if (dropCourseConfirm) {
        dropCourseConfirm.addEventListener("click", async () => {
            if (!dropCourseCurrentId) {
                closeDropCourseModal();
                return;
            }

            const courseId = dropCourseCurrentId;
            closeDropCourseModal();
            await dropCourse(courseId);
        });
    }

    // Click on backdrop closes modal
    dropCourseModal.addEventListener("click", (e) => {
        if (
            e.target === dropCourseModal ||
            e.target.classList.contains("modal-backdrop")
        ) {
            closeDropCourseModal();
        }
    });
}



/* ------------------------------------------------------------------------------------------
/* CALENDAR SETUP */

export function generateCalendar() {

    const container = document.getElementById("calendar-grid");

    if (!container) return;

    // Days of week as the header
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Times (7:00 AM → 11:00 PM) 
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
            ${days.map(day => `<div class="day-cell">${day}</div>`).join("")}
        </div>
    `;

    // Build time rows
    let rowsHTML = times
        .map(time => {
            return `
                <div class="time-row">
                    <div class="time-cell">${time}</div>
                    ${days
                        .map(
                            day =>
                                `<div class="slot-cell" data-day="${day.toLowerCase()}" data-time="${time}"></div>`
                        )
                        .join("")}
                </div>
            `;
        })
        .join("");

    container.innerHTML = headerHTML + rowsHTML;
}



/* ------------------------------------------------------------------------------------------
/* COURSE CARD UI SETUP */

export function setupCourseCardUI (course, colorIndex = 0) {
    const colors = [
        "course-color-1",
        "course-color-2",
        "course-color-3",
        "course-color-4",
    ];
    const colorClass = colors[colorIndex % colors.length];

    const { id, name, professor, location, days, start, end } = course;

    const daysText = Array.isArray(days) ? days.join(" & ") : days || "";

    return `
        <div class="course-card">
        <span class="course-color ${colorClass}"></span>

        <div class="course-content">
            <div class="course-header">
            <div>
                <div class="course-number">${id || ""}</div>
                <div class="course-name">${name || ""}</div>
            </div>

            <!-- X button (not wired to drop yet) -->
            <button class="course-remove-btn" data-course-id="${id || ""}">
                <span class="material-icons">close</span>
            </button>
            </div>

            <div class="course-details">
            <div class="details">
                <div class="detail-item">
                <span class="material-icons detail-icon">person</span>
                <span class="detail-text">${professor || ""}</span>
                </div>

                <div class="detail-item">
                <span class="material-icons detail-icon">access_time</span>
                <span class="detail-text">${start || ""} – ${end || ""}</span>
                </div>
            </div>

            <div class="details">
                <div class="detail-item">
                <span class="material-icons detail-icon">location_on</span>
                <span class="detail-text">${location || ""}</span>
                </div>

                <div class="detail-item">
                <span class="material-icons detail-icon">calendar_today</span>
                <span class="detail-text">${daysText}</span>
                </div>
            </div>
            </div>
        </div>
        </div>
    `;
}



/* ------------------------------------------------------------------------------------------
/* LOAD SCHEDULED COURSES */

export async function loadScheduleCourses() {
    const container = document.getElementById("courses-list");
    const titleEl = document.getElementById("courses-title");
    if (!container) return;

    container.innerHTML = "<p class='empty-courses'>Loading your courses...</p>";

    try {
        const res = await fetch("http://localhost:3001/api/schedule");
        if (!res.ok) throw new Error("Failed to fetch schedule");

        const data = await res.json();
        const { semester, classes } = data;

        if (titleEl && semester) {
            titleEl.textContent = `Courses`;
        }

        if (!classes || !classes.length) {
            container.innerHTML =
                "<p class='empty-courses'>You don't have any courses in your schedule yet.</p>";
            return;
        }

        const cardsHTML = classes
            .map((course, idx) => setupCourseCardUI(course, idx))
            .join("");

        container.innerHTML = cardsHTML;

        // Wire up the X buttons after rendering the cards
        const removeButtons = container.querySelectorAll(".course-remove-btn");
        removeButtons.forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const courseId = btn.dataset.courseId;
                if (!courseId) return;

                openDropCourseModal(courseId);
            });
        });
    } catch (err) {
        console.error("loadScheduleCourses error:", err);
        container.innerHTML =
            "<p class='empty-courses'>Sorry, we couldn't load your courses.</p>";
    }
}

  

/* ------------------------------------------------------------------------------------------
/* EXPORTING SCHEDULE PAGE */

export function SchedulePage() {

    generateCalendar();
    setupSemesterMenuUI();
    setupAddCourseModal();
    setupDropCourseModal();

}