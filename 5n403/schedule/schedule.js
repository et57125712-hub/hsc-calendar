'use strict';

let state;
const hashMatch = location.hash.match(/(?:^#|&)s=([^&]+)/);
if (hashMatch) {
  try {
    state = normalizeState(fromBase64Url(decodeURIComponent(hashMatch[1])));
  } catch (error) {
    console.warn('Invalid shared state', error);
    state = null;
  }
}

if (!state && isAdmin) {
  try {
    state = normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    state = defaultState();
  }
}
if (!state) state = defaultState();
if (isAdmin) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

let selectedWeek = currentWeekNumber();
let activeView = 'week';

const $ = id => document.getElementById(id);
const tabs = isAdmin
  ? [
      { id: 'week', label: '週課表' },
      { id: 'changes', label: '異動管理' },
      { id: 'fixed', label: '固定課表' }
    ]
  : [
      { id: 'week', label: '週課表' },
      { id: 'fixed', label: '固定課表' },
      { id: 'semester', label: '18週行事' }
    ];

$('tabs').innerHTML = tabs.map((tab, index) =>
  `<button class="tab ${index === 0 ? 'active' : ''}" data-view="${tab.id}">${tab.label}</button>`
).join('');

if (isAdmin) {
  $('adminBadge').classList.remove('hidden');
  $('adminBanner').classList.remove('hidden');
  $('publishBtn').classList.remove('hidden');
  $('fixedDescription').textContent = '可新增、修改或刪除整學期固定課程；單次異動請到「異動管理」。';
}

const weekSelect = $('weekSelect');
for (let week = 1; week <= 18; week += 1) {
  const start = weekStart(week);
  const end = addDays(start, 4);
  weekSelect.insertAdjacentHTML('beforeend',
    `<option value="${week}">第${week}週｜${md(start)}－${md(end)}</option>`
  );
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

async function copyText(text, message = '已複製') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast(message);
  }
}

function save() {
  state = normalizeState(state);
  state.updatedAt = new Date().toISOString();
  if (isAdmin) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function setView(view) {
  activeView = view;
  document.querySelectorAll('.tab').forEach(button =>
    button.classList.toggle('active', button.dataset.view === view)
  );
  document.querySelectorAll('.panel').forEach(panel =>
    panel.classList.toggle('active', panel.id === `panel-${view}`)
  );
  if (view === 'changes') renderChanges();
  if (view === 'fixed') renderFixed();
  if (view === 'semester') renderSemester();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function typeColor(type, title) {
  return colors[title] || colors[type] || '#487ca7';
}

function courseHTML(course, tag = '') {
  const meta = [course.teacher, course.room].filter(Boolean).map(esc).join('｜');
  const color = typeColor(course.type, course.title);
  return `<article class="course" style="--course:${color}">
    ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
    <div class="course-top"><span class="period">${esc(periodLabel(course))}</span><span class="time">${esc(timeLabel(course))}</span></div>
    <h3>${esc(course.title)}</h3>
    ${meta ? `<div class="course-meta">${meta}</div>` : ''}
    ${course.note ? `<div class="course-note">${esc(course.note)}</div>` : ''}
  </article>`;
}

function dayChanges(key) {
  return state.changes
    .filter(change => change.date === key)
    .sort((a, b) => {
      const aPeriod = a.start === 'all' ? 0 : Number(a.start);
      const bPeriod = b.start === 'all' ? 0 : Number(b.start);
      return aPeriod - bPeriod;
    });
}

function resolvedCourses(dayIndex, key) {
  const changes = dayChanges(key);
  const allDay = changes.find(change => change.start === 'all');
  if (allDay) return { allDay, items: [] };

  let items = clone(state.fixed[dayIndex] || []).map(course => ({ ...course, source: 'fixed' }));
  changes.forEach(change => {
    const start = Number(change.start);
    const end = Number(change.end);
    items = items.filter(course => Number(course.end) < start || Number(course.start) > end);
    items.push({ ...change, source: 'change' });
  });
  items.sort((a, b) => Number(a.start) - Number(b.start));
  return { allDay: null, items };
}

function eventClass(type) {
  if (type === '放假') return 'holiday';
  if (type === '考試') return 'exam';
  if (type === '停課') return 'cancel';
  return 'activity';
}

function dayCardHTML(dayIndex, date, weekly = true) {
  const key = iso(date);
  let body = '';

  if (weekly) {
    const changes = dayChanges(key);
    const allDay = changes.find(change => change.start === 'all');
    if (allDay) {
      body = `<div class="day-event event-${eventClass(allDay.type)}">${esc(allDay.title)}<br><small>${esc(allDay.note || allDay.type)}</small></div>`;
    } else if (isInternship(date)) {
      const classChanges = changes.filter(change => change.start !== 'all');
      body = '<div class="day-event event-internship">校外實習<br><small>不在校</small></div>';
      if (classChanges.length) {
        body += classChanges.map(change => courseHTML({ ...change, source: 'change' }, change.type)).join('');
      }
    } else {
      const resolved = resolvedCourses(dayIndex, key);
      body = resolved.items.length
        ? resolved.items.map(course => courseHTML(course, course.source === 'change' ? course.type : '')).join('')
        : '<div class="day-empty">目前無固定課程</div>';
    }
  } else {
    const courses = clone(state.fixed[dayIndex] || []).sort((a, b) => Number(a.start) - Number(b.start));
    body = courses.length
      ? courses.map(course => courseHTML(course)).join('')
      : '<div class="day-empty">目前無固定課程</div>';
  }

  return `<section class="day-card ${dayClasses[dayIndex]}">
    <div class="day-head"><strong>${dayNames[dayIndex]}</strong><span>${weekly ? `${md(date)}｜${key}` : '固定課表'}</span></div>
    <div class="day-body">${body}</div>
  </section>`;
}

function renderWeek() {
  const start = weekStart(selectedWeek);
  const end = addDays(start, 4);
  $('weekTitle').textContent = `第${selectedWeek}週`;
  $('weekRange').textContent = `${md(start)}－${md(end)}`;
  $('weekStatus').textContent = `第${selectedWeek}週`;
  weekSelect.value = String(selectedWeek);
  $('prevWeek').disabled = selectedWeek === 1;
  $('nextWeek').disabled = selectedWeek === 18;
  $('weeklyGrid').innerHTML = state.fixed
    .map((_, dayIndex) => dayCardHTML(dayIndex, addDays(start, dayIndex), true))
    .join('');

  const notices = [];
  if (weekNotes[selectedWeek]) notices.push(weekNotes[selectedWeek]);
  const customCount = state.changes.filter(change =>
    weekOfDate(change.date) === selectedWeek && !String(change.id).startsWith('c-')
  ).length;
  if (customCount) notices.push(['本週課表異動', `學藝已登錄${customCount}筆異動，請留意各日課程卡片。`]);

  if (notices.length) {
    $('weekNotice').classList.remove('hidden');
    $('noticeTitle').textContent = notices.map(note => note[0]).join('｜');
    $('noticeText').textContent = notices.map(note => note[1]).join('；');
  } else {
    $('weekNotice').classList.add('hidden');
  }
}

function editableCourseHTML(course, dayIndex) {
  const meta = [course.teacher, course.room].filter(Boolean).map(esc).join('｜');
  const color = typeColor('', course.title);
  return `<article class="course editable-course" style="--course:${color}">
    <div class="course-top"><span class="period">${esc(periodLabel(course))}</span><span class="time">${esc(timeLabel(course))}</span></div>
    <h3>${esc(course.title)}</h3>${meta ? `<div class="course-meta">${meta}</div>` : ''}
    ${isAdmin ? `<div class="edit-tools"><button data-fixed-edit="${esc(course.id)}" data-day="${dayIndex}">編輯</button><button data-fixed-delete="${esc(course.id)}" data-day="${dayIndex}">刪除</button></div>` : ''}
  </article>`;
}

function renderFixed() {
  $('fixedGrid').innerHTML = state.fixed.map((courses, dayIndex) => {
    const sorted = clone(courses).sort((a, b) => Number(a.start) - Number(b.start));
    const body = sorted.length
      ? sorted.map(course => editableCourseHTML(course, dayIndex)).join('')
      : '<div class="day-empty">目前無固定課程</div>';
    return `<section class="fixed-admin-day ${dayClasses[dayIndex]}">
      <div class="day-head"><div><strong>${dayNames[dayIndex]}</strong><span>固定課表</span></div>${isAdmin ? `<button class="btn small" data-fixed-add="${dayIndex}">＋新增</button>` : ''}</div>
      <div class="fixed-list">${body}</div>
    </section>`;
  }).join('');
}

function changePeriodText(change) {
  return change.start === 'all' ? '全天' : `${periodLabel(change)}｜${timeLabel(change)}`;
}

function buildChangeNotice(change) {
  const date = parseDate(change.date);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  const lines = [
    `【5N403課表異動】${change.date.replaceAll('-', '/')}（${weekday}）`,
    `${changePeriodText(change)}｜${change.type}：${change.title}`
  ];
  const meta = [change.teacher ? `教師：${change.teacher}` : '', change.room ? `教室：${change.room}` : ''].filter(Boolean);
  if (meta.length) lines.push(meta.join('｜'));
  if (change.note) lines.push(`備註：${change.note}`);
  lines.push('請同學留意班群最新公告。');
  return lines.join('\n');
}

function renderChanges() {
  if (!isAdmin) return;
  const sorted = clone(state.changes).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare) return dateCompare;
    const aPeriod = a.start === 'all' ? 0 : Number(a.start);
    const bPeriod = b.start === 'all' ? 0 : Number(b.start);
    return bPeriod - aPeriod;
  });
  $('changeCount').textContent = `${sorted.length}筆異動`;

  if (!sorted.length) {
    $('changeList').innerHTML = '<div class="empty-state">目前沒有異動紀錄。新增一筆後，週課表會自動套用。</div>';
    return;
  }

  $('changeList').innerHTML = sorted.map(change => {
    const date = parseDate(change.date);
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    const meta = [change.teacher, change.room, change.note].filter(Boolean).map(esc).join('｜');
    return `<article class="record">
      <div class="record-date"><strong>${esc(change.date.replaceAll('-', '/'))}（${weekday}）</strong><span>${esc(changePeriodText(change))}</span></div>
      <div class="record-main"><span class="tag" style="--course:${typeColor(change.type, change.title)}">${esc(change.type)}</span><h3>${esc(change.title)}</h3>${meta ? `<p>${meta}</p>` : ''}</div>
      <div class="record-buttons"><button class="btn small" data-change-copy="${esc(change.id)}">複製通知</button><button class="btn small" data-change-edit="${esc(change.id)}">編輯</button><button class="btn small danger" data-change-delete="${esc(change.id)}">刪除</button></div>
    </article>`;
  }).join('');
}

function renderSemester() {
  const current = currentWeekNumber();
  $('semesterGrid').innerHTML = Array.from({ length: 18 }, (_, index) => {
    const week = index + 1;
    const start = weekStart(week);
    const end = addDays(start, 4);
    const sunday = addDays(start, 6);
    const overlapsInternship = !(sunday < internshipStart || start > internshipEnd);
    const changes = state.changes.filter(change => weekOfDate(change.date) === week);
    const notes = [];
    if (weekNotes[week]) notes.push(weekNotes[week][1]);
    const custom = changes.filter(change => !String(change.id).startsWith('c-'));
    if (custom.length) notes.push(`學藝另登錄${custom.length}筆異動`);
    const classes = ['week-card'];
    if (week === current) classes.push('current');
    if (overlapsInternship) classes.push('intern');
    else if (week === 9 || week === 18) classes.push('exam');
    else if (notes.length) classes.push('special');
    return `<article class="${classes.join(' ')}">
      <div class="week-no">第${week}週</div><div class="week-range">${md(start)}－${md(end)}</div>
      <div class="week-note ${notes.length ? '' : 'week-normal'}">${esc(notes.join('；') || '一般上課週')}</div>
    </article>`;
  }).join('');
}

function renderFooter() {
  $('footerText').textContent = `5N403班級課表｜最後更新：${fmtDateTime(state.updatedAt)}`;
}

function renderAll() {
  renderWeek();
  renderFixed();
  if (isAdmin) renderChanges();
  if (!isAdmin) renderSemester();
  renderFooter();
}

function openModal(id) {
  $(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  $(id).classList.add('hidden');
  document.body.style.overflow = '';
}

function resetChangeForm() {
  $('changeForm').reset();
  $('changeId').value = '';
  $('changeDate').value = iso(addDays(weekStart(selectedWeek), 0));
  $('changeType').value = '調課';
  $('changeStart').value = '1';
  $('changeEnd').value = '1';
  $('changeModalTitle').textContent = '新增異動';
}

function openChangeEditor(id = '') {
  resetChangeForm();
  if (id) {
    const change = state.changes.find(item => item.id === id);
    if (!change) return;
    $('changeId').value = change.id;
    $('changeDate').value = change.date;
    $('changeType').value = change.type;
    $('changeStart').value = String(change.start);
    $('changeEnd').value = String(change.end);
    $('changeTitle').value = change.title;
    $('changeTeacher').value = change.teacher;
    $('changeRoom').value = change.room;
    $('changeNote').value = change.note;
    $('changeModalTitle').textContent = '編輯異動';
  }
  openModal('changeModal');
}

function resetFixedForm(dayIndex = 0) {
  $('fixedForm').reset();
  $('fixedId').value = '';
  $('fixedDay').value = String(dayIndex);
  $('fixedDaySelect').value = String(dayIndex);
  $('fixedStart').value = '1';
  $('fixedEnd').value = '1';
  $('fixedModalTitle').textContent = '新增固定課程';
}

function openFixedEditor(dayIndex, id = '') {
  resetFixedForm(dayIndex);
  if (id) {
    const course = (state.fixed[dayIndex] || []).find(item => item.id === id);
    if (!course) return;
    $('fixedId').value = course.id;
    $('fixedDay').value = String(dayIndex);
    $('fixedDaySelect').value = String(dayIndex);
    $('fixedTitle').value = course.title;
    $('fixedStart').value = String(course.start);
    $('fixedEnd').value = String(course.end);
    $('fixedTeacher').value = course.teacher;
    $('fixedRoom').value = course.room;
    $('fixedModalTitle').textContent = '編輯固定課程';
  }
  openModal('fixedModal');
}

function publicShareUrl() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = `s=${encodeURIComponent(toBase64Url(state))}`;
  return url.toString();
}

async function shareUrl(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
  }
  await copyText(url, '班群連結已複製');
}

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

$('prevWeek').addEventListener('click', () => {
  selectedWeek = Math.max(1, selectedWeek - 1);
  renderWeek();
});
$('nextWeek').addEventListener('click', () => {
  selectedWeek = Math.min(18, selectedWeek + 1);
  renderWeek();
});
weekSelect.addEventListener('change', () => {
  selectedWeek = Number(weekSelect.value);
  renderWeek();
});

$('printBtn').addEventListener('click', () => window.print());
$('shareViewBtn').addEventListener('click', () => {
  const url = isAdmin ? publicShareUrl() : location.href;
  shareUrl(url, '5N403班級課表');
});

if (isAdmin) {
  $('publishBtn').addEventListener('click', () => shareUrl(publicShareUrl(), '5N403最新班級課表'));
  $('addChangeBtn').addEventListener('click', () => openChangeEditor());

  $('changeForm').addEventListener('submit', event => {
    event.preventDefault();
    const start = $('changeStart').value;
    const end = $('changeEnd').value;
    if ((start === 'all') !== (end === 'all')) {
      alert('全天異動的開始與結束節次都要選「全天」。');
      return;
    }
    if (start !== 'all' && Number(end) < Number(start)) {
      alert('結束節次不可早於開始節次。');
      return;
    }
    const record = {
      id: $('changeId').value || uid('c'),
      date: $('changeDate').value,
      type: $('changeType').value,
      start: start === 'all' ? 'all' : Number(start),
      end: end === 'all' ? 'all' : Number(end),
      title: $('changeTitle').value.trim(),
      teacher: $('changeTeacher').value.trim(),
      room: $('changeRoom').value.trim(),
      note: $('changeNote').value.trim()
    };
    const index = state.changes.findIndex(item => item.id === record.id);
    if (index >= 0) state.changes[index] = record;
    else state.changes.push(record);
    closeModal('changeModal');
    save();
    showToast('異動已儲存');
  });

  $('fixedForm').addEventListener('submit', event => {
    event.preventDefault();
    const originalDay = Number($('fixedDay').value || 0);
    const dayIndex = Number($('fixedDaySelect').value);
    const start = Number($('fixedStart').value);
    const end = Number($('fixedEnd').value);
    if (end < start) {
      alert('結束節次不可早於開始節次。');
      return;
    }
    const id = $('fixedId').value || uid('f');
    const record = {
      id,
      start,
      end,
      title: $('fixedTitle').value.trim(),
      teacher: $('fixedTeacher').value.trim(),
      room: $('fixedRoom').value.trim()
    };

    const overlaps = (state.fixed[dayIndex] || []).filter(course =>
      course.id !== id && !(Number(course.end) < start || Number(course.start) > end)
    );
    if (overlaps.length && !confirm(`此時段與「${overlaps.map(x => x.title).join('、')}」重疊，是否取代？`)) return;

    state.fixed[originalDay] = (state.fixed[originalDay] || []).filter(course => course.id !== id);
    state.fixed[dayIndex] = (state.fixed[dayIndex] || []).filter(course =>
      course.id === id || Number(course.end) < start || Number(course.start) > end
    );
    state.fixed[dayIndex] = state.fixed[dayIndex].filter(course => course.id !== id);
    state.fixed[dayIndex].push(record);
    state.fixed[dayIndex].sort((a, b) => Number(a.start) - Number(b.start));
    closeModal('fixedModal');
    save();
    showToast('固定課程已儲存');
  });

  $('changeList').addEventListener('click', event => {
    const edit = event.target.closest('[data-change-edit]');
    const remove = event.target.closest('[data-change-delete]');
    const copy = event.target.closest('[data-change-copy]');
    if (edit) openChangeEditor(edit.dataset.changeEdit);
    if (copy) {
      const change = state.changes.find(item => item.id === copy.dataset.changeCopy);
      if (change) copyText(buildChangeNotice(change), '異動通知已複製');
    }
    if (remove) {
      const change = state.changes.find(item => item.id === remove.dataset.changeDelete);
      if (change && confirm(`確定刪除「${change.title}」？`)) {
        state.changes = state.changes.filter(item => item.id !== change.id);
        save();
        showToast('異動已刪除');
      }
    }
  });

  $('fixedGrid').addEventListener('click', event => {
    const add = event.target.closest('[data-fixed-add]');
    const edit = event.target.closest('[data-fixed-edit]');
    const remove = event.target.closest('[data-fixed-delete]');
    if (add) openFixedEditor(Number(add.dataset.fixedAdd));
    if (edit) openFixedEditor(Number(edit.dataset.day), edit.dataset.fixedEdit);
    if (remove) {
      const dayIndex = Number(remove.dataset.day);
      const course = (state.fixed[dayIndex] || []).find(item => item.id === remove.dataset.fixedDelete);
      if (course && confirm(`確定刪除「${course.title}」？`)) {
        state.fixed[dayIndex] = state.fixed[dayIndex].filter(item => item.id !== course.id);
        save();
        showToast('固定課程已刪除');
      }
    }
  });

  $('backupBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `5N403課表備份_${iso(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      state = normalizeState(JSON.parse(await file.text()));
      save();
      showToast('備份已匯入');
    } catch {
      alert('備份檔格式不正確。');
    } finally {
      event.target.value = '';
    }
  });

  $('resetBtn').addEventListener('click', () => {
    if (confirm('確定恢復原始課表？自行新增的異動與固定課程將被清除。')) {
      state = defaultState();
      save();
      showToast('已恢復原始課表');
    }
  });
}

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => closeModal(button.dataset.close));
});
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeModal(backdrop.id);
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => closeModal(modal.id));
  }
});

renderAll();
