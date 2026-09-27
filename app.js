const STORAGE_KEY = "duenote-assignments-v1";
const filters = document.querySelectorAll("[data-filter]");
const form = document.querySelector("#assignment-form");
const titleInput = document.querySelector("#title");
const courseInput = document.querySelector("#course");
const dateInput = document.querySelector("#due-date");
const priorityInput = document.querySelector("#priority");
const list = document.querySelector("#assignment-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search");
const sortInput = document.querySelector("#sort");
const toast = document.querySelector("#toast");
const clearSamplesButton = document.querySelector("#clear-samples");

let currentFilter = "all";
let assignments = loadAssignments();
let toastTimer;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfterDays(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function makeSampleAssignments() {
  return [
    { id: crypto.randomUUID(), title: "Reading response: The natural world", course: "English Literature", dueDate: dateAfterDays(1), priority: "high", completed: false, isSample: true },
    { id: crypto.randomUUID(), title: "Practice problems — Chapter 4", course: "Introduction to Statistics", dueDate: dateAfterDays(3), priority: "normal", completed: false, isSample: true },
    { id: crypto.randomUUID(), title: "Sketchbook study: light & shadow", course: "Foundations of Design", dueDate: dateAfterDays(6), priority: "low", completed: false, isSample: true },
  ];
}

function loadAssignments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      const samples = makeSampleAssignments();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
      return samples;
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidAssignment) : [];
  } catch (error) {
    console.error("Could not load saved assignments.", error);
    return [];
  }
}

function isValidAssignment(item) {
  return item && typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.course === "string" && typeof item.dueDate === "string" &&
    typeof item.completed === "boolean";
}

function saveAssignments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    return true;
  } catch (error) {
    console.error("Could not save assignments.", error);
    showToast("Your browser could not save this change. Try freeing some storage.");
    return false;
  }
}

function today() {
  return localDateString();
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function dueLabel(assignment) {
  if (assignment.completed) return "Completed";
  if (assignment.dueDate < today()) return "Overdue";
  if (assignment.dueDate === today()) return "Due today";

  const daysLeft = Math.round((new Date(`${assignment.dueDate}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86_400_000);
  if (daysLeft === 1) return "Due tomorrow";
  if (daysLeft < 7) return `In ${daysLeft} days`;
  return formatDate(assignment.dueDate);
}

function matchesFilter(assignment) {
  if (currentFilter === "completed") return assignment.completed;
  if (currentFilter === "upcoming") return !assignment.completed && assignment.dueDate >= today();
  return true;
}

function matchesSearch(assignment, query) {
  return `${assignment.title} ${assignment.course}`.toLowerCase().includes(query);
}

function sortedAssignments(items) {
  const priorityRank = { high: 0, normal: 1, low: 2 };
  const sortBy = sortInput.value;
  return [...items].sort((a, b) => {
    if (sortBy === "course") return a.course.localeCompare(b.course) || a.dueDate.localeCompare(b.dueDate);
    if (sortBy === "priority") return priorityRank[a.priority] - priorityRank[b.priority] || a.dueDate.localeCompare(b.dueDate);
    return a.completed - b.completed || a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
  });
}

function updateHeaderAndStats() {
  const openAssignments = assignments.filter((assignment) => !assignment.completed);
  const completedCount = assignments.length - openAssignments.length;
  const weekFromNow = dateAfterDays(7);
  const dueThisWeek = openAssignments.filter((assignment) => assignment.dueDate >= today() && assignment.dueDate <= weekFromNow).length;
  const percentComplete = assignments.length ? Math.round((completedCount / assignments.length) * 100) : 0;

  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric",
  }).format(new Date());
  document.querySelector("#total-stat").textContent = assignments.length;
  document.querySelector("#due-stat").textContent = dueThisWeek;
  document.querySelector("#completed-stat").textContent = completedCount;
  document.querySelector("#progress-label").textContent = `${percentComplete}%`;
  document.querySelector("#progress-fill").style.width = `${percentComplete}%`;
  document.querySelector("#progress-bar").setAttribute("aria-valuenow", String(percentComplete));
  document.querySelector("#all-count").textContent = assignments.length;
  document.querySelector("#upcoming-count").textContent = openAssignments.filter((item) => item.dueDate >= today()).length;
  document.querySelector("#completed-count").textContent = completedCount;
  clearSamplesButton.hidden = !assignments.some((assignment) => assignment.isSample);
}

function createTaskElement(assignment) {
  const item = document.createElement("li");
  const overdue = !assignment.completed && assignment.dueDate < today();
  item.className = `assignment-card${assignment.completed ? " is-complete" : ""}${overdue ? " is-overdue" : ""}`;

  const completeButton = document.createElement("button");
  completeButton.className = "complete-toggle";
  completeButton.type = "button";
  completeButton.dataset.action = "toggle";
  completeButton.dataset.id = assignment.id;
  completeButton.setAttribute("aria-pressed", String(assignment.completed));
  completeButton.setAttribute("aria-label", assignment.completed ? `Mark ${assignment.title} as not complete` : `Mark ${assignment.title} as complete`);
  completeButton.textContent = "✓";

  const copy = document.createElement("div");
  copy.className = "task-copy";
  const titleRow = document.createElement("div");
  titleRow.className = "task-title-row";
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = assignment.title;
  titleRow.append(title);

  const course = document.createElement("p");
  course.className = "task-course";
  course.textContent = assignment.course;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const due = document.createElement("span");
  due.className = "due-tag";
  if (overdue) due.classList.add("is-overdue");
  else if (!assignment.completed && assignment.dueDate === today()) due.classList.add("is-today");
  due.textContent = `${dueLabel(assignment)} · ${formatDate(assignment.dueDate)}`;

  const priority = document.createElement("span");
  priority.className = `priority-tag${assignment.priority === "high" ? " is-high" : ""}${assignment.priority === "low" ? " is-low" : ""}`;
  priority.textContent = assignment.priority;
  meta.append(due, priority);
  copy.append(titleRow, course, meta);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = assignment.id;
  deleteButton.setAttribute("aria-label", `Delete ${assignment.title}`);
  deleteButton.textContent = "×";
  item.append(completeButton, copy, deleteButton);
  return item;
}

function renderEmptyState(query, visibleItems) {
  const shouldShow = visibleItems.length === 0;
  emptyState.hidden = !shouldShow;
  if (!shouldShow) return;

  if (query) {
    document.querySelector("#empty-title").textContent = "No matches yet.";
    document.querySelector("#empty-copy").textContent = "Try another word or clear your search.";
  } else if (currentFilter === "completed") {
    document.querySelector("#empty-title").textContent = "Your wins will show up here.";
    document.querySelector("#empty-copy").textContent = "Mark an assignment complete and it’ll land in this list.";
  } else if (currentFilter === "upcoming") {
    document.querySelector("#empty-title").textContent = "Nothing coming up.";
    document.querySelector("#empty-copy").textContent = "Add an assignment with a due date to keep it on your radar.";
  } else {
    document.querySelector("#empty-title").textContent = "A fresh page.";
    document.querySelector("#empty-copy").textContent = "Add your next assignment and give it a date. You’ve got this.";
  }
}

function render() {
  updateHeaderAndStats();
  const query = searchInput.value.trim().toLowerCase();
  const visibleItems = sortedAssignments(assignments.filter((assignment) => matchesFilter(assignment) && matchesSearch(assignment, query)));
  list.replaceChildren(...visibleItems.map(createTaskElement));
  document.querySelector("#visible-count").textContent = visibleItems.length;
  renderEmptyState(query, visibleItems);
  filters.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const newAssignment = {
    id: crypto.randomUUID(),
    title: formData.get("title").trim(),
    course: formData.get("course").trim(),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    completed: false,
    isSample: false,
  };

  if (!newAssignment.title || !newAssignment.course || !newAssignment.dueDate) return;
  if (newAssignment.dueDate < today()) {
    dateInput.setCustomValidity("Choose today or a future date.");
    dateInput.reportValidity();
    return;
  }

  assignments.unshift(newAssignment);
  const saved = saveAssignments();
  form.reset();
  dateInput.min = today();
  currentFilter = "all";
  searchInput.value = "";
  render();
  titleInput.focus();
  if (saved) showToast("Assignment added. You’ve got this.");
});

dateInput.min = today();
dateInput.addEventListener("input", () => dateInput.setCustomValidity(""));

filters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", render);
sortInput.addEventListener("change", render);

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const assignment = assignments.find((item) => item.id === button.dataset.id);
  if (!assignment) return;

  if (button.dataset.action === "toggle") {
    assignment.completed = !assignment.completed;
    const saved = saveAssignments();
    render();
    if (saved) showToast(assignment.completed ? "Nice work — marked complete." : "Back on your list.");
  } else if (button.dataset.action === "delete") {
    assignments = assignments.filter((item) => item.id !== assignment.id);
    const saved = saveAssignments();
    render();
    if (saved) showToast("Assignment removed.");
  }
});

clearSamplesButton.addEventListener("click", () => {
  assignments = assignments.filter((assignment) => !assignment.isSample);
  const saved = saveAssignments();
  render();
  if (saved) showToast("Sample tasks removed.");
});

render();
