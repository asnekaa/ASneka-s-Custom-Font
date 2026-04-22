const elements = {
  fontFamily: document.getElementById('fontFamily'),
  modeRadios: document.getElementsByName('mode'),
  domainTags: document.getElementById('domainTags'),
  domainInput: document.getElementById('domainInput'),
  addCurrentBtn: document.getElementById('addCurrentBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile')
};

let currentDomains =[];
let fullData = { blacklist: [], whitelist:[] };
let currentMode = 'blacklist';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({
    fontFamily: 'Microsoft YaHei',
    mode: 'blacklist',
    blacklist: [],
    whitelist:[]
  }, (data) => {
    fullData = data;
    currentMode = data.mode;
    if (chrome.fontSettings && chrome.fontSettings.getFontList) {
      chrome.fontSettings.getFontList((fonts) => {
        const fragment = document.createDocumentFragment();
        fonts.forEach(font => {
          const option = document.createElement('option');
          option.value = font.displayName;
          option.textContent = font.displayName;
          option.style.fontFamily = `"${font.displayName}"`;
          fragment.appendChild(option);
        });
        elements.fontFamily.innerHTML = '';
        elements.fontFamily.appendChild(fragment);
        elements.fontFamily.value = data.fontFamily;
      });
    }
    for (const radio of elements.modeRadios) {
      if (radio.value === data.mode) {
        radio.checked = true;
        break;
      }
    }
    currentDomains = data.mode === 'blacklist' ? [...data.blacklist] : [...data.whitelist];
    renderTags();
  });
});

elements.fontFamily.addEventListener('change', () => {
  saveConfig(); 
});

for (const radio of elements.modeRadios) {
  radio.addEventListener('change', (e) => {
    if (currentMode === 'blacklist') {
      fullData.blacklist = [...currentDomains];
    } else {
      fullData.whitelist =[...currentDomains];
    }
    currentMode = e.target.value;
    currentDomains = currentMode === 'blacklist' ? [...fullData.blacklist] :[...fullData.whitelist];
    renderTags();
    saveConfig();
  });
}

// 增加 animateIndex 参数，默认 -1 表示不执行动画
function renderTags(animateIndex = -1) {
  elements.domainTags.innerHTML = '';
  currentDomains.forEach((domain, index) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    
    // 如果当前索引等于传入的新增索引，则添加动画类
    if (index === animateIndex) {
      tag.classList.add('animate-new');
    }
    
    tag.innerHTML = `${domain} <span class="tag-remove" data-index="${index}">&times;</span>`;
    elements.domainTags.appendChild(tag);
  });

  // 如果有新添加的元素，平滑滚动到列表底部
  if (animateIndex !== -1) {
    setTimeout(() => {
      elements.domainTags.scrollTo({
        top: elements.domainTags.scrollHeight,
        behavior: 'smooth'
      });
    }, 10);
  }
}

elements.domainTags.addEventListener('click', (e) => {
  if (e.target.classList.contains('tag-remove')) {
const index = parseInt(e.target.getAttribute('data-index'), 10);
    currentDomains.splice(index, 1);
    renderTags();
    saveConfig();
  }
});

elements.domainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const newDomain = e.target.value.trim().toLowerCase();
    if (newDomain && !currentDomains.includes(newDomain)) {
      currentDomains.push(newDomain);
      // 传入最新添加的元素的索引以触发动画
      renderTags(currentDomains.length - 1);
      saveConfig();
      e.target.value = '';
    }
  }
});

elements.addCurrentBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      if (hostname && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        if (!currentDomains.includes(hostname)) {
          currentDomains.push(hostname);
          // 传入最新添加的元素的索引以触发动画
          renderTags(currentDomains.length - 1);
          saveConfig();
        }
      } else {
        alert('无法在浏览器内部页面应用此功能。');
      }
    } catch (err) {
      console.error('URL 解析失败:', err);
    }
  }
});

function saveConfig() {
  const fontFamily = elements.fontFamily.value;
  if (currentMode === 'blacklist') {
    fullData.blacklist = currentDomains;
  } else {
    fullData.whitelist = currentDomains;
  }
  
  const saveData = {
    fontFamily: fontFamily,
    mode: currentMode,
    blacklist: fullData.blacklist,
    whitelist: fullData.whitelist
  };
  chrome.storage.local.set(saveData);
}

elements.exportBtn.addEventListener('click', () => {
  chrome.storage.local.get(null, (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `asneka-font-config-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

elements.importBtn.addEventListener('click', () => {
  elements.importFile.click();
});

elements.importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (importedData.mode && importedData.fontFamily !== undefined) {
        // 确保黑白名单是数组格式
        importedData.blacklist = Array.isArray(importedData.blacklist) ? importedData.blacklist :[];
        importedData.whitelist = Array.isArray(importedData.whitelist) ? importedData.whitelist :[];
        chrome.storage.local.set(importedData, () => {
          window.location.reload();
        });
      } else {
        alert('导入失败：配置文件格式不正确！');
      }
    } catch (err) {
      alert('导入失败：无法解析 JSON 文件！');
      console.error('JSON Parse Error:', err);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});