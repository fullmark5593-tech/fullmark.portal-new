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
const accountDateFilter = document.getElementById('account-date-filter');
const accountResetButton = document.getElementById('account-reset');
const accountTeacherFilter = document.getElementById('account-teacher-filter');
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

let currentModalRecord = null;

function openRecordModal(record) {
  currentModalRecord = record;
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
      <span><strong>الحضور:</strong> ${record.presence || 'غير محدد'}</span>
      <span><strong>المواد:</strong> ${formatSubjects(record.subjects)}</span>
    </div>
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

📍 العنوان: ${record.address}
✅ الحضور: ${record.presence || 'غير محدد'}

---
تم الإرسال من نظام أكاديمية Full Mark
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
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

  const selectedDate = accountDateFilter.value;
  const teacherFilter = accountTeacherFilter.value.trim().toLowerCase();

  let filteredRegistrations = registrations;
  if (selectedDate) {
    filteredRegistrations = filteredRegistrations.filter(record => record.registrationDate === selectedDate);
  }
  if (teacherFilter) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      (record.teacherName || '').toLowerCase().includes(teacherFilter)
    );
  }

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
    messageContent += `   📄 إجمالي سعر الكتب: ${formatCurrency(daySummary.bookTotal)}\n\n`;

    messageContent += `   *التفاصيل:*\n`;
    daySummary.records.forEach((record) => {
      const lessonPrice = parseFloat(record.lessonPrice) || 0;
      const remainingPrice = parseFloat(record.remainingPrice) || 0;
      messageContent += `   • ${record.studentName} (${record.studentCode}) - ${record.teacherName || '-'}\n`;
      messageContent += `     السعر: ${formatCurrency(lessonPrice)} | المتبقي: ${formatCurrency(remainingPrice)}\n`;
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

function matchSearch(record, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  return (
    (record.studentName || '').toLowerCase().includes(q) ||
    (record.phoneNumber || '').toLowerCase().includes(q) ||
    (record.studentCode || '').toLowerCase().includes(q)
  );
}

function computeDailyAccounts(filteredRegistrations) {
  return filteredRegistrations.reduce((summary, record) => {
    const dateKey = record.registrationDate || 'غير محدد';
    const lessonPrice = parseFloat(record.lessonPrice) || 0;
    const remainingPrice = parseFloat(record.remainingPrice) || 0;
    const bookPrice = parseFloat(record.bookPrice) || 0;
    const paidAmount = Math.max(0, lessonPrice - remainingPrice);

    if (!summary[dateKey]) {
      summary[dateKey] = {
        date: dateKey,
        count: 0,
        lessonTotal: 0,
        remainingTotal: 0,
        paidTotal: 0,
        bookTotal: 0,
        records: [],
      };
    }

    const daySummary = summary[dateKey];
    daySummary.count += 1;
    daySummary.lessonTotal += lessonPrice;
    daySummary.remainingTotal += remainingPrice;
    daySummary.paidTotal += paidAmount;
    daySummary.bookTotal += bookPrice;
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
  const selectedDate = accountDateFilter.value;
  const teacherFilter = accountTeacherFilter.value.trim().toLowerCase();

  let filteredRegistrations = registrations;
  if (selectedDate) {
    filteredRegistrations = filteredRegistrations.filter(record => record.registrationDate === selectedDate);
  }
  if (teacherFilter) {
    filteredRegistrations = filteredRegistrations.filter(record =>
      (record.teacherName || '').toLowerCase().includes(teacherFilter)
    );
  }

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
          return `<span><strong>${record.studentName}</strong> - كود: ${record.studentCode} - المدرس: ${record.teacherName || '-'} - سعر الحصة: ${formatCurrency(lessonPrice)} - المبلغ المتبقي: ${formatCurrency(remainingPrice)}</span>`;
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
    if (gradeFilterValue === 'غير محدد') {
      filtered = filtered.filter(record => normalizeText(record.classGrade) === normalizeText('غير محدد'));
    } else {
      const gradeMap = {
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

      const expectedGrade = normalizeText(gradeMap[gradeFilterValue]);
      filtered = filtered.filter(record => normalizeText(record.classGrade).includes(expectedGrade));
    }
  }

  if (!filtered.length) {
    recordsEmpty.style.display = 'block';
    recordsEmpty.textContent = (filterText || gradeFilterValue !== 'all') ? 'لا توجد نتائج تبحث عنها.' : 'لا يوجد بيانات مسجلة حتى الآن.';
    renderDailyAccounts();
    return;
  }

  recordsEmpty.style.display = 'none';

  filtered.forEach((record) => {
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
    info.innerHTML = `
      <strong>${record.studentName}</strong>
      <span class="card-label">كود الطالب</span>
      <span>${record.studentCode}</span>
      <span class="card-label">التاريخ</span>
      <span>${record.registrationDate}</span>
      <span class="card-label">رقم السجل</span>
      <span>${record.id}</span>
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
  form.registrationDate.value = record.registrationDate;
  updateDayName();
  form.teacherName.value = record.teacherName || '';
  form.roomNumber.value = record.roomNumber || '';
  form.lessonPrice.value = record.lessonPrice;
  form.remainingPrice.value = record.remainingPrice;
  form.bookPrice.value = record.bookPrice;
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
    const subjectsChanged = existingRecord && (
      (existingRecord.subjects || []).length !== subjects.length ||
      (existingRecord.subjects || []).some((subj) => !subjects.includes(subj)) ||
      subjects.some((subj) => !(existingRecord.subjects || []).includes(subj))
    );
    const isNewVersion = editingId && existingRecord && (existingRecord.registrationDate !== formData.get('registrationDate') || subjectsChanged);

    const data = {
      id: isNewVersion ? generateId() : editingId || generateId(),
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
      teacherName: formData.get('teacherName'),
      roomNumber: formData.get('roomNumber'),
      presence: formData.get('presence') || 'غير محدد',
      subjects,
      photoName,
      photoDataUrl,
      parentId: isNewVersion ? editingId : (existingRecord?.parentId || null),
    };

    await saveRecordToFirestore(data);

    if (editingId) {
      resultBox.textContent = isNewVersion
        ? 'تم حفظ تسجيل جديد، والسجل القديم محفوظ كمرجع.'
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
openScheduleButton.addEventListener('click', () => {
  scheduleOverlay.classList.add('active');
});
scheduleCloseButton.addEventListener('click', () => {
  scheduleOverlay.classList.remove('active');
});
scheduleOverlay.addEventListener('click', (event) => {
  if (event.target === scheduleOverlay) {
    scheduleOverlay.classList.remove('active');
  }
});
accountDateFilter.addEventListener('change', renderDailyAccounts);
accountTeacherFilter.addEventListener('input', renderDailyAccounts);
accountResetButton.addEventListener('click', () => {
  accountDateFilter.value = '';
  accountTeacherFilter.value = '';
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
