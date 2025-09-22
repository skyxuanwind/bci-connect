const fs = require('fs');

const filePath = 'client/src/pages/coach/CoachDashboard.js';

// 定義剩餘的修復規則
const fixes = [
  { line: 609, type: 'remove', tag: '</div>' },
  { line: 612, type: 'remove', tag: '</div>' },
  { line: 688, type: 'remove', tag: '</div>' },
  { line: 689, type: 'remove', tag: '</div>' },
  { line: 756, type: 'remove', tag: '</div>' },
  { line: 757, type: 'remove', tag: '</div>' }
];

// 按行號倒序排序，從後往前修復避免行號變化
fixes.sort((a, b) => b.line - a.line);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  console.log('開始最終修復剩餘的JSX錯誤...');
  
  fixes.forEach(fix => {
    const lineIndex = fix.line - 1; // 轉換為0基索引
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const originalLine = lines[lineIndex];
      
      if (fix.type === 'remove') {
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
  console.log('最終JSX錯誤修復完成！');
  
} catch (error) {
  console.error('修復過程中出現錯誤:', error);
}