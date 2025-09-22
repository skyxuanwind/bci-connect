const fs = require('fs');

const filePath = 'client/src/pages/coach/CoachDashboard.js';

// 讀取文件
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('開始修復JSX結構錯誤...');

// 精確修復規則 - 只修復真正的錯誤
const fixes = [
  // 修復button標籤閉合錯誤
  { line: 678, search: '                                      </div>', replace: '                                      </button>' },
  { line: 685, search: '                                      </div>', replace: '                                      </button>' },
  
  // 修復button標籤未閉合
  { line: 711, search: '                          <ChevronLeftIcon className="h-5 w-5 text-gold-300" />', replace: '                          <ChevronLeftIcon className="h-5 w-5 text-gold-300" />\n                        </button>' },
  { line: 715, search: '                          <ChevronRightIcon className="h-5 w-5 text-gold-300" />', replace: '                          <ChevronRightIcon className="h-5 w-5 text-gold-300" />\n                        </button>' },
  
  // 修復錯誤的結束標籤
  { line: 745, search: '                  </div>', replace: '                  </a>' },
  { line: 751, search: '                  </div>', replace: '                  </Link>' }
];

// 按行號倒序排序，避免行號偏移
fixes.sort((a, b) => b.line - a.line);

let fixedCount = 0;
fixes.forEach(fix => {
  const lineIndex = fix.line - 1;
  if (lineIndex >= 0 && lineIndex < lines.length) {
    if (lines[lineIndex].includes(fix.search.trim())) {
      lines[lineIndex] = lines[lineIndex].replace(fix.search.trim(), fix.replace.trim());
      console.log(`✓ 修復第 ${fix.line} 行: ${fix.search.trim()} -> ${fix.replace.trim()}`);
      fixedCount++;
    } else {
      console.log(`⚠ 第 ${fix.line} 行未找到預期內容: ${fix.search.trim()}`);
    }
  }
});

// 寫入修復後的內容
const fixedContent = lines.join('\n');
fs.writeFileSync(filePath, fixedContent);

console.log(`\n修復完成！共修復 ${fixedCount} 個錯誤。`);