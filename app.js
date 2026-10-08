const $ = (selector) => document.querySelector(selector);
const storageKey = 'bapjul.owner.restaurant';
const labels = ['월', '화', '수', '목', '금', '토', '일'];
let restaurant = { branch: '', opening: null, closing: null, holidays: null };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved) restaurant = { ...restaurant, ...saved };
} catch { /* Browser storage is optional. */ }
const formatTime = (time) => time.map(value => String(value).padStart(2, '0')).join(':');
function render() {
  const values = {
    branch: restaurant.branch,
    hours: restaurant.opening && restaurant.closing ? `${formatTime(restaurant.opening)} ~ ${formatTime(restaurant.closing)}` : '',
    holidays: restaurant.holidays === null ? '' : restaurant.holidays.length ? `매주 ${restaurant.holidays.map(day => labels[day]).join('·')}요일` : '연중무휴'
  };
  const placeholders = { branch: '지점 검색...', hours: '영업 시간', holidays: '정기 휴무일' };
  Object.entries(values).forEach(([id, value]) => {
    $(`#${id}`).textContent = value || placeholders[id];
    $(`#${id}`).classList.toggle('has-value', Boolean(value));
    $(`#${id}`).setAttribute('aria-label', `${placeholders[id].replace('...', '')}${value ? `: ${value}` : ''}`);
  });
  $('#message').textContent = '';
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
function updateSearch() {
  const query = $('#branch-query').value.trim();
  $('#naver-search').href = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
  $('#branch-error').textContent = '';
}
$('#branch').addEventListener('click', () => {
  $('#branch-query').value = restaurant.branch;
  updateSearch();
  $('#branch-dialog').showModal();
  $('#branch-query').focus();
});
$('#branch-query').addEventListener('input', updateSearch);
$('#naver-search').addEventListener('click', event => {
  if (!$('#branch-query').value.trim()) {
    event.preventDefault();
    $('#branch-error').textContent = '검색할 식당 이름을 입력해주세요.';
    $('#branch-query').focus();
  }
});
$('#branch-apply').addEventListener('click', () => {
  const branch = $('#branch-query').value.trim();
  if (!branch) { $('#branch-error').textContent = '식당·지점 이름을 입력해주세요.'; return; }
  restaurant.branch = branch;
  render();
  $('#branch-dialog').close();
});
let draftTimes, activeTime = 'opening';
const wheels = [$('#hour-wheel'), $('#minute-wheel')];
function refreshTimes() {
  $('#opening-value').textContent = formatTime(draftTimes.opening);
  $('#closing-value').textContent = formatTime(draftTimes.closing);
  const opening = draftTimes.opening[0] * 60 + draftTimes.opening[1];
  const closing = draftTimes.closing[0] * 60 + draftTimes.closing[1];
  $('#time-note').textContent = closing < opening ? '마감 시간은 다음 날 기준이에요.' : closing === opening ? '시작 시간과 마감 시간을 다르게 선택해주세요.' : '';
}
function selectWheel(wheel, index, value) {
  draftTimes[activeTime][index] = value;
  Array.from(wheel.children).forEach((option, position) => option.setAttribute('aria-selected', String(position === value)));
  wheel.setAttribute('aria-activedescendant', `${wheel.id}-${value}`);
  refreshTimes();
}
wheels.forEach((wheel, index) => {
  const count = index === 0 ? 24 : 60;
  for (let value = 0; value < count; value++) {
    const option = document.createElement('div');
    option.className = 'wheel-option';
    option.id = `${wheel.id}-${value}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.textContent = String(value).padStart(2, '0');
    option.addEventListener('click', () => { wheel.scrollTop = value * 40; selectWheel(wheel, index, value); });
    wheel.append(option);
  }
  wheel.addEventListener('scroll', () => {
    if (draftTimes && $('#hours-dialog').open) selectWheel(wheel, index, Math.max(0, Math.min(count - 1, Math.round(wheel.scrollTop / 40))));
  });
  wheel.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = draftTimes[activeTime][index];
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : Math.max(0, Math.min(count - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    wheel.scrollTop = next * 40;
    selectWheel(wheel, index, next);
  });
});
function showTime(time) {
  activeTime = time;
  ['opening', 'closing'].forEach(name => $(`#${name}-tab`).setAttribute('aria-selected', String(name === time)));
  $('#time-panel').setAttribute('aria-labelledby', `${time}-tab`);
  wheels.forEach((wheel, index) => { wheel.scrollTop = draftTimes[time][index] * 40; selectWheel(wheel, index, draftTimes[time][index]); });
}
$('#hours').addEventListener('click', () => {
  draftTimes = { opening: [...(restaurant.opening || [10, 0])], closing: [...(restaurant.closing || [21, 0])] };
  $('#hours-dialog').showModal();
  showTime('opening');
});
$('#opening-tab').addEventListener('click', () => showTime('opening'));
$('#closing-tab').addEventListener('click', () => showTime('closing'));
$('#hours-apply').addEventListener('click', () => {
  wheels.forEach((wheel, index) => selectWheel(wheel, index, Math.round(wheel.scrollTop / 40)));
  if (formatTime(draftTimes.opening) === formatTime(draftTimes.closing)) return;
  restaurant.opening = [...draftTimes.opening];
  restaurant.closing = [...draftTimes.closing];
  render();
  $('#hours-dialog').close();
});
let draftDays = new Set(), everyday = false;
function refreshDays() {
  $('#days').querySelectorAll('button').forEach((button, day) => button.setAttribute('aria-pressed', String(draftDays.has(day))));
  $('#everyday').setAttribute('aria-pressed', String(everyday));
  $('#holidays-error').textContent = '';
}
labels.forEach((label, day) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label', `${label}요일`);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    everyday = false;
    if (draftDays.has(day)) draftDays.delete(day); else draftDays.add(day);
    refreshDays();
  });
  $('#days').append(button);
});
$('#holidays').addEventListener('click', () => {
  draftDays = new Set(restaurant.holidays || []);
  everyday = Array.isArray(restaurant.holidays) && restaurant.holidays.length === 0;
  refreshDays();
  $('#holidays-dialog').showModal();
});
$('#everyday').addEventListener('click', () => { everyday = !everyday; draftDays.clear(); refreshDays(); });
$('#holidays-apply').addEventListener('click', () => {
  if (!everyday && !draftDays.size) { $('#holidays-error').textContent = '휴무 요일 또는 연중무휴를 선택해주세요.'; return; }
  restaurant.holidays = [...draftDays].sort((a, b) => a - b);
  render();
  $('#holidays-dialog').close();
});
$('#restaurant-form').addEventListener('submit', event => {
  event.preventDefault();
  const missing = !restaurant.branch ? 'branch' : !restaurant.opening ? 'hours' : restaurant.holidays === null ? 'holidays' : null;
  if (missing) {
    $('#message').textContent = '지점, 영업 시간, 정기 휴무일을 모두 설정해주세요.';
    $(`#${missing}`).focus();
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(restaurant));
    $('#message').textContent = '식당 정보를 저장했어요.';
  } catch { $('#message').textContent = '브라우저 저장 공간을 사용할 수 없어요.'; }
});
render();
