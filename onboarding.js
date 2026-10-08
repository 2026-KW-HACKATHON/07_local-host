const screen = document.querySelector('.onboarding');
const status = document.querySelector('.status');
const allowedScreens = ['start', 'location', 'notification'];
let splashTimer;
function showScreen() {
  clearTimeout(splashTimer);
  const requested = location.hash.slice(1);
  const current = allowedScreens.includes(requested) ? requested : 'start';
  screen.dataset.screen = current;
  document.querySelector('.location').hidden = current !== 'location';
  document.querySelector('.notification').hidden = current !== 'notification';
  status.textContent = '';
  document.title = `밥줄 · ${{start:'시작하기',location:'위치 권한 안내',notification:'알림 권한 안내'}[current]}`;
  if (current === 'start') splashTimer = setTimeout(() => { location.hash = 'location'; }, 2500);
  else document.querySelector(`.${current} h1`).focus({ preventScroll: true });
}
document.querySelectorAll('.choices button').forEach(button => {
  button.addEventListener('click', () => {
    const kind = screen.dataset.screen;
    const choice = button.dataset.choice;
    // These are UI preferences. No device permission is requested here.
    try { sessionStorage.setItem(`bapjul.onboarding.${kind}`, choice); } catch { /* The flow works without storage. */ }
    if (kind === 'location') location.hash = 'notification';
    else {
      document.querySelectorAll('.notification .choices button').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      status.textContent = '선택한 설정을 저장했어요.';
      screen.dispatchEvent(new CustomEvent('bapjul:onboarding-complete', { bubbles: true, detail: { notification: choice } }));
    }
  });
});
window.addEventListener('hashchange', showScreen);
// A fresh visit or reload always begins with the splash, even when the
// browser restores the URL of a previously viewed permission screen.
history.replaceState(null, '', `${location.pathname}${location.search}#start`);
showScreen();
