const fs = require('fs');

const filePath = './client/src/pages/coach/CoachDashboard.js';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('開始移除多餘的結束標籤...');

// 需要移除的多餘標籤行號（按倒序處理）
const extraTagLines = [719, 713, 687, 686];

extraTagLines.forEach(lineNum => {
  const lineIndex = lineNum - 1;
  if (lines[lineIndex] && lines[lineIndex].trim() === '</div>') {
    lines.splice(lineIndex, 1);
    console.log(`移除第${lineNum}行的多餘 </div> 標籤`);
  }
});

// 寫回文件
const fixedContent = lines.join('\n');
fs.writeFileSync(filePath, fixedContent, 'utf8');

console.log('移除完成！');