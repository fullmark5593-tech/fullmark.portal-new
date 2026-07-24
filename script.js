import { db } from './firebase-config.js';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
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
const searchInput = document.getElementById('search-input');
const gradeFilter = document.getElementById('gradeFilter');
const modalOverlay = document.getElementById('record-modal');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close');
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
const accountGradeFilter = document.getElementById('account-grade-filter');
const recordsTeacherFilter = document.getElementById('records-teacher-filter');
const recordsAttendanceFilter = document.getElementById('records-attendance-filter');
const recordsDateFrom = document.getElementById('records-date-from');
const recordsDateTo = document.getElementById('records-date-to');
const generateCodeButton = document.getElementById('generate-code');
const teacherInput = document.getElementById('teacher-name');
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
  let current = record;
  const visited = new Set();
  while (current && current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = registrations.find((item) => item.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current ? current.id : record.id;
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

function openRecordModal(record) {
  currentModalRecord = record;
  const versions = getRecordVersions(record);
  const versionsHtml = versions.length > 1 ? `
    <div class="modal-row" style="flex-direction: column; align-items: stretch; margin-top: 6px;">
      <strong style="margin-bottom: 8px;">🗂️ سجل نسخ التعديل لهذا الطالب (${versions.length} نسخة)</strong>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${versions.map((version) => `
          <div class="version-item" style="position: relative;">
            <button type="button" class="version-view-button" data-version-id="${version.id}"
              style="width: 100%; text-align: right; padding: 8px 30px 8px 12px; border-radius: 10px; cursor: pointer; border: 1px solid ${version.id === record.id ? '#2563eb' : '#cbd5e1'}; background: ${version.id === record.id ? 'rgba(37, 99, 235, 0.12)' : '#ffffff'}; color: #111827;">
              📅 ${version.registrationDate || 'غير محدد'}${version.id === record.id ? '  •  النسخة المعروضة الآن' : ''}
              <br><span style="font-size: 12px; color: #475569;">المادة: ${formatSubjects(version.subjects)} — الحضور: ${version.presence || 'غير محدد'} — المتبقي: ${version.remainingPrice ?? 0} — المدرس: ${version.teacherName || '-'}</span>
            </button>
            <button type="button" class="version-delete-button" data-version-id="${version.id}" title="حذف هذه النسخة"
              style="position: absolute; left: 8px; top: 8px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #fee2e2; color: #dc2626; font-size: 11px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  modalBody.innerHTML = `
    <h3>${record.studentName}</h3>
    <div class="modal-row">
      <div>
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
      <span><strong>سعر الكتاب:</strong> ${record.bookPrice}</span>
      <span><strong>المتبقي من سعر الكتاب:</strong> ${record.bookRemainingPrice ?? 0}</span>
      <span><strong>الحضور:</strong> ${record.presence || 'غير محدد'}</span>
      <span><strong>المواد:</strong> ${formatSubjects(record.subjects)}</span>
    </div>
    ${versionsHtml}
    <div style="display: flex; gap: 10px; margin-top: 15px;">
      <button type="button" id="modal-edit-button" class="modal-edit-button">فتح للتعديل</button>
      <button type="button" id="modal-whatsapp-button" class="modal-edit-button" style="background: #25d366;">ارسال عبر واتس</button>
    </div>
  `;
  modalOverlay.classList.add('active');
  modalOverlay.setAttribute('aria-hidden', 'false');
}

function closeRecordModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.setAttribute('aria-hidden', 'true');
}

function formatSubjects(subjects) {
  return subjects && subjects.length ? subjects.join('، ') : 'لا توجد مواد محددة';
}

function sendStudentDataToWhatsapp(record) {
  if (!record.guardianNumber) {
    alert('لا يوجد رقم واتس اب لولي الأمر');
    return;
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
📄 سعر الكتاب: ${record.bookPrice}
📑 المتبقي من سعر الكتاب: ${record.bookRemainingPrice ?? 0}

📍 العنوان: ${record.address}
✅ الحضور: ${record.presence || 'غير محدد'}

---
تم الإرسال من نظام أكاديمية Full Mark
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

function getFilteredAccountRegistrations() {
  const dateFrom = accountDateFrom.value;
  const dateTo = accountDateTo.value;
  const studentFilter = accountStudentFilter.value.trim().toLowerCase();
  const teacherFilter = accountTeacherFilter.value.trim().toLowerCase();

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
  if (accountGradeFilter.value !== 'all') {
    filteredRegistrations = filteredRegistrations.filter(record =>
      matchesGradeFilter(record, accountGradeFilter.value)
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
    messageContent += `   📄 إجمالي سعر الكتب: ${formatCurrency(daySummary.bookTotal)}\n`;
    messageContent += `   📑 إجمالي المتبقي من سعر الكتب: ${formatCurrency(daySummary.bookRemainingTotal)}\n\n`;

    messageContent += `   *التفاصيل:*\n`;
    daySummary.records.forEach((record) => {
      const lessonPrice = parseFloat(record.lessonPrice) || 0;
      const remainingPrice = parseFloat(record.remainingPrice) || 0;
      const bookPrice = parseFloat(record.bookPrice) || 0;
      const bookRemainingPrice = parseFloat(record.bookRemainingPrice) || 0;
      messageContent += `   • ${record.studentName} (${record.studentCode}) - ${record.classGrade || '-'} - ${record.teacherName || '-'}\n`;
      messageContent += `     السعر: ${formatCurrency(lessonPrice)} | المتبقي: ${formatCurrency(remainingPrice)} | الكتاب: ${formatCurrency(bookPrice)} | متبقي الكتاب: ${formatCurrency(bookRemainingPrice)}\n`;
    });

    messageContent += `\n${'─'.repeat(50)}\n\n`;
  });

  messageContent += `تم الإرسال من نظام أكاديمية Full Mark`;

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

function matchSearch(record, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  return (
    String(record.studentName || '').toLowerCase().includes(q) ||
    String(record.phoneNumber || '').toLowerCase().includes(q) ||
    String(record.studentCode || '').toLowerCase().includes(q) ||
    String(record.guardianNumber || '').toLowerCase().includes(q)
  );
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
      <div class="daily-summary-item"><span>إجمالي سعر الكتب: <strong>${formatCurrency(daySummary.bookTotal)}</strong></span></div>
      <div class="daily-summary-item"><span>إجمالي المتبقي من سعر الكتب: <strong>${formatCurrency(daySummary.bookRemainingTotal)}</strong></span></div>
    `;
    summaryGrid.appendChild(card);

    const dayRecords = document.createElement('div');
    dayRecords.className = 'daily-record-item';
    dayRecords.innerHTML = `
      <h4>تفاصيل التسجيلات ليوم ${daySummary.date}</h4>
      ${daySummary.records
        .map((record) => {
          const lessonPrice = parseFloat(record.lessonPrice) || 0;
          const remainingPrice = parseFloat(record.remainingPrice) || 0;
          const bookPrice = parseFloat(record.bookPrice) || 0;
          const bookRemainingPrice = parseFloat(record.bookRemainingPrice) || 0;
          return `<span><strong>${record.studentName}</strong> - كود: ${record.studentCode} - الصف: ${record.classGrade || '-'} - المدرس: ${record.teacherName || '-'} - سعر الحصة: ${formatCurrency(lessonPrice)} - المبلغ المتبقي: ${formatCurrency(remainingPrice)} - سعر الكتاب: ${formatCurrency(bookPrice)} - المتبقي من سعر الكتاب: ${formatCurrency(bookRemainingPrice)}</span>`;
        })
        .join('')}
    `;
    recordsContainer.appendChild(dayRecords);
  });

  summaryContainer.appendChild(summaryGrid);
}

function renderRegistrations(filterText = '', gradeFilterValue = 'all') {
  recordsList.innerHTML = '';
  let filtered = registrations.filter((record) => matchSearch(record, filterText));

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

  const hasActiveFilters = filterText || gradeFilterValue !== 'all' || teacherFilterValue || (attendanceFilterValue && attendanceFilterValue !== 'all') || dateFromValue || dateToValue;

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
    image.src = record.photoDataUrl || '';
    image.alt = record.studentName;
    if (!record.photoDataUrl) {
      image.style.background = '#e2e8f0';
    }

    const info = document.createElement('div');
    info.className = 'card-info';
    const versionCount = getRecordVersions(record).length;
    const versionsBadge = versionCount > 1
      ? `<span class="card-label">🗂️ عدد النسخ</span><span>${versionCount} (اضغط لعرض السجل)</span>`
      : '';
    info.innerHTML = `
      <strong>${record.studentName}</strong>
      <span class="card-label">كود الطالب</span>
      <span>${record.studentCode}</span>
      <span class="card-label">التاريخ</span>
      <span>${record.registrationDate}</span>
      <span class="card-label">رقم السجل</span>
      <span>${record.id}</span>
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
  form.teacherName.value = record.teacherName || '';
  form.roomNumber.value = record.roomNumber || '';
  form.lessonPrice.value = record.lessonPrice;
  form.remainingPrice.value = record.remainingPrice;
  form.bookPrice.value = record.bookPrice;
  form.bookRemainingPrice.value = record.bookRemainingPrice ?? 0;
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

    // أي تعديل على سجل موجود ومحفوظ بالفعل يتم حفظه كتسجيل إضافي جديد.
    // التاريخ يكون افتراضيًا تاريخ اليوم (تم تعبئته تلقائيًا عند فتح السجل للتعديل)،
    // إلا إذا قام المستخدم بتغييره يدويًا فيتم اعتماد التاريخ الذي اختاره.
    // السجل الأصلي يظل كما هو بدون أي تغيير في كل الأحوال.
    const isEditingExisting = Boolean(editingId && existingRecord);

    const data = {
      id: isEditingExisting ? generateId() : (editingId || generateId()),
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
    };

    await saveRecordToFirestore(data);

    if (editingId) {
      resultBox.textContent = isEditingExisting
        ? `تم حفظ التعديل كتسجيل إضافي جديد بتاريخ (${data.registrationDate})، والسجل الأصلي محفوظ كما هو.`
        : 'تم تحديث البيانات بنجاح.';
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

searchInput.addEventListener('input', () => renderRegistrations(searchInput.value, gradeFilter.value));
modalCloseBtn.addEventListener('click', closeRecordModal);
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    closeRecordModal();
  }
});

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
    if (versionRecord) openRecordModal(versionRecord);
    return;
  }

  const editBtn = event.target.closest('#modal-edit-button');
  if (editBtn && currentModalRecord) {
    closeRecordModal();
    loadRecordForEdit(currentModalRecord.id);
    return;
  }

  const whatsappBtn = event.target.closest('#modal-whatsapp-button');
  if (whatsappBtn && currentModalRecord) {
    sendStudentDataToWhatsapp(currentModalRecord);
    return;
  }
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
        days.push(grades);
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

      (rowState.days || []).forEach((gradeStates, d) => {
        const dayCell = cells[2 + priceColumnCount + d];
        if (!dayCell) return;
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
  message += `\n\n---\nتم الإرسال من نظام أكاديمية Full Mark`;

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
accountGradeFilter.addEventListener('change', renderDailyAccounts);
accountResetButton.addEventListener('click', () => {
  accountDateFrom.value = '';
  accountDateTo.value = '';
  accountStudentFilter.value = '';
  accountTeacherFilter.value = '';
  accountGradeFilter.value = 'all';
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
recordsDateFrom.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));
recordsDateTo.addEventListener('change', () => renderRegistrations(searchInput.value, gradeFilter.value));

recordsList.addEventListener('click', (event) => {
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
