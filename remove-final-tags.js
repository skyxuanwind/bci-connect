const fs = require('fs');

const filePath = './client/src/pages/coach/CoachDashboard.js';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('移除最後的多餘標籤...');

// 移除最後的多餘標籤（按行號倒序處理）
const extraTagLines = [753, 752];

extraTagLines.forEach(lineNum => {
  const lineIndex = lineNum - 1;
  if (lines[lineIndex] && lines[lineIndex].trim() === '</div>') {
    lines.splice(lineIndex, 1);
    console.log(`移除第${lineNum}行的多餘 </div> 標籤`);
  }
});

// 寫回文件
const finalContent = lines.join('\n');
fs.writeFileSync(filePath, finalContent, 'utf8');

console.log('移除完成！');