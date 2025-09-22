const fs = require('fs');

console.log('開始移除多餘的標籤...');

// 讀取文件
let content = fs.readFileSync('./client/src/pages/coach/CoachDashboard.js', 'utf8');
const lines = content.split('\n');

// 按倒序移除多餘的標籤，避免行號變化影響
const linesToRemove = [750, 718, 712, 680]; // 第750、718、712、680行

for (const lineNum of linesToRemove) {
  const index = lineNum - 1; // 轉換為0索引
  if (lines[index]) {
    const line = lines[index].trim();
    if (line === '</div>' || line === '</button>') {
      lines.splice(index, 1);
      console.log(`移除第${lineNum}行的多餘標籤: ${line}`);
    }
  }
}

// 寫入修復後的內容
fs.writeFileSync('./client/src/pages/coach/CoachDashboard.js', lines.join('\n'));
console.log('移除多餘標籤完成！');