const fs = require('fs');

const filePath = 'client/src/pages/coach/CoachDashboard.js';

// 讀取文件
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('開始修復所有JSX錯誤...');

// 修復規則 - 基於錯誤報告
const fixes = [
  // 標籤不匹配修復
  { line: 554, type: 'replace', search: '</button>', replace: '</div>' },
  { line: 597, type: 'replace', search: '</button>', replace: '</div>' },
  { line: 681, type: 'replace', search: '</button>', replace: '</div>' },
  { line: 688, type: 'replace', search: '</button>', replace: '</div>' },
  { line: 759, type: 'replace', search: '</a>', replace: '</div>' },
  { line: 765, type: 'replace', search: '</Link>', replace: '</div>' },
  
  // 多餘的結束標籤移除
  { line: 613, type: 'remove', search: '</div>' },
  { line: 692, type: 'remove', search: '</div>' },
  { line: 698, type: 'remove', search: '</div>' },
  { line: 711, type: 'remove', search: '</div>' },
  { line: 712, type: 'remove', search: '</div>' },
  { line: 720, type: 'remove', search: '</button>' },
  { line: 726, type: 'remove', search: '</button>' },
  { line: 727, type: 'remove', search: '</div>' },
  { line: 740, type: 'remove', search: '</div>' },
  { line: 743, type: 'remove', search: '</div>' },
  { line: 768, type: 'remove', search: '</div>' },
  { line: 769, type: 'remove', search: '</div>' },
  { line: 770, type: 'remove', search: '</div>' },
  { line: 772, type: 'remove', search: '</div>' }
];

// 按行號倒序排序，避免行號偏移
fixes.sort((a, b) => b.line - a.line);

let fixedCount = 0;
fixes.forEach(fix => {
  const lineIndex = fix.line - 1;
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const originalLine = lines[lineIndex];
    
    if (fix.type === 'replace') {
      if (originalLine.includes(fix.search)) {
        lines[lineIndex] = originalLine.replace(fix.search, fix.replace);
        console.log(`✓ 替換第 ${fix.line} 行: ${fix.search} -> ${fix.replace}`);
        fixedCount++;
      } else {
        console.log(`⚠ 第 ${fix.line} 行未找到: ${fix.search}`);
      }
    } else if (fix.type === 'remove') {
      if (originalLine.trim() === fix.search || originalLine.includes(fix.search)) {
        // 如果整行只有這個標籤，移除整行
        if (originalLine.trim() === fix.search) {
          lines.splice(lineIndex, 1);
        } else {
          // 否則只移除標籤部分
          lines[lineIndex] = originalLine.replace(fix.search, '');
        }
        console.log(`✓ 移除第 ${fix.line} 行: ${fix.search}`);
        fixedCount++;
      } else {
        console.log(`⚠ 第 ${fix.line} 行未找到要移除的: ${fix.search}`);
      }
    }
  }
});

// 寫入修復後的內容
const fixedContent = lines.join('\n');
fs.writeFileSync(filePath, fixedContent);

console.log(`\n修復完成！共修復 ${fixedCount} 個錯誤。`);