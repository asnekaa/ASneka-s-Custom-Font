// DOM 元素引用
const elements = {
  fontFamily: document.getElementById('fontFamily'),
  fontPreview: document.getElementById('fontPreview'),
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
        updateFontPreview(data.fontFamily);
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

// 监听下拉菜单变化，实时更新预览区域
elements.fontFamily.addEventListener('change', (e) => {
  updateFontPreview(e.target.value);
});

/**
 * 更新字体预览区域的样式
 * @param {string} fontFamily - 选中的字体名称
 */
function updateFontPreview(fontFamily) {
  // 如果字体名称包含空格，最好用引号包裹，以防 CSS 解析错误
  const safeFontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
  elements.fontPreview.style.fontFamily = `${safeFontFamily}, system-ui, sans-serif`;
}

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
        }
      } else {
        alert('无法在浏览器内部页面应用此功能。');
      }
    } catch (err) {
      console.error('URL 解析失败:', err);
    }
  }
});

// 保存配置并刷新页面
elements.saveBtn.addEventListener('click', () => {
  const fontFamily = elements.fontFamily.value;
  
  // 将当前显示的列表同步到完整数据对象中
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

  // 写入 Chrome 本地存储
  chrome.storage.local.set(saveData, async () => {
    // 显示保存成功提示
    elements.status.classList.remove('hidden');
    setTimeout(() => {
      elements.status.classList.add('hidden');
    }, 2000);

    // 刷新当前活动标签页以应用新字体
    const[tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      chrome.tabs.reload(tab.id);
    }
  });
});