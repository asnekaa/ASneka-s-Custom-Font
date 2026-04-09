// [!] Core Logic: Read config and inject CSS as early as possible
chrome.storage.local.get({
  fontFamily: 'system-ui, -apple-system, "Microsoft YaHei", sans-serif',
  mode: 'blacklist',
  blacklist:[],
  whitelist:[]
}, (config) => {
  const currentHost = window.location.hostname;
  let shouldApplyFont = false;

  if (config.mode === 'blacklist') {
    shouldApplyFont = !config.blacklist.includes(currentHost);
  } else if (config.mode === 'whitelist') {
    shouldApplyFont = config.whitelist.includes(currentHost);
  }

  if (shouldApplyFont && config.fontFamily) {
    injectFontCss(config.fontFamily);
  }
});

/**
 * Dynamically inject CSS stylesheet
 * @param {string} fontFamily - User configured font string
 */
function injectFontCss(fontFamily) {
  // Prevent duplicate injections
  if (document.getElementById('edge-font-customizer-style')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'edge-font-customizer-style';
  
  // [!] Security & Compatibility: 
  // Expanded exclusion list to cover Bootstrap Icons (.bi), Material Design (.mdi), Nerd Fonts (.nf), etc.
  styleEl.textContent = `
    *:not(i):not([class*="icon"]):not([class*="fa"]):not([class*="iconfont"]):not([class*="material-icons"]):not([class*="bi-"]):not([class*="mdi-"]):not([class*="nf-"]) {
      font-family: ${fontFamily} !important;
    }
  `;

  // [!] Performance: Inject into documentElement immediately to prevent FOUT (Flash of Unstyled Text)
  const insertStyle = () => {
    if (document.head) {
      document.head.appendChild(styleEl);
    } else if (document.documentElement) {
      document.documentElement.appendChild(styleEl);
    }
  };

  if (document.documentElement || document.head) {
    insertStyle();
  } else {
    // Fallback for extremely early execution environments
    const observer = new MutationObserver(() => {
      if (document.documentElement || document.head) {
        insertStyle();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
}