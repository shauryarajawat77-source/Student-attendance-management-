const STORAGE_KEYS = { students: "attendease_students_v1", attendance: "attendease_attendance_v1" };
const $ = (id) => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
let students = load(STORAGE_KEYS.students, []);
let attendance = load(STORAGE_KEYS.attendance, {});
let editingId = null;
let toastTimer;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
  localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2500);
}
function formatDate(date) {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"});
}
function studentCell(student) {
  return `<div class="student-cell"><span class="student-avatar">${escapeHTML(initials(student.name))}</span>${escapeHTML(student.name)}</div>`;
}
function setPage(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("breadcrumb").textContent = ({dashboard:"Dashboard",students:"Students",attendance:"Take Attendance",records:"Attendance Records"})[page];
  $("sidebar").classList.remove("open");
  if (page === "dashboard") renderDashboard();
  if (page === "students") renderStudents();
  if (page === "attendance") renderAttendance();
  if (page === "records") renderRecords();
}
document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.page)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.go)));
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));

function renderDashboard() {
  const date = today(), day = attendance[date] || {};
  const present = Object.values(day).filter(status => status === "Present").length;
  const absent = Object.values(day).filter(status => status === "Absent").length;
  const marked = present + absent;
  const rate = marked ? Math.round(present / marked * 100) : 0;
  $("totalStat").textContent = students.length;
  $("presentStat").textContent = present;
  $("absentStat").textContent = absent;
  $("rateStat").textContent = rate + "%";
  $("progressRate").textContent = rate + "%";
  $("progressBar").style.width = rate + "%";
  $("presentLegend").textContent = present;
  $("absentLegend").textContent = absent;
  $("unmarkedLegend").textContent = Math.max(0, students.length - marked);
  $("dateHeading").textContent = new Date().toLocaleDateString("en-IN", {weekday:"long",day:"numeric",month:"long"});
  const recent = [...students].slice(-5).reverse();
  $("recentStudents").innerHTML = recent.map(s => `<tr><td>${studentCell(s)}</td><td>${escapeHTML(s.id)}</td><td>${escapeHTML(s.branch)}</td><td>${escapeHTML(s.semester)}</td></tr>`).join("");
  $("recentEmpty").style.display = recent.length ? "none" : "block";
}
function renderStudents() {
  const query = $("studentSearch").value.trim().toLowerCase();
  const filtered = students.filter(s => `${s.name} ${s.id} ${s.branch}`.toLowerCase().includes(query));
  $("studentCount").textContent = students.length;
  $("studentsTable").innerHTML = filtered.map(s => `<tr><td>${studentCell(s)}</td><td>${escapeHTML(s.id)}</td><td>${escapeHTML(s.branch)}</td><td>${escapeHTML(s.semester)}</td><td class="align-right"><button class="action-btn" data-delete="${escapeHTML(s.id)}">Delete</button></td></tr>`).join("");
  $("studentsEmpty").style.display = filtered.length ? "none" : "block";
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => deleteStudent(button.dataset.delete)));
}
$("studentSearch").addEventListener("input", renderStudents);

function openModal(student = null) {
  editingId = student?.id ?? null;
  $("studentForm").reset();
  $("formError").textContent = "";
  $("modalTitle").textContent = student ? "Edit student" : "Add student";
  if (student) {
    $("studentName").value = student.name;
    $("studentId").value = student.id;
    $("studentId").disabled = true;
    $("studentBranch").value = student.branch;
    $("studentSemester").value = student.semester;
  } else {
    $("studentId").disabled = false;
  }
  $("studentModal").classList.add("open");
  $("studentModal").setAttribute("aria-hidden", "false");
  $("studentName").focus();
}
function closeModal() {
  $("studentModal").classList.remove("open");
  $("studentModal").setAttribute("aria-hidden", "true");
  $("studentId").disabled = false;
}
$("addStudentBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);
$("studentModal").addEventListener("click", e => { if (e.target === $("studentModal")) closeModal(); });
$("studentForm").addEventListener("submit", e => {
  e.preventDefault();
  const student = {
    name: $("studentName").value.trim(),
    id: $("studentId").value.trim(),
    branch: $("studentBranch").value.trim(),
    semester: $("studentSemester").value
  };
  if (!student.name || !student.id || !student.branch || !student.semester) return;
  if (students.some(s => s.id.toLowerCase() === student.id.toLowerCase() && s.id !== editingId)) {
    $("formError").textContent = "A student with this ID already exists.";
    return;
  }
  if (editingId) {
    students = students.map(s => s.id === editingId ? student : s);
    showToast("Student details updated.");
  } else {
    students.push(student);
    showToast("Student added successfully.");
  }
  persist(); closeModal(); renderStudents(); renderDashboard(); renderAttendance();
});
function deleteStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student || !confirm(`Delete ${student.name}? Their saved attendance entries will also be removed.`)) return;
  students = students.filter(s => s.id !== id);
  Object.keys(attendance).forEach(date => { delete attendance[date][id]; if (!Object.keys(attendance[date]).length) delete attendance[date]; });
  persist(); renderStudents(); renderDashboard(); renderAttendance(); renderRecords();
  showToast("Student deleted.");
}

$("attendanceDate").value = today();
$("attendanceDate").addEventListener("change", renderAttendance);
function renderAttendance() {
  const date = $("attendanceDate").value || today();
  const day = attendance[date] || {};
  $("attendanceSub").textContent = `Attendance for ${formatDate(date)}. Choose a status for each student.`;
  $("attendanceTable").innerHTML = students.map(s => {
    const status = day[s.id] || "";
    return `<tr><td>${studentCell(s)}</td><td>${escapeHTML(s.id)}</td><td>${escapeHTML(s.branch)}</td><td><div class="status-toggle"><button class="status-btn ${status === "Present" ? "selected present" : ""}" data-status="Present" data-id="${escapeHTML(s.id)}">Present</button><button class="status-btn ${status === "Absent" ? "selected absent" : ""}" data-status="Absent" data-id="${escapeHTML(s.id)}">Absent</button></div></td></tr>`;
  }).join("");
  $("attendanceEmpty").style.display = students.length ? "none" : "block";
  document.querySelectorAll("[data-status]").forEach(button => button.addEventListener("click", () => {
    const selectedDate = $("attendanceDate").value || today();
    attendance[selectedDate] ||= {};
    attendance[selectedDate][button.dataset.id] = button.dataset.status;
    persist(); renderAttendance(); updateAttendanceCounts();
  }));
  updateAttendanceCounts();
}
function updateAttendanceCounts() {
  const day = attendance[$("attendanceDate").value || today()] || {};
  const present = Object.values(day).filter(s => s === "Present").length;
  const absent = Object.values(day).filter(s => s === "Absent").length;
  $("markedPresent").textContent = present;
  $("markedAbsent").textContent = absent;
  $("markedUnmarked").textContent = Math.max(0, students.length - present - absent);
}
$("allPresentBtn").addEventListener("click", () => {
  const date = $("attendanceDate").value || today();
  if (!students.length) return showToast("Add students first.");
  attendance[date] ||= {};
  students.forEach(s => attendance[date][s.id] = "Present");
  persist(); renderAttendance(); showToast("All students marked present.");
});
$("saveAttendanceBtn").addEventListener("click", () => {
  const date = $("attendanceDate").value || today();
  const day = attendance[date] || {};
  const marked = students.filter(s => day[s.id]).length;
  if (!students.length) return showToast("Add students before saving attendance.");
  if (!marked) return showToast("Mark attendance for at least one student.");
  persist(); renderDashboard(); renderRecords(); showToast(`Attendance saved for ${marked} student(s).`);
});

$("recordDate").addEventListener("change", renderRecords);
$("clearFilterBtn").addEventListener("click", () => { $("recordDate").value = ""; renderRecords(); });
function renderRecords() {
  const filter = $("recordDate").value;
  const rows = [];
  Object.entries(attendance).sort(([a],[b]) => b.localeCompare(a)).forEach(([date, day]) => {
    if (filter && date !== filter) return;
    Object.entries(day).forEach(([id, status]) => {
      const student = students.find(s => s.id === id);
      if (student) rows.push({date, student, status});
    });
  });
  $("recordsTitle").textContent = filter ? `Records for ${formatDate(filter)}` : "Saved records";
  $("recordsTable").innerHTML = rows.map(r => `<tr><td>${formatDate(r.date)}</td><td>${studentCell(r.student)}</td><td>${escapeHTML(r.student.id)}</td><td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("");
  $("recordsEmpty").style.display = rows.length ? "none" : "block";
}
$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {weekday:"short",day:"numeric",month:"short",year:"numeric"});
renderDashboard();
