// Runs synchronously in <head>, before first paint, so a saved manual theme does not flash.
// Kept as a tiny classic script because the CSP forbids inline scripts.
;(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('pwgen:prefs:v1') || '{}')
    if (prefs && (prefs.theme === 'light' || prefs.theme === 'dark')) {
      document.documentElement.setAttribute('data-theme', prefs.theme)
    }
  } catch (error) {
    // Storage unavailable: follow the system theme.
  }
})()
