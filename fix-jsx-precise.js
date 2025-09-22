const fs = require('fs');

const filePath = 'client/src/pages/coach/CoachDashboard.js';

// 定義修復規則
const fixes = [
  // 標籤不匹配修復 - 將錯誤的結束標籤改為正確的
  { line: 554, type: 'replace', from: '</button>', to: '</div>' },
  { line: 597, type: 'replace', from: '</button>', to: '</div>' },
  { line: 681, type: 'replace', from: '</button>', to: '</div>' },
  { line: 688, type: 'replace', from: '</button>', to: '</div>' },
  { line: 759, type: 'replace', from: '</a>', to: '</div>' },
  { line: 765, type: 'replace', from: '</Link>', to: '</div>' },
  
  // 多餘的結束標籤移除
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

// 按行號倒序排序，從後往前修復避免行號變化
fixes.sort((a, b) => b.line - a.line);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  console.log('開始修復JSX錯誤...');
  
  fixes.forEach(fix => {
    const lineIndex = fix.line - 1; // 轉換為0基索引
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const originalLine = lines[lineIndex];
      
      if (fix.type === 'replace') {
        // 替換標籤
        if (originalLine.includes(fix.from)) {
          lines[lineIndex] = originalLine.replace(fix.from, fix.to);
          console.log(`第${fix.line}行: 將 ${fix.from} 替換為 ${fix.to}`);
        }
      } else if (fix.type === 'remove') {
        // 移除多餘的標籤
        if (originalLine.trim() === fix.tag) {
          lines.splice(lineIndex, 1);
          console.log(`第${fix.line}行: 移除多餘的 ${fix.tag}`);
        } else if (originalLine.includes(fix.tag)) {
          lines[lineIndex] = originalLine.replace(fix.tag, '');
          console.log(`第${fix.line}行: 從行中移除 ${fix.tag}`);
        }
      }
    }
  });
  
  // 寫入修復後的文件
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('JSX錯誤修復完成！');
  
} catch (error) {
  console.error('修復過程中出現錯誤:', error);
}