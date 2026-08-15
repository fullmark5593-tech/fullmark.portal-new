import { db } from './firebase-config.js';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  writeBatch,
  deleteDoc,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const REGISTRATIONS_COLLECTION = 'registrations';

const form = document.getElementById('registration-form');
const editingIdInput = document.getElementById('editing-id');
const photoInput = document.getElementById('photo');
const previewImage = document.getElementById('photo-preview');
const previewText = document.getElementById('preview-text');
const resultBox = document.getElementById('result');
const cancelEditButton = document.getElementById('cancel-edit');
const recordsList = document.getElementById('records-list');
const recordsEmpty = document.getElementById('records-empty');
const recordsSection = document.querySelector('.records-section');
const leftPanel = document.querySelector('.left-panel');
const rightPanel = document.querySelector('.right-panel');
const searchInput = document.getElementById('search-input');
const searchTypeInputs = document.querySelectorAll('input[name="search-type"]');
const gradeFilter = document.getElementById('gradeFilter');
const modalOverlay = document.getElementById('record-modal');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close');
const versionModalOverlay = document.getElementById('version-modal');
const versionModalBody = document.getElementById('version-modal-body');
const versionModalCloseBtn = document.getElementById('version-modal-close');
const dailyRecordEditModal = document.getElementById('daily-record-edit-modal');
const dailyRecordEditClose = document.getElementById('daily-record-edit-close');
const dailyEditStudentName = document.getElementById('daily-edit-student-name');
const dailyEditMeta = document.getElementById('daily-edit-meta');
const dailyEditLessonPrice = document.getElementById('daily-edit-lesson-price');
const dailyEditRemainingPrice = document.getElementById('daily-edit-remaining-price');
const dailyEditBookPrice = document.getElementById('daily-edit-book-price');
const dailyEditBookRemainingPrice = document.getElementById('daily-edit-book-remaining-price');
const dailyEditPresence = document.getElementById('daily-edit-presence');
const dailyEditSaveBtn = document.getElementById('daily-edit-save-btn');
const dailyEditDeleteBtn = document.getElementById('daily-edit-delete-btn');
let currentDailyEditRecordId = null;
const studentCodeInput = document.getElementById('student-code');
const studentNameInput = document.getElementById('student-name');
const registrationDateInput = document.getElementById('registration-date');
const dayNameText = document.getElementById('day-name');
const openAccountsButton = document.getElementById('open-accounts-button');
const openScheduleButton = document.getElementById('open-schedule-button');
const drawerOverlay = document.getElementById('accounts-drawer-overlay');
const drawerCloseButton = document.getElementById('drawer-close');
const scheduleOverlay = document.getElementById('schedule-overlay');
const scheduleCloseButton = document.getElementById('schedule-close');
const scheduleSendSection = document.getElementById('schedule-send-section');
const scheduleSendTeacher = document.getElementById('schedule-send-teacher');
const scheduleSendGrade = document.getElementById('schedule-send-grade');
const scheduleSendWhatsappNumber = document.getElementById('schedule-send-whatsapp-number');
const scheduleSendButton = document.getElementById('schedule-send-button');
const accountDateFrom = document.getElementById('account-date-from');
const accountDateTo = document.getElementById('account-date-to');
const accountResetButton = document.getElementById('account-reset');
const accountStudentFilter = document.getElementById('account-student-filter');
const accountTeacherFilter = document.getElementById('account-teacher-filter');
const accountTeacherMultiselect = document.getElementById('account-teacher-multiselect');
const accountGradeMultiselect = document.getElementById('account-grade-multiselect');
const recordsTeacherFilter = document.getElementById('records-teacher-filter');
const recordsAttendanceFilter = document.getElementById('records-attendance-filter');
const recordsSubjectFilter = document.getElementById('records-subject-filter');
const recordsDateFrom = document.getElementById('records-date-from');
const recordsDateTo = document.getElementById('records-date-to');
const generateCodeButton = document.getElementById('generate-code');
const teacherInput = document.getElementById('teacher-name');
const teacherNameSelect = document.getElementById('teacher-name-select');
const roomInput = document.getElementById('room-number');
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const appContainer = document.querySelector('.container');

const APP_USERNAME = 'fallmark';
const APP_PASSWORD = 'Mnw@5593';

// registrations يتم تحديثه تلقائيًا وفوريًا من Firestore عبر onSnapshot
// بمجرد ما أي جهاز يضيف/يعدل/يحذف سجل، كل الأجهزة الأخرى المفتوحة تشوف
// التحديث لحظيًا بدون أي حاجة لعمل refresh يدوي.
let registrations = [];
let isFirstSnapshot = true;

const registrationsQuery = query(collection(db, REGISTRATIONS_COLLECTION));

onSnapshot(registrationsQuery, (snapshot) => {
  registrations = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  renderRegistrations(searchInput.value, gradeFilter.value);

  if (isFirstSnapshot) {
    isFirstSnapshot = false;
    clearForm();
  }
}, (error) => {
  console.error('خطأ في الاتصال بقاعدة البيانات:', error);
  resultBox.textContent = 'تعذر الاتصال بقاعدة البيانات. تأكد من إعدادات Firebase وقواعد Firestore.';
  resultBox.style.display = 'block';
});

let currentEditedId = null;
let currentPhotoDataUrl = null;

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rec-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateStudentCode() {
  const usedCodes = new Set(registrations.map((record) => record.studentCode).filter(Boolean));
  let number = 1;
  while (usedCodes.has(`${number}`) || usedCodes.has(`FM${number}`)) {
    number += 1;
  }
  return `${number}`;
}

function updateDayName() {
  const value = registrationDateInput.value;
  if (!value) {
    dayNameText.textContent = '-';
    return;
  }
  const date = new Date(value);
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  dayNameText.textContent = days[date.getDay()];
}

// حفظ/تحديث سجل واحد في Firestore
async function saveRecordToFirestore(record) {
  await setDoc(doc(db, REGISTRATIONS_COLLECTION, record.id), record);
}

async function deleteRecordFromFirestore(id) {
  await deleteDoc(doc(db, REGISTRATIONS_COLLECTION, id));
}

function lockApp() {
  loginOverlay.classList.add('active');
  appContainer.classList.add('hidden');
  logoutButton.style.display = 'none';
}

function unlockApp() {
  loginOverlay.classList.remove('active');
  appContainer.classList.remove('hidden');
  logoutButton.style.display = 'inline-flex';
}

function handleLogin(event) {
  event.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (username === APP_USERNAME && password === APP_PASSWORD) {
    sessionStorage.setItem('fullMarkLoggedIn', 'true');
    unlockApp();
    loginError.textContent = '';
    loginForm.reset();
  } else {
    loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  }
}

function resolveRecordRootId(record) {
  if (!record) return null;
  // لو السجل عنده rootId مخزّن صراحةً، ده أضمن مصدر للتجميع لأنه
  // مش بيعتمد على سلامة سلسلة parentId (اللي ممكن تتقطع لو نسخة وسطى اتحذفت).
  if (record.rootId) return record.rootId;

  // Fallback لسجلات قديمة اتسجلت قبل إضافة rootId: نحاول نمشي في سلسلة
  // parentId زي الأول. لو السلسلة مقطوعة (parent محذوف)، بنرجع أقرب جد لسه موجود.
  let current = record;
  const visited = new Set();
  while (current && current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = registrations.find((item) => item.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current ? (current.rootId || current.id) : record.id;
}

function getRecordVersions(record) {
  const rootId = resolveRecordRootId(record);
  return registrations
    .filter((item) => resolveRecordRootId(item) === rootId)
    .sort((a, b) => {
      const dateA = a.registrationDate || '';
      const dateB = b.registrationDate || '';
      if (dateA === dateB) return 0;
      return dateA < dateB ? -1 : 1;
    });
}

let currentModalRecord = null;
let currentVersionPopupRecord = null;

function buildRecordCardBodyHtml(record) {
  return `
    <h3>${record.studentName}</h3>
    <div class="modal-row">
      <div>
        <span><strong>اسم الطالب:</strong> ${record.studentName}</span>
        <span><strong>كود الطالب:</strong> ${record.studentCode}</span>
        <span><strong>رقم الطالب:</strong> ${record.phoneNumber}</span>
        <span><strong>رقم ولى الأمر:</strong> ${record.guardianNumber}</span>
        <span><strong>التاريخ:</strong> ${record.registrationDate}</span>
        <span><strong>رقم السجل:</strong> ${record.id}</span>
        <span><strong>الصف الدراسي:</strong> ${record.classGrade}</span>
        <span><strong>اسم المدرس:</strong> ${record.teacherName || '-'}</span>
        <span><strong>رقم القاعة:</strong> ${record.roomNumber || '-'}</span>
      </div>
      <div>
        <img class="modal-card-image" src="${record.photoDataUrl || ''}" alt="${record.studentName}" />
      </div>
    </div>
    <div class="modal-row">
      <span><strong>العنوان:</strong> ${record.address}</span>
      <span><strong>سعر الحصة:</strong> ${record.lessonPrice}</span>
      <span><strong>المبلغ المتبقي:</strong> ${record.remainingPrice}</span>
      <span><strong>سعر الحجز:</strong> ${record.bookPrice}</span>
      <span><strong>المتبقي من سعر الحجز:</strong> ${record.bookRemainingPrice ?? 0}</span>
      <span><strong>الحضور:</strong> ${record.presence || 'غير محدد'}</span>
      <span><strong>المواد:</strong> ${formatSubjects(record.subjects)}</span>
    </div>
  `;
}

function buildActionButtonsHtml(record) {
  return `
    <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
      <button type="button" class="modal-edit-button" data-action="edit" data-record-id="${record.id}">فتح للتعديل</button>
      <button type="button" class="modal-edit-button" data-action="whatsapp" data-record-id="${record.id}" style="background: #25d366;">ارسال عبر واتس</button>
      <button type="button" class="modal-edit-button" data-action="delete" data-record-id="${record.id}" style="background: #ef4444;">🗑️ حذف</button>
    </div>
  `;
}

function buildVersionsListHtml(record) {
  const versions = getRecordVersions(record);
  if (versions.length <= 1) return '';
  return `
    <div class="modal-row" style="flex-direction: column; align-items: stretch; margin-top: 6px;">
      <strong style="margin-bottom: 10px; font-size: 17px;">🗂️ سجل نسخ التعديل لهذا الطالب (${versions.length} نسخة)</strong>
      <div class="version-list">
        ${versions.map((version, index) => `
          <div class="version-item${version.id === record.id ? ' is-current' : ''}">
            <button type="button" class="version-view-button" data-version-id="${version.id}">
              <span class="version-index-badge">تسجيل ${index + 1}</span>
              <span class="version-item-date">📅 ${version.registrationDate || 'غير محدد'}${version.id === record.id ? '<span class="version-current-badge">النسخة الحالية</span>' : ''}</span>
              <span class="version-item-details">المادة: ${formatSubjects(version.subjects)} — الحضور: ${version.presence || 'غير محدد'} — المتبقي: ${version.remainingPrice ?? 0} — المدرس: ${version.teacherName || '-'}</span>
            </button>
            <button type="button" class="version-delete-button" data-version-id="${version.id}" title="حذف هذه النسخة">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openRecordModal(record) {
  currentModalRecord = record;
  modalBody.innerHTML = `
    ${buildRecordCardBodyHtml(record)}
    ${buildVersionsListHtml(record)}
    ${buildActionButtonsHtml(record)}
  `;
  modalOverlay.classList.add('active');
  modalOverlay.setAttribute('aria-hidden', 'false');
}

function openVersionPopup(record) {
  currentVersionPopupRecord = record;
  versionModalBody.innerHTML = `
    ${buildRecordCardBodyHtml(record)}
    ${buildActionButtonsHtml(record)}
  `;
  versionModalOverlay.classList.add('active');
  versionModalOverlay.setAttribute('aria-hidden', 'false');
}

function closeVersionPopup() {
  versionModalOverlay.classList.remove('active');
  versionModalOverlay.setAttribute('aria-hidden', 'true');
  currentVersionPopupRecord = null;
}

function openDailyRecordEditModal(recordId) {
  const record = registrations.find((item) => item.id === recordId);
  if (!record) return;

  currentDailyEditRecordId = recordId;
  dailyEditStudentName.textContent = record.studentName || '-';
  dailyEditMeta.textContent = `كود: ${record.studentCode || '-'} — الصف: ${record.classGrade || '-'} — المدرس: ${record.teacherName || '-'} — بتاريخ: ${record.registrationDate || '-'}`;
  dailyEditLessonPrice.value = record.lessonPrice ?? 0;
  dailyEditRemainingPrice.value = record.remainingPrice ?? 0;
  dailyEditBookPrice.value = record.bookPrice ?? 0;
  dailyEditBookRemainingPrice.value = record.bookRemainingPrice ?? 0;
  dailyEditPresence.value = record.presence || 'غير محدد';

  dailyRecordEditModal.classList.add('active');
  dailyRecordEditModal.setAttribute('aria-hidden', 'false');
}

function closeDailyRecordEditModal() {
  dailyRecordEditModal.classList.remove('active');
  dailyRecordEditModal.setAttribute('aria-hidden', 'true');
  currentDailyEditRecordId = null;
}

async function saveDailyRecordEdit() {
  if (!currentDailyEditRecordId) return;
  const record = registrations.find((item) => item.id === currentDailyEditRecordId);
  if (!record) return;

  dailyEditSaveBtn.disabled = true;
  dailyEditSaveBtn.textContent = '⏳ جاري الحفظ...';
  try {
    // بنعدّل نفس السجل مباشرة (من غير إنشاء نسخة جديدة) لأنه تصحيح لبيانات
    // هذا التسجيل بالذات، وبيتزامن تلقائيًا مع كارت الطالب لأنه نفس المستند.
    const updatedRecord = {
      ...record,
      lessonPrice: dailyEditLessonPrice.value || '0',
      remainingPrice: dailyEditRemainingPrice.value || '0',
      bookPrice: dailyEditBookPrice.value || '0',
      bookRemainingPrice: dailyEditBookRemainingPrice.value || '0',
      presence: dailyEditPresence.value || 'غير محدد',
    };
    await saveRecordToFirestore(updatedRecord);
    closeDailyRecordEditModal();
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء الحفظ. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.');
  } finally {
    dailyEditSaveBtn.disabled = false;
    dailyEditSaveBtn.textContent = '💾 حفظ التعديل';
  }
}

async function deleteDailyRecordEdit() {
  if (!currentDailyEditRecordId) return;
  const record = registrations.find((item) => item.id === currentDailyEditRecordId);
  if (!record) return;

  if (!confirm(`هل تريد حذف تسجيل "${record.studentName}" بتاريخ ${record.registrationDate} فعلاً؟ لا يمكن التراجع بعد الحذف.`)) {
    return;
  }
  await deleteRecordVersion(currentDailyEditRecordId);
  closeDailyRecordEditModal();
}

dailyRecordEditClose.addEventListener('click', closeDailyRecordEditModal);
dailyRecordEditModal.addEventListener('click', (event) => {
  if (event.target === dailyRecordEditModal) closeDailyRecordEditModal();
});
dailyEditSaveBtn.addEventListener('click', saveDailyRecordEdit);
dailyEditDeleteBtn.addEventListener('click', deleteDailyRecordEdit);

document.getElementById('daily-records').addEventListener('click', (event) => {
  const statusBadge = event.target.closest('.daily-record-row-status-badge');
  if (statusBadge) {
    event.stopPropagation();
    toggleWhatsappSentStatus(statusBadge.dataset.recordId);
    return;
  }
  const whatsappBtn = event.target.closest('.daily-record-row-whatsapp-btn');
  if (whatsappBtn) {
    event.stopPropagation();
    const record = registrations.find((item) => item.id === whatsappBtn.dataset.recordId);
    if (record) sendStudentDataToWhatsapp(record);
    return;
  }
  const row = event.target.closest('.daily-record-row');
  if (row) openDailyRecordEditModal(row.dataset.recordId);
});
document.getElementById('daily-records').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.target.closest('.daily-record-row-whatsapp-btn')) return;
  if (event.target.closest('.daily-record-row-status-badge')) return;
  const row = event.target.closest('.daily-record-row');
  if (row) {
    event.preventDefault();
    openDailyRecordEditModal(row.dataset.recordId);
  }
});

function closeRecordModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.setAttribute('aria-hidden', 'true');
  closeVersionPopup();
}

function formatSubjects(subjects) {
  return subjects && subjects.length ? subjects.join('، ') : 'لا توجد مواد محددة';
}

// النص ده لازم يتضاف في كل رسالة واتساب بيبعتها النظام (تسجيل، حسابات
// يومية، جدول حجز...)، قبل توقيع "تم الإرسال من نظام أكاديمية Full Mark"
// مباشرة.
const WHATSAPP_REPLY_REMINDER_TEXT = 'رجاء عند وصول رسالة الحضور الرد عليها (تم) لاستمرار الخدمة وعدم توقفها';

async function sendStudentDataToWhatsapp(record) {
  if (!record.guardianNumber) {
    alert('لا يوجد رقم واتس اب لولي الأمر');
    return false;
  }

  const phoneNumber = record.guardianNumber.replace(/\D/g, '');
  let formattedPhone = phoneNumber;

  if (phoneNumber.startsWith('0')) {
    formattedPhone = '20' + phoneNumber.substring(1);
  } else if (!phoneNumber.startsWith('20')) {
    formattedPhone = '20' + phoneNumber;
  }

  const message = `
*بيانات الطالب - أكاديمية Full Mark*

👤 الاسم: ${record.studentName}
📌 الكود: ${record.studentCode}
📞 رقم الطالب: ${record.phoneNumber}
📚 الصف الدراسي: ${record.classGrade}
👨‍🏫 المدرس: ${record.teacherName || '-'}
🏛️ رقم القاعة: ${record.roomNumber || '-'}
📅 تاريخ التسجيل: ${record.registrationDate}
📖 المواد: ${formatSubjects(record.subjects)}

💰 سعر الحصة: ${record.lessonPrice}
💵 المبلغ المتبقي: ${record.remainingPrice}
📄 سعر الحجز: ${record.bookPrice}
📑 المتبقي من سعر الحجز: ${record.bookRemainingPrice ?? 0}

📍 العنوان: ${record.address}
✅ الحضور: ${record.presence || 'غير محدد'}

---
${WHATSAPP_REPLY_REMINDER_TEXT}
تم الإرسال من نظام أكاديمية Full Mark
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  // window.open بيرجع null (أو undefined) لو المتصفح منع فتح نافذة/تبويب
  // جديدة (popup blocker). دي أدق إشارة متاحة لينا من غير API واتساب
  // نفسه إن كان فعلاً هيتفتح ولا لأ.
  const opened = window.open(whatsappUrl, '_blank');

  if (!opened) {
    alert('تعذر فتح واتساب لهذا الطالب (المتصفح منع فتح نافذة جديدة). لم يتم تحديده كـ "تم الإرسال" — برجاء السماح بالنوافذ المنبثقة أو إرسال الرسالة يدويًا.');
    return false;
  }

  // نسجّل إن الرسالة اتبعتت فعلاً (فتحت واتساب بنجاح) عشان تبان علامة
  // "✔ تم الإرسال" على الكارت، ونحفظها في Firestore بنفس بيانات السجل.
  try {
    record.whatsappSent = true;
    await saveRecordToFirestore(record);
  } catch (error) {
    console.error('تعذر حفظ حالة إرسال الواتساب:', error);
  }

  return true;
}

// تبديل حالة "تم الإرسال" يدويًا من على الكارت — لازم لأنه أحيانًا واتساب
// بيتفتح فعلاً (مفيش حظر من المتصفح) لكن الموظف ميكملش الإرسال فعليًا جوه
// واتساب نفسه، فمحتاجين وسيلة يصححوا بيها العلامة يدويًا.
async function toggleWhatsappSentStatus(recordId) {
  const record = registrations.find((item) => item.id === recordId);
  if (!record) return;
  record.whatsappSent = !record.whatsappSent;
  try {
    await saveRecordToFirestore(record);
  } catch (error) {
    console.error('تعذر تحديث حالة إرسال الواتساب:', error);
    record.whatsappSent = !record.whatsappSent; // رجّع الحالة القديمة لو الحفظ فشل
  }
}

function normalizeTeacherName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا');
}

function getUniqueTeacherEntries() {
  const map = new Map(); // normalizedKey -> اسم العرض (أول ظهور)
  registrations.forEach((record) => {
    const raw = (record.teacherName || '').trim();
    if (!raw) return;
    const key = normalizeTeacherName(raw);
    if (!map.has(key)) map.set(key, raw);
  });
  return Array.from(map.entries())
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

function getSelectedAccountTeacherKeys() {
  return Array.from(
    accountTeacherMultiselect.querySelectorAll('input[type="checkbox"]:checked')
  ).map((input) => input.value);
}

function getSelectedAccountGrades() {
  return Array.from(
    accountGradeMultiselect.querySelectorAll('input[type="checkbox"]:checked')
  ).map((input) => input.value);
}

function populateAccountTeacherMultiselect() {
  const uniqueTeachers = getUniqueTeacherEntries();

  const existingKeys = Array.from(
    accountTeacherMultiselect.querySelectorAll('input[type="checkbox"]')
  ).map((input) => input.value);
  const newKeys = uniqueTeachers.map((entry) => entry.key);
  const sameSet = existingKeys.length === newKeys.length
    && existingKeys.every((value, index) => value === newKeys[index]);
  if (sameSet) return;

  const previouslySelected = new Set(getSelectedAccountTeacherKeys());

  if (!uniqueTeachers.length) {
    accountTeacherMultiselect.innerHTML = '<div class="teacher-checkbox-empty">لا يوجد مدرسين مسجلين بعد.</div>';
    return;
  }

  accountTeacherMultiselect.innerHTML = uniqueTeachers
    .map(({ key, name }) => `
      <label class="teacher-checkbox-option">
        <input type="checkbox" value="${key}" ${previouslySelected.has(key) ? 'checked' : ''} />
        <span class="teacher-checkbox-box"></span>
        ${name}
      </label>
    `)
    .join('');
}

function getFilteredAccountRegistrations() {
  const dateFrom = accountDateFrom.value;
  const dateTo = accountDateTo.value;
  const studentFilter = accountStudentFilter.value.trim().toLowerCase();
  const teacherFilter = accountTeacherFilter.value.trim().toLowerCase();
  const selectedTeacherKeys = getSelectedAccountTeacherKeys();

  let filteredRegistrations = registrations;

  if (dateFrom) {
    filteredRegistrations = filteredRegistrations.filter(record => record.registrationDate && record.registrationDate >= dateFrom);
  }
  if (dateTo) {
    filteredRegistrations = filteredRegistrations.filter(record => record.registrationDate && record.registrationDate <= dateTo);
  }
  if (studentFilter) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      String(record.studentName || '').toLowerCase().includes(studentFilter)
    );
  }
  if (teacherFilter) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      String(record.teacherName || '').toLowerCase().includes(teacherFilter)
    );
  }
  if (selectedTeacherKeys.length) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      selectedTeacherKeys.includes(normalizeTeacherName(record.teacherName))
    );
  }
  const selectedGrades = getSelectedAccountGrades();
  if (selectedGrades.length) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      selectedGrades.some(gradeValue => matchesGradeFilter(record, gradeValue))
    );
  }

  return filteredRegistrations;
}

function sendAccountsToWhatsapp() {
  const whatsappNumber = document.getElementById('account-whatsapp-number').value.trim();

  if (!whatsappNumber) {
    alert('يرجى إدخال رقم الواتس اب');
    return;
  }

  const phoneNumber = whatsappNumber.replace(/\D/g, '');
  let formattedPhone = phoneNumber;

  if (phoneNumber.startsWith('0')) {
    formattedPhone = '20' + phoneNumber.substring(1);
  } else if (!phoneNumber.startsWith('20')) {
    formattedPhone = '20' + phoneNumber;
  }

  const filteredRegistrations = getFilteredAccountRegistrations();

  const summary = computeDailyAccounts(filteredRegistrations);
  const dates = Object.keys(summary).sort((a, b) => {
    if (a === 'غير محدد') return 1;
    if (b === 'غير محدد') return -1;
    return new Date(b) - new Date(a);
  });

  if (!dates.length) {
    alert('لا توجد حسابات لإرسالها');
    return;
  }

  let messageContent = `*تقرير الحسابات اليومية - أكاديمية Full Mark*\n\n`;

  dates.forEach((dateKey) => {
    const daySummary = summary[dateKey];
    messageContent += `📅 *تاريخ: ${daySummary.date}*\n`;
    messageContent += `   📊 عدد التسجيلات: ${daySummary.count}\n`;
    messageContent += `   💰 إجمالي سعر الحصص: ${formatCurrency(daySummary.lessonTotal)}\n`;
    messageContent += `   💵 إجمالي المبلغ المدفوع: ${formatCurrency(daySummary.paidTotal)}\n`;
    messageContent += `   📌 إجمالي المبلغ المتبقي: ${formatCurrency(daySummary.remainingTotal)}\n`;
    messageContent += `   📄 إجمالي سعر الحجز: ${formatCurrency(daySummary.bookTotal)}\n`;
    messageContent += `   📑 إجمالي المتبقي من سعر الحجز: ${formatCurrency(daySummary.bookRemainingTotal)}\n\n`;

    messageContent += `   *التفاصيل:*\n`;
    daySummary.records.forEach((record, recordIndex) => {
      const lessonPrice = parseFloat(record.lessonPrice) || 0;
      const remainingPrice = parseFloat(record.remainingPrice) || 0;
      const bookPrice = parseFloat(record.bookPrice) || 0;
      const bookRemainingPrice = parseFloat(record.bookRemainingPrice) || 0;
      messageContent += `   • ${record.studentName} (${record.studentCode}) - ${record.classGrade || '-'} - ${record.teacherName || '-'} - الحضور: ${record.presence || 'غير محدد'}\n`;
      messageContent += `     سعر الحصة: ${formatCurrency(lessonPrice)} | المتبقي: ${formatCurrency(remainingPrice)} | سعر الحجز: ${formatCurrency(bookPrice)} | متبقي الحجز: ${formatCurrency(bookRemainingPrice)}\n`;
      if (recordIndex < daySummary.records.length - 1) {
        messageContent += `   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      }
    });

    messageContent += `\n${'─'.repeat(50)}\n\n`;
  });

  messageContent += `${WHATSAPP_REPLY_REMINDER_TEXT}\nتم الإرسال من نظام أكاديمية Full Mark`;

  const encodedMessage = encodeURIComponent(messageContent);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\u200F/g, '').toLowerCase();
}

const GRADE_FILTER_MAP = {
  'primary-1': '1 ابتدائي',
  'primary-2': '2 ابتدائي',
  'primary-3': '3 ابتدائي',
  'primary-4': '4 ابتدائي',
  'primary-5': '5 ابتدائي',
  'primary-6': '6 ابتدائي',
  'prep-1': '1 اعدادي',
  'prep-2': '2 اعدادي',
  'prep-3': '3 اعدادي',
  'sec-1': '1 ثانوي',
  'sec-2': '2 ثانوي',
  'sec-3': '3 ثانوي'
};

function matchesGradeFilter(record, gradeFilterValue) {
  if (!gradeFilterValue || gradeFilterValue === 'all') return true;

  if (gradeFilterValue === 'غير محدد') {
    return normalizeText(record.classGrade) === normalizeText('غير محدد');
  }

  const expectedGrade = normalizeText(GRADE_FILTER_MAP[gradeFilterValue]);
  return normalizeText(record.classGrade).includes(expectedGrade);
}

const TEACHER_NAME_PRESETS = [
  'رباب فتحى', 'عبدالله جاد', 'احمد عادل', 'روان ايمن', 'خالد المصرى',
  'شعبان كامل', 'حسام محمود', 'محمد عماد', 'محمد فراج', 'ريم فوزى',
  'محمد السيناوى', 'اسلام فارس', 'احمد ثابت', 'محمد صلاح',
];

function handleTeacherSelectChange() {
  const val = teacherNameSelect.value;
  if (val === '__other__') {
    teacherInput.style.display = 'block';
    teacherInput.value = '';
    teacherInput.focus();
  } else {
    teacherInput.style.display = 'none';
    teacherInput.value = val;
  }
}

function syncTeacherSelectFromValue(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    teacherNameSelect.value = '';
    teacherInput.value = '';
    teacherInput.style.display = 'none';
    return;
  }
  if (TEACHER_NAME_PRESETS.includes(trimmed)) {
    teacherNameSelect.value = trimmed;
    teacherInput.value = trimmed;
    teacherInput.style.display = 'none';
  } else {
    // اسم مش موجود في القائمة الجاهزة (سجل قديم مثلًا) → نفعّل خيار "اسم آخر"
    // ونعرض الحقل النصي معبّى بالاسم الأصلي عشان مايضيعش.
    teacherNameSelect.value = '__other__';
    teacherInput.value = trimmed;
    teacherInput.style.display = 'block';
  }
}

teacherNameSelect.addEventListener('change', handleTeacherSelectChange);

// مطابقة أوسع (للتوحيد الجماعي بس) بتتجاهل فروق الألف/الهمزة والألف
// المقصورة/الياء والمسافات الزيادة، عشان تلقط أكبر عدد ممكن من الاختلافات
// الإملائية لنفس الاسم من غير ما تخلط بين اسمين مختلفين فعلاً.
function normalizeForTeacherMatch(name) {
  return String(name || '')
    .trim()
    .replace(/[\u0640\u064B-\u065F]/g, '') // إزالة التطويل والتشكيل لو موجود
    .replace(/\s+/g, '') // إزالة كل المسافات تمامًا (يحل مثلاً "عبد الله" مقابل "عبدالله")
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

async function normalizeAllTeacherNames() {
  const presetLookup = new Map(
    TEACHER_NAME_PRESETS.map((preset) => [normalizeForTeacherMatch(preset), preset])
  );

  const changes = [];
  registrations.forEach((record) => {
    const raw = (record.teacherName || '').trim();
    if (!raw) return;
    const key = normalizeForTeacherMatch(raw);
    const canonical = presetLookup.get(key);
    // نصلح بس الأسماء اللي بتطابق (بعد التوحيد) اسم موجود فعلاً في القائمة
    // المعتمدة، عشان مانخلطش بين اسمين مختلفين فعلاً بالغلط.
    if (canonical && canonical !== raw) {
      changes.push({ id: record.id, studentName: record.studentName, oldName: raw, newName: canonical });
    }
  });

  if (!changes.length) {
    alert('كل أسماء المدرسين متطابقة بالفعل مع القائمة المعتمدة، مفيش حاجة محتاجة تعديل.');
    return;
  }

  const preview = changes
    .slice(0, 8)
    .map((change) => `• "${change.oldName}" ← "${change.newName}" (${change.studentName})`)
    .join('\n');
  const moreText = changes.length > 8 ? `\n... و ${changes.length - 8} تسجيل إضافي` : '';

  const confirmed = confirm(
    `هيتم توحيد اسم المدرس في ${changes.length} تسجيل ليصبح مطابقًا تمامًا للقائمة المعتمدة:\n\n${preview}${moreText}\n\nهل تريد المتابعة؟ (لن يتم تعديل أي بيانات أخرى غير اسم المدرس)`
  );
  if (!confirmed) return;

  const normalizeButton = document.getElementById('normalize-teacher-names-btn');
  if (normalizeButton) {
    normalizeButton.disabled = true;
    normalizeButton.textContent = '⏳ جاري التوحيد...';
  }

  try {
    // الكتابة على دفعات (Firestore بيحد أقصى 500 عملية لكل batch)
    const BATCH_SIZE = 400;
    for (let i = 0; i < changes.length; i += BATCH_SIZE) {
      const chunk = changes.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((change) => {
        batch.update(doc(db, REGISTRATIONS_COLLECTION, change.id), { teacherName: change.newName });
      });
      await batch.commit();
    }
    alert(`تم توحيد اسم المدرس في ${changes.length} تسجيل بنجاح. باقي بيانات التسجيلات لم تتأثر.`);
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء التوحيد. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.');
  } finally {
    if (normalizeButton) {
      normalizeButton.disabled = false;
      normalizeButton.textContent = '🔧 توحيد أسماء المدرسين في كل التسجيلات';
    }
  }
}

document.getElementById('normalize-teacher-names-btn').addEventListener('click', normalizeAllTeacherNames);

async function waitForContainerImages(container) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', () => {
          // لو الشعار فشل يتحمل، نخفيه بدل ما يظهر أيقونة صورة مكسورة في الملف
          img.style.display = 'none';
          done();
        }, { once: true });
        // لو لأي سبب الصورة اتعلقت، منستناش أكتر من ثانية ونكمل من غيرها
        setTimeout(done, 1000);
      });
    })
  );
}

// html2canvas بيتعامل بشكل غلط أحيانًا لو كان فيه أكتر من عنصر position:fixed
// بيغطي الشاشة كلها ظاهر في نفس اللحظة (زي درج "الحسابات اليومية" المفتوح +
// طبقة تصدير الـ PDF فوقه) — بيلخبط حساب الأبعاد ويرجّع كانفاس فاضي حتى لو
// إصلاح السكرول شغال. الحل: نخفي مؤقتًا أي أوفرلاي تاني شغال (غير طبقة الـ
// PDF نفسها) وقت التصوير، ونرجّعه تاني فور ما نخلص.
function hideOtherFullscreenOverlays(exceptElement) {
  const overlaySelectors = ['.drawer-overlay.active', '.schedule-overlay.active', '.modal-overlay.active'];
  const hiddenOverlays = [];
  overlaySelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el === exceptElement) return;
      hiddenOverlays.push(el);
      el.classList.remove('active');
    });
  });
  return hiddenOverlays;
}

function restoreHiddenOverlays(hiddenOverlays) {
  hiddenOverlays.forEach((el) => el.classList.add('active'));
}

// دالة عامة مشتركة لتصدير أي قائمة سجلات (بنفس شكل بيانات التسجيل) لملف PDF.
// بتُستخدم لكل من: "البيانات المسجلة" المفلترة، و"الحسابات اليومية" المفلترة.
async function exportRecordsListToPDF(records, options) {
  const {
    button,
    countLabel = 'عدد الطلاب',
    reportSubtitle = 'تقرير بيانات الطلاب المسجلة',
    fileNamePrefix = 'بيانات-الطلاب',
    idleButtonText = '📄 تصدير PDF',
  } = options;

  if (!records.length) {
    alert('لا يوجد بيانات مطابقة للفلاتر الحالية لتصديرها.');
    return;
  }

  const container = document.getElementById('pdf-export-container');
  const sheet = document.getElementById('pdf-report-sheet');
  const tbody = document.getElementById('pdf-export-tbody');
  if (!container || !sheet || !tbody || !window.html2canvas || !window.jspdf) {
    alert('تعذر تحميل أداة تصدير PDF. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.');
    return;
  }

  // حماية إضافية: نشيل أي صورة موجودة جوه حاوية التقرير قبل التصوير (احتياطًا
  // من أي نسخة قديمة مخزّنة في كاش المتصفح لسه فيها صورة الشعار)، عشان التصدير
  // يفضل شغال حتى لو الصفحة لسه محتاجة hard refresh.
  container.querySelectorAll('img').forEach((img) => img.remove());

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = '⏳ جاري تجهيز الملف...';

  // نخفي أي أوفرلاي تاني شغال (زي درج الحسابات اليومية اللي زرار التصدير ده
  // نفسه جواه) عشان يفضل فيه أوفرلاي واحد بس position:fixed ظاهر وقت التصوير.
  const hiddenOverlays = hideOtherFullscreenOverlays(container);

  // بنظهر التقرير فعليًا فوق الشاشة (كطبقة) وقت التصوير بس، لأن html2canvas
  // بيفشل في تصوير عناصر مخفية برّه حدود الشاشة المرئية بإحداثيات بعيدة.
  container.classList.add('active');

  try {
    const now = new Date();
    const generatedAt = now.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('pdf-export-generated-at').textContent = `تاريخ التصدير: ${generatedAt}`;
    document.querySelector('#pdf-report-sheet .pdf-report-title-block p').textContent = reportSubtitle;
    document.getElementById('pdf-export-count').textContent = `${countLabel}: ${records.length}`;

    const rowHtml = (record, number) => `
      <tr>
        <td>${number}</td>
        <td>${record.studentName || '-'}</td>
        <td>${record.studentCode || '-'}</td>
        <td>${record.classGrade || '-'}</td>
        <td>${record.teacherName || '-'}</td>
        <td>${formatSubjects(record.subjects)}</td>
        <td>${record.presence || 'غير محدد'}</td>
        <td>${formatCurrency(parseFloat(record.lessonPrice) || 0)}</td>
        <td>${formatCurrency(parseFloat(record.remainingPrice) || 0)}</td>
        <td>${formatCurrency(parseFloat(record.bookPrice) || 0)}</td>
        <td>${formatCurrency(parseFloat(record.bookRemainingPrice) || 0)}</td>
        <td>${record.registrationDate || '-'}</td>
      </tr>
    `;

    // بنقسّم الطلاب على صفحات (عدد صفوف ثابت لكل صفحة) عشان كل صفحة تتصور
    // كصورة كاملة لوحدها، فمفيش صف بيتقطع نص في نص بين صفحة والتانية.
    const ROWS_PER_PAGE = 16;
    const chunks = [];
    for (let i = 0; i < records.length; i += ROWS_PER_PAGE) {
      chunks.push(records.slice(i, i + ROWS_PER_PAGE));
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
      const chunk = chunks[pageIndex];
      tbody.innerHTML = chunk
        .map((record, idx) => rowHtml(record, pageIndex * ROWS_PER_PAGE + idx + 1))
        .join('');

      // نتأكد إن شعار الأكاديمية اتحمل فعليًا قبل التصوير (سبب شائع لفشل
      // html2canvas)، وناخد فريم كمان عشان الجدول يترسم بالكامل.
      await waitForContainerImages(sheet);
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));

      const canvas = await window.html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // مهم جدًا: العنصر ده جوه حاوية position:fixed، و html2canvas بيحسب
        // موضع العناصر الـ fixed بناءً على قيمة سكرول الصفحة وقت التصوير.
        // لو المستخدم كان مسكرول لتحت (زي وهو فاتح درج الحسابات اليومية) بيطلع
        // كانفاس فاضي (0×0) أو مقطوع. الحل الموثّق لمكتبة html2canvas: تعويض
        // قيمة السكرول الحالية بالسالب عشان تحسب الموضع الصح من غير ما نحتاج
        // نسكرول الصفحة فعليًا (وده بالظبط سبب ظهور رسالة "الحاوية طلعت فاضية").
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('تعذر رسم محتوى التقرير (الحاوية طلعت فاضية). جرّب تاني، ولو استمرت المشكلة ابعتلي هذه الرسالة.');
      }

      const imgData = canvas.toDataURL('image/png');
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    }

    const fileDate = now.toISOString().slice(0, 10);
    pdf.save(`${fileNamePrefix}-${fileDate}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    alert(`حدث خطأ أثناء تجهيز ملف PDF:\n${error?.message || error}\n\nلو المشكلة استمرت، ابعتلي رسالة الخطأ دي بالظبط.`);
  } finally {
    container.classList.remove('active');
    restoreHiddenOverlays(hiddenOverlays);
    button.disabled = false;
    button.textContent = idleButtonText || previousText;
  }
}

async function exportFilteredRecordsToPDF() {
  const exportBtn = document.getElementById('export-filtered-pdf-btn');
  const { representativeRecords } = getFilteredRepresentativeRecords(searchInput.value, gradeFilter.value);
  await exportRecordsListToPDF(representativeRecords, {
    button: exportBtn,
    countLabel: 'عدد الطلاب',
    reportSubtitle: 'تقرير بيانات الطلاب المسجلة',
    fileNamePrefix: 'بيانات-الطلاب',
    idleButtonText: '📄 تصدير البيانات المفلترة PDF',
  });
}

async function exportDailyAccountsToPDF() {
  const exportBtn = document.getElementById('export-accounts-pdf-btn');
  const filteredRegistrations = getFilteredAccountRegistrations();
  const sortedRegistrations = [...filteredRegistrations].sort((a, b) => {
    const dateCompare = String(b.registrationDate || '').localeCompare(String(a.registrationDate || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ar');
  });
  await exportRecordsListToPDF(sortedRegistrations, {
    button: exportBtn,
    countLabel: 'عدد التسجيلات',
    reportSubtitle: 'تقرير الحسابات اليومية (حسب الفلاتر الحالية)',
    fileNamePrefix: 'الحسابات-اليومية',
    idleButtonText: '📄 تصدير الحسابات المعروضة PDF',
  });
}

// تصدير "جدول الحجز" (ابتدائي / اعدادي / ثانوي / كورسات) لملف PDF واحد، كل
// قسم في صفحة مستقلة بنفس التنسيق الظاهر على الشاشة، باستخدام نفس أسلوب
// التصوير المضبوط (تعويض سكرول الصفحة) عشان الصفحة الناتجة ما تطلعش فاضية.
async function exportScheduleToPDF() {
  const exportBtn = document.getElementById('export-schedule-pdf-btn');
  const sections = Array.from(document.querySelectorAll('.schedule-section'));

  if (!sections.length) {
    alert('لا يوجد جدول حجز لتصديره.');
    return;
  }
  if (!window.html2canvas || !window.jspdf) {
    alert('تعذر تحميل أداة تصدير PDF. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.');
    return;
  }

  const modal = document.querySelector('.schedule-modal');
  const scheduleOverlay = document.getElementById('schedule-overlay');
  const previousScrollTop = modal ? modal.scrollTop : 0;
  const previousText = exportBtn.textContent;
  exportBtn.disabled = true;

  // احتياطًا: لو فيه أوفرلاي تاني (زي درج الحسابات) فاضل شغال بالغلط في
  // الخلفية، بنخفيه وقت التصوير عشان نتجنب تعارض عناصر position:fixed متعددة.
  const hiddenOverlays = hideOtherFullscreenOverlays(scheduleOverlay);

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      exportBtn.textContent = `⏳ جاري تصدير القسم ${index + 1} من ${sections.length}...`;

      // نرجّع سكرول المودال لأول القسم عشان html2canvas يقدر يحسب مكانه صح.
      if (modal) modal.scrollTop = 0;
      section.scrollIntoView({ block: 'start' });
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));

      const canvas = await window.html2canvas(section, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // نفس إصلاح تعويض سكرول الصفحة المستخدم في تصدير البيانات المسجلة،
        // لازم هنا كمان لأن القسم ده جوه مودال (.schedule-overlay) بموضع
        // position:fixed.
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('تعذر رسم جدول الحجز (الحاوية طلعت فاضية). جرّب تاني، ولو استمرت المشكلة ابعتلي هذه الرسالة.');
      }

      const imgData = canvas.toDataURL('image/png');
      let drawWidth = pageWidth;
      let drawHeight = (canvas.height * pageWidth) / canvas.width;
      if (drawHeight > pageHeight) {
        const ratio = pageHeight / drawHeight;
        drawHeight = pageHeight;
        drawWidth = pageWidth * ratio;
      }

      if (index > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', (pageWidth - drawWidth) / 2, 0, drawWidth, drawHeight);
    }

    const fileDate = new Date().toISOString().slice(0, 10);
    pdf.save(`جدول-الحجز-${fileDate}.pdf`);
  } catch (error) {
    console.error('Schedule PDF export error:', error);
    alert(`حدث خطأ أثناء تجهيز ملف PDF:\n${error?.message || error}\n\nلو المشكلة استمرت، ابعتلي رسالة الخطأ دي بالظبط.`);
  } finally {
    if (modal) modal.scrollTop = previousScrollTop;
    restoreHiddenOverlays(hiddenOverlays);
    exportBtn.disabled = false;
    exportBtn.textContent = previousText;
  }
}

document.getElementById('export-filtered-pdf-btn').addEventListener('click', exportFilteredRecordsToPDF);
document.getElementById('export-accounts-pdf-btn').addEventListener('click', exportDailyAccountsToPDF);
document.getElementById('export-schedule-pdf-btn').addEventListener('click', exportScheduleToPDF);

function getSelectedSearchType() {
  const checked = Array.from(searchTypeInputs).find((input) => input.checked);
  return checked ? checked.value : 'name';
}

function matchSearch(record, query, searchType = 'name') {
  if (!query) return true;
  const q = query.trim().toLowerCase();

  if (searchType === 'code') {
    return String(record.studentCode || '').toLowerCase().includes(q);
  }
  if (searchType === 'phone') {
    return (
      String(record.phoneNumber || '').toLowerCase().includes(q) ||
      String(record.guardianNumber || '').toLowerCase().includes(q)
    );
  }
  // الافتراضي: بحث بالاسم
  return String(record.studentName || '').toLowerCase().includes(q);
}

function computeDailyAccounts(filteredRegistrations) {
  return filteredRegistrations.reduce((summary, record) => {
    const dateKey = record.registrationDate || 'غير محدد';
    const lessonPrice = parseFloat(record.lessonPrice) || 0;
    const remainingPrice = parseFloat(record.remainingPrice) || 0;
    const bookPrice = parseFloat(record.bookPrice) || 0;
    const bookRemainingPrice = parseFloat(record.bookRemainingPrice) || 0;
    const paidAmount = Math.max(0, lessonPrice - remainingPrice);

    if (!summary[dateKey]) {
      summary[dateKey] = {
        date: dateKey,
        count: 0,
        lessonTotal: 0,
        remainingTotal: 0,
        paidTotal: 0,
        bookTotal: 0,
        bookRemainingTotal: 0,
        records: [],
      };
    }

    const daySummary = summary[dateKey];
    daySummary.count += 1;
    daySummary.lessonTotal += lessonPrice;
    daySummary.remainingTotal += remainingPrice;
    daySummary.paidTotal += paidAmount;
    daySummary.bookTotal += bookPrice;
    daySummary.bookRemainingTotal += bookRemainingPrice;
    daySummary.records.push(record);

    return summary;
  }, {});
}

function formatCurrency(value) {
  return Number(value).toLocaleString('ar-EG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function renderDailyAccounts() {
  populateAccountTeacherMultiselect();
  const filteredRegistrations = getFilteredAccountRegistrations();

  const summary = computeDailyAccounts(filteredRegistrations);
  const summaryContainer = document.getElementById('daily-summary');
  const recordsContainer = document.getElementById('daily-records');

  summaryContainer.innerHTML = '';
  recordsContainer.innerHTML = '';

  const dates = Object.keys(summary).sort((a, b) => {
    if (a === 'غير محدد') return 1;
    if (b === 'غير محدد') return -1;
    return new Date(b) - new Date(a);
  });

  if (!dates.length) {
    summaryContainer.innerHTML = `<div class="daily-summary-card"><h4>لا توجد بيانات لهذا اليوم.</h4></div>`;
    return;
  }

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'daily-summary-grid';

  dates.forEach((dateKey) => {
    const daySummary = summary[dateKey];
    const card = document.createElement('div');
    card.className = 'daily-summary-card';
    card.innerHTML = `
      <h4>تاريخ: ${daySummary.date}</h4>
      <div class="daily-summary-item"><span>عدد التسجيلات: <strong>${daySummary.count}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي سعر الحصص: <strong>${formatCurrency(daySummary.lessonTotal)}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي المبلغ المتبقي: <strong>${formatCurrency(daySummary.remainingTotal)}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي المبلغ المدفوع: <strong>${formatCurrency(daySummary.paidTotal)}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي سعر الحجز: <strong>${formatCurrency(daySummary.bookTotal)}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي المتبقي من سعر الحجز: <strong>${formatCurrency(daySummary.bookRemainingTotal)}</strong></span></div>
    `;
    summaryGrid.appendChild(card);

    const dayRecords = document.createElement('div');
    dayRecords.className = 'daily-record-item';
    const sortedDayRecords = [...daySummary.records].sort((a, b) =>
      String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ar')
    );
    dayRecords.innerHTML = `
      <h4>تفاصيل التسجيلات ليوم ${daySummary.date}</h4>
      <div class="daily-record-list">
        ${sortedDayRecords
          .map((record) => {
            const lessonPrice = parseFloat(record.lessonPrice) || 0;
            const remainingPrice = parseFloat(record.remainingPrice) || 0;
            const bookPrice = parseFloat(record.bookPrice) || 0;
            const bookRemainingPrice = parseFloat(record.bookRemainingPrice) || 0;
            return `
              <div class="daily-record-row" data-record-id="${record.id}" role="button" tabindex="0">
                <button class="daily-record-row-whatsapp-btn" data-record-id="${record.id}" title="إرسال بيانات الطالب عبر واتساب" type="button">📱 واتساب</button>
                <button class="whatsapp-status-badge daily-record-row-status-badge ${record.whatsappSent ? 'is-sent' : 'is-not-sent'}" data-action="toggle-whatsapp-status" data-record-id="${record.id}" title="اضغط لتصحيح الحالة يدويًا لو غلط" type="button">
                  ${record.whatsappSent ? '✔ تم الإرسال' : '○ لم يتم الإرسال'}
                </button>
                <span class="daily-record-row-name">👤 <strong>${record.studentName}</strong> - كود: ${record.studentCode}</span>
                <span>الصف: ${record.classGrade || '-'} — المدرس: ${record.teacherName || '-'} — الحضور: ${record.presence || 'غير محدد'}</span>
                <span>سعر الحصة: ${formatCurrency(lessonPrice)} | المتبقي: ${formatCurrency(remainingPrice)} | سعر الحجز: ${formatCurrency(bookPrice)} | متبقي الحجز: ${formatCurrency(bookRemainingPrice)}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
    recordsContainer.appendChild(dayRecords);
  });

  summaryContainer.appendChild(summaryGrid);
}

function syncLeftPanelHeight() {
  if (!leftPanel || !rightPanel) return;

  const isStackedLayout = window.matchMedia('(max-width: 980px)').matches;
  if (isStackedLayout) {
    // على الشاشات الضيقة اللوحتين بترص فوق بعض، فمفيش داعي نساوي
    // ارتفاعها بالفورم؛ بنسيب CSS الخاص بالموبايل (max-height) يتحكم بدل كده.
    leftPanel.style.height = '';
    return;
  }

  // بنقيس الارتفاع الفعلي المرسوم لفورم التسجيل، ونطبقه بالظبط على لوحة
  // الكروت، عشان تنتهي القائمة عند نفس مستوى زرار "حفظ التسجيل" تمامًا.
  leftPanel.style.height = rightPanel.offsetHeight + 'px';
}

window.addEventListener('load', syncLeftPanelHeight);
window.addEventListener('resize', syncLeftPanelHeight);
syncLeftPanelHeight();

function getFilteredRepresentativeRecords(filterText = '', gradeFilterValue = 'all') {
  const searchType = getSelectedSearchType();
  let filtered = registrations.filter((record) => matchSearch(record, filterText, searchType));

  if (gradeFilterValue !== 'all') {
    filtered = filtered.filter(record => matchesGradeFilter(record, gradeFilterValue));
  }

  const teacherFilterValue = recordsTeacherFilter.value.trim().toLowerCase();
  if (teacherFilterValue) {
    filtered = filtered.filter(record =>
      String(record.teacherName || '').toLowerCase().includes(teacherFilterValue)
    );
  }

  const attendanceFilterValue = recordsAttendanceFilter.value;
  if (attendanceFilterValue && attendanceFilterValue !== 'all') {
    filtered = filtered.filter(record => (record.presence || '') === attendanceFilterValue);
  }

  const subjectFilterValue = recordsSubjectFilter.value;
  if (subjectFilterValue && subjectFilterValue !== 'all') {
    filtered = filtered.filter(record =>
      Array.isArray(record.subjects) && record.subjects.includes(subjectFilterValue)
    );
  }

  const dateFromValue = recordsDateFrom.value;
  if (dateFromValue) {
    filtered = filtered.filter(record => record.registrationDate && record.registrationDate >= dateFromValue);
  }

  const dateToValue = recordsDateTo.value;
  if (dateToValue) {
    filtered = filtered.filter(record => record.registrationDate && record.registrationDate <= dateToValue);
  }

  // Group by root record so each student family shows as ONE card in the grid,
  // regardless of how many edit-versions exist. The latest matching version is
  // shown as the card's "face"; all versions stay reachable from inside its modal.
  const familyMap = new Map();
  filtered.forEach((record) => {
    const rootId = resolveRecordRootId(record);
    const existing = familyMap.get(rootId);
    if (!existing || (record.registrationDate || '') >= (existing.registrationDate || '')) {
      familyMap.set(rootId, record);
    }
  });
  const representativeRecords = Array.from(familyMap.values());
  // ترتيب أبجدي ثابت باسم الطالب (وليس بترتيب آخر تعديل)، عشان مكان كل
  // طالب في القائمة يفضل ثابت حتى بعد تعديل أو حذف كروت تانية.
  representativeRecords.sort((a, b) =>
    String(a.studentName || '').localeCompare(String(b.studentName || ''), 'ar')
  );

  const hasActiveFilters = Boolean(
    filterText || gradeFilterValue !== 'all' || teacherFilterValue ||
    (attendanceFilterValue && attendanceFilterValue !== 'all') ||
    (subjectFilterValue && subjectFilterValue !== 'all') ||
    dateFromValue || dateToValue
  );

  return { representativeRecords, hasActiveFilters };
}

function renderRegistrations(filterText = '', gradeFilterValue = 'all') {
  recordsList.innerHTML = '';
  const { representativeRecords, hasActiveFilters } = getFilteredRepresentativeRecords(filterText, gradeFilterValue);

  if (!representativeRecords.length) {
    recordsEmpty.style.display = 'block';
    recordsEmpty.textContent = hasActiveFilters ? 'لا توجد نتائج تبحث عنها.' : 'لا يوجد بيانات مسجلة حتى الآن.';
    renderDailyAccounts();
    return;
  }

  recordsEmpty.style.display = 'none';

  representativeRecords.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'record-card';

    const image = document.createElement('img');
    image.className = 'card-image';
    if (record.photoDataUrl) {
      image.src = record.photoDataUrl;
      image.alt = record.studentName;
    } else {
      // مفيش صورة مرفوعة: نعرض أيقونة افتراضية بدل ما يظهر اسم الطالب
      // كنص بديل داخل مربع الصورة المكسور (مشكلة كانت بتحصل مع alt + src فاضي).
      image.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect width="72" height="72" rx="16" fill="#e2e8f0"/><circle cx="36" cy="28" r="12" fill="#94a3b8"/><path d="M14 60c2-14 14-20 22-20s20 6 22 20" fill="#94a3b8"/></svg>'
      );
      image.alt = '';
      image.style.background = '#e2e8f0';
    }

    const info = document.createElement('div');
    info.className = 'card-info';
    const versionCount = getRecordVersions(record).length;
    const versionsBadge = versionCount > 1
      ? `<span class="card-label">🗂️ عدد النسخ</span><span>${versionCount} (اضغط لعرض السجل)</span>`
      : '';
    info.innerHTML = `
      <div class="card-name-row">
        <strong class="card-student-name">${record.studentName}</strong>
        <div class="attendance-buttons">
          <button type="button" class="attendance-btn present-btn" data-id="${record.id}">✅ حاضر</button>
          <button type="button" class="attendance-btn absent-btn" data-id="${record.id}">❌ غائب</button>
        </div>
      </div>
      <button type="button" class="whatsapp-status-badge ${record.whatsappSent ? 'is-sent' : 'is-not-sent'}" data-action="toggle-whatsapp-status" data-id="${record.id}" title="اضغط لتصحيح الحالة يدويًا لو غلط">
        ${record.whatsappSent ? '✔ تم الإرسال' : '○ لم يتم الإرسال'}
      </button>
      <div class="attendance-price-panel" data-panel-for="${record.id}" style="display: none;">
        <span class="attendance-panel-label">سعر الحصة النهاردة:</span>
        <div class="attendance-price-options">
          <button type="button" class="price-chip" data-amount="25">25</button>
          <button type="button" class="price-chip" data-amount="30">30</button>
          <button type="button" class="price-chip" data-amount="50">50</button>
          <button type="button" class="price-chip" data-amount="60">60</button>
          <button type="button" class="price-chip" data-amount="0">0</button>
        </div>
        <button type="button" class="attendance-save-btn" data-id="${record.id}" disabled="">حفظ</button>
      </div>
      <span class="card-subject">📚 ${formatSubjects(record.subjects)}</span>
      <span class="card-label">كود الطالب</span>
      <span>${record.studentCode}</span>
      <span class="card-label">التاريخ</span>
      <span>${record.registrationDate}</span>
      ${versionsBadge}
    `;

    const actions = document.createElement('div');
    actions.className = 'record-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-button';
    editBtn.textContent = 'تعديل';
    editBtn.dataset.id = record.id;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-button';
    deleteBtn.textContent = 'حذف';
    deleteBtn.dataset.id = record.id;

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(image);
    card.appendChild(info);
    card.appendChild(actions);
    card.dataset.recordId = record.id;

    recordsList.appendChild(card);
  });
  renderDailyAccounts();
}

function clearForm() {
  form.reset();
  currentEditedId = null;
  editingIdInput.value = '';
  currentPhotoDataUrl = null;
  photoInput.value = '';
  studentCodeInput.value = generateStudentCode();
  registrationDateInput.value = '';
  updateDayName();
  cancelEditButton.style.display = 'none';
  previewImage.style.display = 'none';
  previewText.style.display = 'block';
  teacherNameSelect.value = '';
  teacherInput.value = '';
  teacherInput.style.display = 'none';
}

function handleEditClick(event) {
  const id = event.currentTarget.dataset.id;
  loadRecordForEdit(id);
}

function loadRecordForEdit(id) {
  const record = registrations.find((item) => item.id === id);
  if (!record) return;

  editingIdInput.value = record.id;
  currentEditedId = record.id;
  currentPhotoDataUrl = record.photoDataUrl || null;
  form.studentName.value = record.studentName;
  form.studentCode.value = record.studentCode;
  form.phoneNumber.value = record.phoneNumber;
  form.guardianNumber.value = record.guardianNumber;
  form.address.value = record.address;
  form.classGrade.value = record.classGrade;
  // عند فتح السجل للتعديل، يتم تعبئة التاريخ افتراضيًا بتاريخ اليوم
  // (لأن أي تعديل يُحفظ كتسجيل إضافي جديد). يمكن للمستخدم تغييره يدويًا
  // لأي تاريخ آخر، وفي هذه الحالة سيتم الحفظ بالتاريخ الذي تم اختياره يدويًا.
  form.registrationDate.value = getTodayDateString();
  updateDayName();
  syncTeacherSelectFromValue(record.teacherName);
  form.roomNumber.value = record.roomNumber || '';
  // خانات الفلوس بتتفتح صفر دايمًا عند الضغط على "تعديل"، لأن كل تعديل
  // بيتحفظ كتسجيل/دفعة جديدة منفصلة (مش تعديل على المبالغ القديمة).
  // النسخة القديمة نفسها بمبالغها الأصلية بتفضل محفوظة زي ما هي في السجل
  // ومتاحة من سجل النسخ جوه الكارت.
  form.lessonPrice.value = 0;
  form.remainingPrice.value = 0;
  form.bookPrice.value = 0;
  form.bookRemainingPrice.value = 0;
  form.presence.value = record.presence || '';
  form.querySelectorAll('input[name="subjects"]').forEach((checkbox) => {
    checkbox.checked = (record.subjects || []).includes(checkbox.value);
  });

  if (record.photoDataUrl) {
    previewImage.src = record.photoDataUrl;
    previewImage.style.display = 'block';
    previewText.style.display = 'none';
  } else {
    previewImage.style.display = 'none';
    previewText.style.display = 'block';
  }

  cancelEditButton.style.display = 'block';
  resultBox.style.display = 'none';
}

async function deleteRecord(id) {
  try {
    await deleteRecordFromFirestore(id);
    // renderRegistrations سيتم استدعاؤها تلقائيًا عبر onSnapshot
    if (currentEditedId === id) {
      clearForm();
    }
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء الحذف. حاول مرة أخرى.');
  }
}

async function deleteRecordVersion(id) {
  const wasCurrent = currentModalRecord?.id === id;
  const familyBeforeDelete = currentModalRecord ? getRecordVersions(currentModalRecord) : [];

  try {
    await deleteRecordFromFirestore(id);
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء حذف هذه النسخة. حاول مرة أخرى.');
    return;
  }

  if (currentEditedId === id) {
    clearForm();
  }

  if (!currentModalRecord) return;

  if (wasCurrent) {
    const remaining = familyBeforeDelete.filter((item) => item.id !== id);
    if (remaining.length) {
      // القائمة مرتبة تصاعديًا بالتاريخ، فآخر عنصر هو الأحدث
      openRecordModal(remaining[remaining.length - 1]);
    } else {
      closeRecordModal();
    }
  } else {
    // النسخة المعروضة حاليًا لسه موجودة، بس لازم نحدث القائمة عشان النسخة
    // المحذوفة تختفي من سجل النسخ.
    openRecordModal(currentModalRecord);
  }
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) {
    currentPhotoDataUrl = null;
    previewImage.style.display = 'none';
    previewText.textContent = 'لم يتم اختيار صورة بعد';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    currentPhotoDataUrl = reader.result;
    previewImage.src = currentPhotoDataUrl;
    previewImage.style.display = 'block';
    previewText.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// حقول "الهوية" اللي تعديلها لوحدها بيحدّث نفس السجل مباشرة من غير ما يعمل
// تسجيل/نسخة جديدة. أي حقل تاني (أسعار، حضور، مواد، عنوان، رقم ولي أمر،
// رقم قاعة...) لو اتغيّر بيعمل نسخة جديدة زي المعتاد.
const IDENTITY_ONLY_FIELDS = ['studentName', 'phoneNumber', 'classGrade', 'teacherName'];

function findDuplicateDateSibling(rootId, dateStr, excludeId) {
  if (!dateStr) return null;
  return registrations.find((item) =>
    item.id !== excludeId &&
    resolveRecordRootId(item) === rootId &&
    (item.registrationDate || '') === dateStr
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const formData = new FormData(form);
    const subjects = formData.getAll('subjects');
    const editingId = currentEditedId || editingIdInput.value;

    const existingRecord = registrations.find((item) => item.id === editingId);
    const photoName = photoInput.files[0]?.name || existingRecord?.photoName || 'لم يتم اختيار صورة';
    const photoDataUrl = currentPhotoDataUrl || existingRecord?.photoDataUrl || null;
    const isEditingExisting = Boolean(editingId && existingRecord);

    const submittedSubjects = subjects;
    const sameArray = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

    // خانات الفلوس بتتفتح صفر افتراضيًا عند التعديل (مش قيمة السجل القديم)،
    // فبنعتبرها "اتغيّرت فعلاً" بس لو المستخدم دخل رقم أكبر من صفر بنفسه.
    const moneyFieldsTouched = isEditingExisting && [
      formData.get('lessonPrice'),
      formData.get('remainingPrice'),
      formData.get('bookPrice'),
      formData.get('bookRemainingPrice'),
    ].some((value) => parseFloat(value) !== 0);

    const nonIdentityChanged = isEditingExisting && (
      moneyFieldsTouched ||
      (formData.get('presence') || 'غير محدد') !== (existingRecord.presence || 'غير محدد') ||
      (formData.get('address') || '') !== (existingRecord.address || '') ||
      (formData.get('guardianNumber') || '') !== (existingRecord.guardianNumber || '') ||
      (formData.get('roomNumber') || '') !== (existingRecord.roomNumber || '') ||
      !sameArray(submittedSubjects, existingRecord.subjects)
    );

    if (isEditingExisting && !nonIdentityChanged) {
      // بس بيانات الهوية (الاسم/الهاتف/الصف/المدرس) اتغيّرت (أو مفيش تغيير خالص) →
      // بنعدّل نفس السجل مباشرة من غير ما ننشئ تسجيل جديد، والسجل بيفضل بتاريخه
      // ومبالغه الأصلية زي ما هي.
      const updatedRecord = {
        ...existingRecord,
        studentName: formData.get('studentName'),
        phoneNumber: formData.get('phoneNumber'),
        classGrade: formData.get('classGrade'),
        teacherName: formData.get('teacherName'),
        studentCode: formData.get('studentCode') || existingRecord.studentCode,
      };
      await saveRecordToFirestore(updatedRecord);
      resultBox.textContent = 'تم تحديث بيانات الطالب مباشرة من غير إنشاء تسجيل جديد (التاريخ والمبالغ الأصلية لم تتغير).';
      resultBox.style.display = 'block';
      clearForm();
      return;
    }

    // من هنا: إما تسجيل جديد بالكامل، أو تعديل بيانات غير الهوية على سجل
    // موجود → في الحالتين ده بيتحفظ كتسجيل/نسخة إضافية جديدة.
    const newRecordId = isEditingExisting ? generateId() : (editingId || generateId());
    const rootId = isEditingExisting
      ? resolveRecordRootId(existingRecord)
      : (existingRecord?.rootId || newRecordId);

    const data = {
      id: newRecordId,
      studentName: formData.get('studentName'),
      studentCode: formData.get('studentCode'),
      phoneNumber: formData.get('phoneNumber'),
      guardianNumber: formData.get('guardianNumber'),
      address: formData.get('address'),
      classGrade: formData.get('classGrade'),
      registrationDate: formData.get('registrationDate'),
      lessonPrice: formData.get('lessonPrice'),
      remainingPrice: formData.get('remainingPrice'),
      bookPrice: formData.get('bookPrice'),
      bookRemainingPrice: formData.get('bookRemainingPrice') || '0',
      teacherName: formData.get('teacherName'),
      roomNumber: formData.get('roomNumber'),
      presence: formData.get('presence') || 'غير محدد',
      subjects,
      photoName,
      photoDataUrl,
      parentId: isEditingExisting ? editingId : (existingRecord?.parentId || null),
      rootId,
    };

    if (isEditingExisting) {
      const duplicate = findDuplicateDateSibling(rootId, data.registrationDate, existingRecord.id);
      if (duplicate) {
        const proceed = confirm(
          `الطالب "${data.studentName}" مسجل بالفعل في تاريخ ${data.registrationDate}.\nهل تريد تسجيل تسجيل آخر له في نفس اليوم؟`
        );
        if (!proceed) {
          resultBox.textContent = 'تم إلغاء الحفظ.';
          resultBox.style.display = 'block';
          return;
        }
      }
    }

    await saveRecordToFirestore(data);

    if (editingId) {
      resultBox.textContent = `تم حفظ التعديل كتسجيل إضافي جديد بتاريخ (${data.registrationDate})، والسجل الأصلي محفوظ كما هو.`;
    } else {
      resultBox.textContent = 'تم حفظ التسجيل بنجاح.';
    }

    resultBox.style.display = 'block';
    clearForm();
  } catch (error) {
    console.error(error);
    resultBox.textContent = 'حدث خطأ أثناء الحفظ. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.';
    resultBox.style.display = 'block';
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

cancelEditButton.addEventListener('click', () => {
  clearForm();
});

const searchTypePlaceholders = {
  name: 'ابحث بالاسم',
  code: 'ابحث بكود الطالب',
  phone: 'ابحث برقم الهاتف',
};

function updateSearchPlaceholder() {
  const type = getSelectedSearchType();
  searchInput.placeholder = searchTypePlaceholders[type] || 'ابحث';
}

updateSearchPlaceholder();

searchTypeInputs.forEach((input) => {
  input.addEventListener('change', () => {
    updateSearchPlaceholder();
    renderRegistrations(searchInput.value, gradeFilter.value);
  });
});

searchInput.addEventListener('input', () => renderRegistrations(searchInput.value, gradeFilter.value));
modalCloseBtn.addEventListener('click', closeRecordModal);
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    closeRecordModal();
  }
});

versionModalCloseBtn.addEventListener('click', closeVersionPopup);
versionModalOverlay.addEventListener('click', (event) => {
  if (event.target === versionModalOverlay) {
    closeVersionPopup();
  }
});

function handleCardActionClick(event, record) {
  const editBtn = event.target.closest('[data-action="edit"]');
  if (editBtn && record) {
    closeVersionPopup();
    closeRecordModal();
    loadRecordForEdit(record.id);
    return true;
  }

  const whatsappBtn = event.target.closest('[data-action="whatsapp"]');
  if (whatsappBtn && record) {
    sendStudentDataToWhatsapp(record);
    return true;
  }

  const deleteBtn = event.target.closest('[data-action="delete"]');
  if (deleteBtn && record) {
    if (confirm(`هل تريد حذف تسجيل "${record.studentName}" فعلاً؟ لا يمكن التراجع بعد الحذف.`)) {
      const wasInVersionPopup = Boolean(currentVersionPopupRecord) && currentVersionPopupRecord.id === record.id;
      deleteRecordVersion(record.id);
      if (wasInVersionPopup) closeVersionPopup();
    }
    return true;
  }

  return false;
}

modalBody.addEventListener('click', (event) => {
  const versionDeleteBtn = event.target.closest('.version-delete-button');
  if (versionDeleteBtn) {
    const versionId = versionDeleteBtn.dataset.versionId;
    if (confirm('هل تريد مسح هذه النسخة فعلاً؟ لا يمكن التراجع بعد الحذف.')) {
      deleteRecordVersion(versionId);
    }
    return;
  }

  const versionBtn = event.target.closest('.version-view-button');
  if (versionBtn) {
    const versionRecord = registrations.find((item) => item.id === versionBtn.dataset.versionId);
    if (versionRecord) openVersionPopup(versionRecord);
    return;
  }

  handleCardActionClick(event, currentModalRecord);
});

versionModalBody.addEventListener('click', (event) => {
  handleCardActionClick(event, currentVersionPopupRecord);
});
registrationDateInput.addEventListener('change', updateDayName);
openAccountsButton.addEventListener('click', () => {
  drawerOverlay.classList.add('active');
  renderDailyAccounts();
});
drawerCloseButton.addEventListener('click', () => {
  drawerOverlay.classList.remove('active');
});
drawerOverlay.addEventListener('click', (event) => {
  if (event.target === drawerOverlay) {
    drawerOverlay.classList.remove('active');
  }
});
const SCHEDULE_DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const SCHEDULE_PRICE_LABELS = ['أولى', 'ثانية', 'ثالثة', 'رابعة', 'خامسة', 'سادسة'];

function getSchedulePriceColumnCount(table) {
  // عدد أعمدة "سعر الحجز" يختلف حسب القسم (ابتدائي/كورسات = 6 صفوف، اعدادي/ثانوي = 3 صفوف فقط)
  // بيتم تحديده ديناميكيًا من عدد أعمدة الجدول (colspan) بدل الافتراض الثابت 6
  const priceHeaderTh = table.querySelector('thead tr:first-child th:nth-child(3)');
  const colspan = Number(priceHeaderTh?.getAttribute('colspan')) || 6;
  return colspan;
}

function getScheduleSectionTables() {
  return Array.from(document.querySelectorAll('.schedule-section')).map((section) => ({
    title: section.querySelector('h3')?.textContent.trim() || '',
    table: section.querySelector('table'),
  }));
}

function getTeacherNamesForSection(sectionIndex) {
  const table = getScheduleSectionTables()[sectionIndex]?.table;
  if (!table) return [];
  const names = new Set();
  table.querySelectorAll('tbody tr').forEach((row) => {
    const nameInput = row.querySelector('td:nth-child(1) input');
    const value = nameInput?.value.trim();
    if (value) names.add(value);
  });
  return Array.from(names);
}

function getGradeNamesForSection(sectionIndex) {
  const table = getScheduleSectionTables()[sectionIndex]?.table;
  if (!table) return [];
  const firstRow = table.querySelector('tbody tr');
  if (!firstRow) return [];
  const priceColumnCount = getSchedulePriceColumnCount(table);
  const firstDayCell = firstRow.querySelectorAll('td')[2 + priceColumnCount];
  if (!firstDayCell) return [];
  const grades = [];
  firstDayCell.querySelectorAll('.grade-checkboxes label').forEach((label) => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    const gradeText = label.textContent.trim();
    if (checkbox && gradeText && !grades.includes(gradeText)) {
      grades.push(gradeText);
    }
  });
  return grades;
}

function populateScheduleTeacherSelect() {
  const sectionIndex = Number(scheduleSendSection.value);
  const teachers = getTeacherNamesForSection(sectionIndex);
  scheduleSendTeacher.innerHTML = '<option value="">اختر المدرس</option>' +
    teachers.map((name) => `<option value="${name}">${name}</option>`).join('');

  const grades = getGradeNamesForSection(sectionIndex);
  scheduleSendGrade.innerHTML = '<option value="">كل الصفوف</option>' +
    grades.map((name) => `<option value="${name}">${name}</option>`).join('');
}

function collectTeacherScheduleRows(sectionIndex, teacherName, gradeFilter = '') {
  const table = getScheduleSectionTables()[sectionIndex]?.table;
  if (!table) return [];

  const priceColumnCount = getSchedulePriceColumnCount(table);
  const targetName = teacherName.trim().toLowerCase();
  const rows = [];

  table.querySelectorAll('tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    const rowName = (cells[0]?.querySelector('input')?.value || '').trim();
    if (rowName.toLowerCase() !== targetName) return;

    const subject = cells[1]?.querySelector('input')?.value.trim() || '-';

    const prices = [];
    for (let i = 0; i < priceColumnCount; i += 1) {
      const value = cells[2 + i]?.querySelector('input')?.value.trim();
      if (value) prices.push(`${SCHEDULE_PRICE_LABELS[i]}: ${value}`);
    }

    const days = [];
    for (let d = 0; d < 7; d += 1) {
      const dayCell = cells[2 + priceColumnCount + d];
      if (!dayCell) continue;
      const entries = [];
      dayCell.querySelectorAll('.grade-checkboxes label').forEach((label) => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const gradeText = label.textContent.trim();
        const timeValue = label.querySelector('.schedule-time-input')?.value.trim();

        if (gradeFilter && gradeText !== gradeFilter) return;
        // نعرض اليوم لو الصف متأشر عليه، أو لو فيه توقيت مكتوب حتى لو نسي حد يحدد المربع
        if (!checkbox?.checked && !timeValue) return;

        entries.push(timeValue ? `${gradeText} (${timeValue})` : gradeText);
      });
      if (entries.length) {
        days.push(`${SCHEDULE_DAY_NAMES[d]}: ${entries.join('، ')}`);
      }
    }

    rows.push({ subject, prices, days });
  });

  return rows;
}


// ==========================================================
// حفظ بيانات جدول الحجز (Firestore) — قبل كده كانت خانات السعر/التوقيت/الصفوف
// في جدول الحجز مالهاش أي حفظ خالص، أي بيانات بتتكتب فيها كانت بتتفقد
// بمجرد عمل refresh للصفحة لأنها كانت عايشة في المتصفح بس. دلوقتي بتتخزن
// في Firestore وترجع تلقائيًا مع أي فتح للصفحة أو من أي جهاز.
// ==========================================================
const SCHEDULE_STATE_DOC_REF = doc(db, 'app_state', 'schedule');
let suppressScheduleAutoSave = false;

function serializeScheduleState() {
  const sections = getScheduleSectionTables().map(({ table }) => {
    if (!table) return { rows: [] };
    const priceColumnCount = getSchedulePriceColumnCount(table);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) => {
      const cells = row.querySelectorAll('td');
      const teacherName = cells[0]?.querySelector('input')?.value ?? '';
      const subject = cells[1]?.querySelector('input')?.value ?? '';

      const prices = [];
      for (let i = 0; i < priceColumnCount; i += 1) {
        prices.push(cells[2 + i]?.querySelector('input')?.value ?? '');
      }

      const days = [];
      for (let d = 0; d < 7; d += 1) {
        const dayCell = cells[2 + priceColumnCount + d];
        const grades = [];
        dayCell?.querySelectorAll('.grade-checkboxes label').forEach((label) => {
          const checkbox = label.querySelector('input[type="checkbox"]');
          const timeInput = label.querySelector('.schedule-time-input');
          grades.push({ checked: !!checkbox?.checked, time: timeInput?.value ?? '' });
        });
        // ملحوظة: Firestore مش بيقبل array جوه array مباشرة، فبنلف الـ grades
        // جوه object ({ grades }) بدل ما نحطها كـ array مباشر داخل days.
        days.push({ grades });
      }

      return { teacherName, subject, prices, days };
    });
    return { rows };
  });
  return { sections, updatedAt: Date.now() };
}

function applyScheduleState(state) {
  if (!state || !Array.isArray(state.sections)) return;
  const tables = getScheduleSectionTables();

  state.sections.forEach((sectionState, sectionIndex) => {
    const table = tables[sectionIndex]?.table;
    if (!table || !sectionState?.rows) return;

    const priceColumnCount = getSchedulePriceColumnCount(table);
    const rows = table.querySelectorAll('tbody tr');

    sectionState.rows.forEach((rowState, rowIndex) => {
      const row = rows[rowIndex];
      if (!row) return;
      const cells = row.querySelectorAll('td');

      if (rowState.teacherName !== undefined) {
        const teacherInput = cells[0]?.querySelector('input');
        if (teacherInput) teacherInput.value = rowState.teacherName;
      }
      if (rowState.subject !== undefined) {
        const subjectInput = cells[1]?.querySelector('input');
        if (subjectInput) subjectInput.value = rowState.subject;
      }

      (rowState.prices || []).forEach((value, i) => {
        const priceInput = cells[2 + i]?.querySelector('input');
        if (priceInput) priceInput.value = value ?? '';
      });

      (rowState.days || []).forEach((dayEntry, d) => {
        const dayCell = cells[2 + priceColumnCount + d];
        if (!dayCell) return;
        const gradeStates = dayEntry?.grades || [];
        const labels = dayCell.querySelectorAll('.grade-checkboxes label');
        gradeStates.forEach((gradeState, gradeIndex) => {
          const label = labels[gradeIndex];
          if (!label) return;
          const checkbox = label.querySelector('input[type="checkbox"]');
          const timeInput = label.querySelector('.schedule-time-input');
          if (checkbox) checkbox.checked = !!gradeState.checked;
          if (timeInput) timeInput.value = gradeState.time ?? '';
        });
      });
    });
  });
}

let scheduleSaveTimeoutId = null;
let scheduleErrorAlertShown = false;
function warnScheduleErrorOnce(messageText) {
  if (scheduleErrorAlertShown) return;
  scheduleErrorAlertShown = true;
  alert(messageText);
}

function queueScheduleAutoSave() {
  if (suppressScheduleAutoSave) return;
  clearTimeout(scheduleSaveTimeoutId);
  scheduleSaveTimeoutId = setTimeout(async () => {
    try {
      await setDoc(SCHEDULE_STATE_DOC_REF, serializeScheduleState());
    } catch (error) {
      console.error('تعذر حفظ بيانات جدول الحجز:', error);
      warnScheduleErrorOnce('⚠️ تعذر حفظ بيانات جدول الحجز! تأكد من صلاحيات Firestore (app_state) أو من الاتصال بالإنترنت، وإلا هتضيع البيانات اللي بتدخلها عند تحديث الصفحة.');
    }
  }, 600);
}

onSnapshot(SCHEDULE_STATE_DOC_REF, (snap) => {
  // نتجاهل الصدى المحلي لتحديثاتنا احنا (لسه بيتكتب على السيرفر) عشان
  // منقاطعش المستخدم وهو بيكتب في خانة السعر/التوقيت.
  if (snap.metadata.hasPendingWrites) return;
  if (snap.exists()) {
    suppressScheduleAutoSave = true;
    applyScheduleState(snap.data());
    suppressScheduleAutoSave = false;
  }
}, (error) => {
  console.error('خطأ في تحميل بيانات جدول الحجز:', error);
  warnScheduleErrorOnce('⚠️ تعذر تحميل بيانات جدول الحجز المحفوظة! تأكد من صلاحيات Firestore (app_state) أو من الاتصال بالإنترنت.');
});

const scheduleSectionsContainer = document.querySelector('.schedule-sections');
if (scheduleSectionsContainer) {
  scheduleSectionsContainer.addEventListener('input', queueScheduleAutoSave);
  scheduleSectionsContainer.addEventListener('change', queueScheduleAutoSave);
}

function sendTeacherScheduleWhatsapp() {
  const sectionIndex = Number(scheduleSendSection.value);
  const sectionLabel = getScheduleSectionTables()[sectionIndex]?.title || '';
  const teacherNames = Array.from(scheduleSendTeacher.selectedOptions)
    .map((option) => option.value)
    .filter(Boolean);
  const gradeFilter = scheduleSendGrade.value;
  const phoneRaw = scheduleSendWhatsappNumber.value.trim();

  if (!teacherNames.length) {
    alert('يرجى اختيار مدرس واحد على الأقل (تقدر تختار أكتر من مدرس بالضغط مع Ctrl أو Cmd).');
    return;
  }
  if (!phoneRaw) {
    alert('يرجى إدخال رقم الواتساب.');
    return;
  }

  const teacherBlocks = [];
  const missingTeachers = [];

  teacherNames.forEach((teacherName) => {
    const rows = collectTeacherScheduleRows(sectionIndex, teacherName, gradeFilter);
    if (!rows.length) {
      missingTeachers.push(teacherName);
      return;
    }

    let block = `👨‍🏫 *${teacherName}*\n`;
    rows.forEach((row, index) => {
      block += `📖 المادة: ${row.subject}\n`;
      if (row.prices.length) {
        block += `💰 أسعار الحجز: ${row.prices.join(' | ')}\n`;
      }
      if (row.days.length) {
        block += `🗓️ المواعيد:\n${row.days.map((d) => `   • ${d}`).join('\n')}\n`;
      }
      if (index < rows.length - 1) block += '\n';
    });
    teacherBlocks.push(block);
  });

  if (!teacherBlocks.length) {
    alert('لا يوجد جدول مسجل لأي من المدرسين المختارين (أو لهذا الصف الدراسي) حاليًا. تأكد من ملء بياناتهم في الجدول أولاً.');
    return;
  }

  let message = `*جدول حجز - ${sectionLabel}*\n`;
  if (gradeFilter) {
    message += `🎓 الصف الدراسي: ${gradeFilter}\n`;
  }
  message += `\n${teacherBlocks.join('\n---\n\n')}`;
  if (missingTeachers.length) {
    message += `\n\n⚠️ لا يوجد جدول لـ: ${missingTeachers.join('، ')}`;
  }
  message += `\n\n---\n${WHATSAPP_REPLY_REMINDER_TEXT}\nتم الإرسال من نظام أكاديمية Full Mark`;

  const phoneDigits = phoneRaw.replace(/\D/g, '');
  let formattedPhone = phoneDigits;
  if (phoneDigits.startsWith('0')) {
    formattedPhone = '20' + phoneDigits.substring(1);
  } else if (!phoneDigits.startsWith('20')) {
    formattedPhone = '20' + phoneDigits;
  }

  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

openScheduleButton.addEventListener('click', () => {
  scheduleOverlay.classList.add('active');
  populateScheduleTeacherSelect();
});
scheduleSendSection.addEventListener('change', populateScheduleTeacherSelect);
scheduleSendButton.addEventListener('click', sendTeacherScheduleWhatsapp);
scheduleCloseButton.addEventListener('click', () => {
  scheduleOverlay.classList.remove('active');
});
scheduleOverlay.addEventListener('click', (event) => {
  if (event.target === scheduleOverlay) {
    scheduleOverlay.classList.remove('active');
  }
});
accountDateFrom.addEventListener('change', renderDailyAccounts);
accountDateTo.addEventListener('change', renderDailyAccounts);
accountStudentFilter.addEventListener('input', renderDailyAccounts);
accountTeacherFilter.addEventListener('input', renderDailyAccounts);
accountTeacherMultiselect.addEventListener('change', renderDailyAccounts);
accountGradeMultiselect.addEventListener('change', renderDailyAccounts);
accountResetButton.addEventListener('click', () => {
  accountDateFrom.value = '';
  accountDateTo.value = '';
  accountStudentFilter.value = '';
  accountTeacherFilter.value = '';
  accountTeacherMultiselect.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = false; });
  accountGradeMultiselect.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = false; });
  renderDailyAccounts();
});
document.getElementById('send-accounts-whatsapp').addEventListener('click', sendAccountsToWhatsapp);
generateCodeButton.addEventListener('click', () => {
  studentCodeInput.value = generateStudentCode();
});
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', () => {
  sessionStorage.removeItem('fullMarkLoggedIn');
  lockApp();
});

function toggleCalculator() {
  const calc = document.getElementById('calculator-widget');
  if (calc) calc.classList.toggle('active');
}
window.toggleCalculator = toggleCalculator;

let calcDisplayValue = '';
function appendToDisplay(value) {
  calcDisplayValue += value;
  const display = document.getElementById('calc-display');
  if (display) display.value = calcDisplayValue;
}
window.appendToDisplay = appendToDisplay;

function clearDisplay() {
  calcDisplayValue = '';
  const display = document.getElementById('calc-display');
  if (display) display.value = '';
}
window.clearDisplay = clearDisplay;

function calculateResult() {
  const display = document.getElementById('calc-display');
  try {
    // eslint-disable-next-line no-eval
    calcDisplayValue = String(Function(`"use strict"; return (${calcDisplayValue})`)());
    if (display) display.value = calcDisplayValue;
  } catch (error) {
    if (display) display.value = 'خطأ';
    calcDisplayValue = '';
  }
}
window.calculateResult = calculateResult;

gradeFilter.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsTeacherFilter.addEventListener('input', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsAttendanceFilter.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsSubjectFilter.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsDateFrom.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsDateTo.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));

async function quickAttendanceSave(record, presenceValue, lessonPriceValue) {
  const rootId = resolveRecordRootId(record);
  const todayDate = getTodayDateString();

  const duplicate = findDuplicateDateSibling(rootId, todayDate, null);
  if (duplicate) {
    const proceed = confirm(
      `الطالب "${record.studentName}" مسجل بالفعل في تاريخ ${todayDate}.\nهل تريد تسجيل تسجيل آخر له في نفس اليوم؟`
    );
    if (!proceed) return;
  }

  const newRecordId = generateId();

  const data = {
    id: newRecordId,
    studentName: record.studentName || '',
    studentCode: record.studentCode || '',
    phoneNumber: record.phoneNumber || '',
    guardianNumber: record.guardianNumber || '',
    address: record.address || '',
    classGrade: record.classGrade || '',
    registrationDate: todayDate,
    lessonPrice: String(lessonPriceValue ?? 0),
    remainingPrice: '0',
    bookPrice: '0',
    bookRemainingPrice: '0',
    teacherName: record.teacherName || '',
    roomNumber: record.roomNumber || '',
    presence: presenceValue,
    subjects: record.subjects || [],
    photoName: record.photoName || 'لم يتم اختيار صورة',
    photoDataUrl: record.photoDataUrl || null,
    parentId: record.id,
    rootId,
  };

  await saveRecordToFirestore(data);
  // renderRegistrations هتتحدث تلقائيًا عبر onSnapshot بعد الحفظ.
  sendStudentDataToWhatsapp(data);
}

recordsList.addEventListener('click', (event) => {
  const whatsappStatusBadge = event.target.closest('.whatsapp-status-badge');
  if (whatsappStatusBadge) {
    toggleWhatsappSentStatus(whatsappStatusBadge.dataset.id);
    return;
  }

  const presentBtn = event.target.closest('.present-btn');
  if (presentBtn) {
    const id = presentBtn.dataset.id;
    // نقفل أي پانل تاني كان متفتح لكارت مختلف، ونفتح/نقفل پانل الكارت ده.
    recordsList.querySelectorAll('.attendance-price-panel').forEach((panel) => {
      if (panel.dataset.panelFor !== id) panel.style.display = 'none';
    });
    const panel = recordsList.querySelector(`.attendance-price-panel[data-panel-for="${id}"]`);
    if (panel) {
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      panel.querySelectorAll('.price-chip').forEach((chip) => chip.classList.remove('selected'));
      const saveBtn = panel.querySelector('.attendance-save-btn');
      if (saveBtn) { saveBtn.disabled = true; delete saveBtn.dataset.amount; }
    }
    return;
  }

  const absentBtn = event.target.closest('.absent-btn');
  if (absentBtn) {
    const id = absentBtn.dataset.id;
    const record = registrations.find((item) => item.id === id);
    if (record && confirm(`تسجيل "${record.studentName}" غائب النهاردة وإرسال إشعار على الواتس؟`)) {
      quickAttendanceSave(record, 'غائب', 0);
    }
    return;
  }

  const priceChip = event.target.closest('.price-chip');
  if (priceChip) {
    const panel = priceChip.closest('.attendance-price-panel');
    if (panel) {
      panel.querySelectorAll('.price-chip').forEach((chip) => chip.classList.remove('selected'));
      priceChip.classList.add('selected');
      const saveBtn = panel.querySelector('.attendance-save-btn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.dataset.amount = priceChip.dataset.amount;
      }
    }
    return;
  }

  const attendanceSaveBtn = event.target.closest('.attendance-save-btn');
  if (attendanceSaveBtn && !attendanceSaveBtn.disabled) {
    const id = attendanceSaveBtn.dataset.id;
    const amount = attendanceSaveBtn.dataset.amount;
    const record = registrations.find((item) => item.id === id);
    const panel = attendanceSaveBtn.closest('.attendance-price-panel');
    if (record && amount) {
      quickAttendanceSave(record, 'حاضر', amount);
      if (panel) panel.style.display = 'none';
    }
    return;
  }

  const editBtn = event.target.closest('.edit-button');
  if (editBtn) {
    loadRecordForEdit(editBtn.dataset.id);
    return;
  }

  const deleteBtn = event.target.closest('.delete-button');
  if (deleteBtn) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      deleteRecord(deleteBtn.dataset.id);
    }
    return;
  }

  // أي ضغطة تانية جوه پانل سعر الحصة (زي التسمية أو المساحة الفاضية)
  // متفتحش المودال بالغلط.
  if (event.target.closest('.attendance-price-panel')) {
    return;
  }

  const card = event.target.closest('.record-card');
  if (card) {
    const record = registrations.find((item) => item.id === card.dataset.recordId);
    if (record) openRecordModal(record);
  }
});

// حالة تسجيل الدخول
if (sessionStorage.getItem('fullMarkLoggedIn') === 'true') {
  unlockApp();
} else {
  lockApp();
}

// تهيئة أولية للنموذج (سيتم إعادة توليد الكود بعد وصول أول snapshot من Firestore)
studentCodeInput.value = generateStudentCode();
