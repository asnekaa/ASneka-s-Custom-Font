// DOM 元素引用
const elements = {
  fontFamily: document.getElementById('fontFamily'),
  modeRadios: document.getElementsByName('mode'),
  domainTags: document.getElementById('domainTags'),
  domainInput: document.getElementById('domainInput'),
  addCurrentBtn: document.getElementById('addCurrentBtn'),
  saveBtn: document.getElementById('saveBtn'),
  status: document.getElementById('status')
};

// 状态管理
let currentDomains =[];
let fullData = { blacklist: [], whitelist:[] };
let currentMode = 'blacklist';

// 初始化扩展弹窗
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. 从存储中读取用户配置
  chrome.storage.local.get({
    fontFamily: 'Microsoft YaHei', // 默认字体
    mode: 'blacklist',
    blacklist: [],
    whitelist:[]
  }, (data) => {
    fullData = data;
    currentMode = data.mode;
    
    // 2. 异步加载系统全量字体
    if (chrome.fontSettings && chrome.fontSettings.getFontList) {
      chrome.fontSettings.getFontList((fonts) => {
        // 使用 DocumentFragment 避免频繁重绘 DOM，提升性能
        const fragment = document.createDocumentFragment();
        
        fonts.forEach(font => {
          const option = document.createElement('option');
          // 将字体名称作为 value
          option.value = font.displayName;
          option.textContent = font.displayName;
          fragment.appendChild(option);
        });
        
        // 清空“加载中”提示并挂载所有字体
        elements.fontFamily.innerHTML = '';
        elements.fontFamily.appendChild(fragment);
        
        // 恢复用户之前选择的字体
        elements.fontFamily.value = data.fontFamily;
      });
    }

    // 3. 恢复单选框状态
    for (const radio of elements.modeRadios) {
      if (radio.value === data.mode) {
        radio.checked = true;
        break;
      }
    }
    
    // 4. 渲染域名标签
    currentDomains = data.mode === 'blacklist' ? [...data.blacklist] : [...data.whitelist];
    renderTags();
  });
});

// 监听下拉菜单变化，实时保存并触发网页无刷新更新
elements.fontFamily.addEventListener('change', () => {
  saveConfig(false); // 仅静默保存，不显示提示框
});

// 监听黑白名单模式切换
for (const radio of elements.modeRadios) {
  radio.addEventListener('change', (e) => {
    // 切换前，先将当前编辑的列表保存到内存中的旧模式下
    if (currentMode === 'blacklist') {
      fullData.blacklist = [...currentDomains];
    } else {
      fullData.whitelist =[...currentDomains];
    }

    // 更新当前模式并重新渲染标签
    currentMode = e.target.value;
    currentDomains = currentMode === 'blacklist' ? [...fullData.blacklist] :[...fullData.whitelist];
    renderTags();
    saveConfig(false); // 模式切换后立即生效
  });
}

/**
 * 渲染域名标签 UI
 */
function renderTags() {
  elements.domainTags.innerHTML = '';
  currentDomains.forEach((domain, index) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${domain} <span class="tag-remove" data-index="${index}">&times;</span>`;
    elements.domainTags.appendChild(tag);
  });
}

// 使用事件委托监听标签的删除操作
elements.domainTags.addEventListener('click', (e) => {
  if (e.target.classList.contains('tag-remove')) {
    const index = parseInt(e.target.getAttribute('data-index'), 10);
    currentDomains.splice(index, 1);
    renderTags();
    saveConfig(false); // 删除标签后立即生效
  }
});

// 监听输入框回车事件，手动添加域名
elements.domainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const newDomain = e.target.value.trim().toLowerCase();
if (newDomain && !currentDomains.includes(newDomain)) {
      currentDomains.push(newDomain);
      renderTags();
      saveConfig(false); // 手动添加域名后立即生效
      e.target.value = ''; // 清空输入框
    }
  }
});

// 获取当前活动标签页的域名并添加到列表
elements.addCurrentBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      // 拦截浏览器内部页面 (chrome:// 或 edge://)
      if (hostname && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        if (!currentDomains.includes(hostname)) {
          currentDomains.push(hostname);
          renderTags();
          saveConfig(false); // 添加当前域名后立即生效
        }
      } else {
        alert('无法在浏览器内部页面应用此功能。');
      }
    } catch (err) {
      console.error('URL 解析失败:', err);
    }
  }
});

/**
 * 核心保存逻辑
 * @param {boolean} showStatus - 是否显示"保存成功"的 UI 提示
 */
function saveConfig(showStatus = true) {
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

  // 写入本地存储，content.js 会监听到变化并无刷新应用
  chrome.storage.local.set(saveData, () => {
    if (showStatus) {
      elements.status.classList.remove('hidden');
      setTimeout(() => {
        elements.status.classList.add('hidden');
      }, 2000);
    }
  });
}

// 监听手动保存按钮
elements.saveBtn.addEventListener('click', () => {
  saveConfig(true);
});