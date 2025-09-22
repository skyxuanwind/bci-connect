const fs = require('fs');

const filePath = 'client/src/pages/coach/CoachDashboard.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 修復規則
const fixes = [
  // 標籤不匹配的修復
  { line: 554, type: 'replace', from: '</button>', to: '</div>' },
  { line: 597, type: 'replace', from: '</button>', to: '</div>' },
  { line: 681, type: 'replace', from: '</button>', to: '</div>' },
  { line: 688, type: 'replace', from: '</button>', to: '</div>' },
  { line: 759, type: 'replace', from: '</a>', to: '</div>' },
  { line: 765, type: 'replace', from: '</Link>', to: '</div>' },
  
  // 多餘標籤的移除
  { line: 613, type: 'remove', tag: '</div>' },
  { line: 692, type: 'remove', tag: '</div>' },
  { line: 698, type: 'remove', tag: '</div>' },
  { line: 711, type: 'remove', tag: '</div>' },
  { line: 712, type: 'remove', tag: '</div>' },
  { line: 720, type: 'remove', tag: '</button>' },
  { line: 726, type: 'remove', tag: '</button>' },
  { line: 727, type: 'remove', tag: '</div>' },
  { line: 740, type: 'remove', tag: '</div>' },
  { line: 743, type: 'remove', tag: '</div>' },
  { line: 768, type: 'remove', tag: '</div>' },
  { line: 769, type: 'remove', tag: '</div>' },
  { line: 770, type: 'remove', tag: '</div>' },
  { line: 772, type: 'remove', tag: '</div>' }
];

// 按行號倒序排序，避免修改後行號變化的問題
fixes.sort((a, b) => b.line - a.line);

let processedErrors = [];

fixes.forEach(fix => {
  const lineIndex = fix.line - 1;
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const originalLine = lines[lineIndex];
    
    if (fix.type === 'replace') {
      if (originalLine.includes(fix.from)) {
        lines[lineIndex] = originalLine.replace(fix.from, fix.to);
        processedErrors.push(`第${fix.line}行: 替換 ${fix.from} 為 ${fix.to}`);
      }
    } else if (fix.type === 'remove') {
      if (originalLine.includes(fix.tag)) {
        lines[lineIndex] = originalLine.replace(fix.tag, '');
        processedErrors.push(`第${fix.line}行: 移除 ${fix.tag}`);
      }
    }
  }
});

// 寫入修復後的文件
fs.writeFileSync(filePath, lines.join('\n'));

console.log('修復完成！已處理以下錯誤:');
processedErrors.forEach(error => console.log(error));
console.log(`總共處理了 ${processedErrors.length} 個錯誤`);