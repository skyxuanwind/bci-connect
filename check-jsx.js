const fs = require('fs');
const content = fs.readFileSync('client/src/pages/coach/CoachDashboard.js', 'utf8');
const lines = content.split('\n');

// 檢查每一行的JSX標籤
let stack = [];
let errors = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // 匹配所有JSX標籤
  const tagMatches = line.match(/<\/?[a-zA-Z][^>]*>/g);
  
  if (tagMatches) {
    tagMatches.forEach(tag => {
      if (tag.startsWith('</')) {
        // 結束標籤
        const tagName = tag.match(/<\/([a-zA-Z]+)/)[1];
        
        if (stack.length === 0) {
          errors.push(`第${lineNum}行: 多餘的結束標籤 ${tag}`);
        } else {
          const lastTag = stack[stack.length - 1];
          if (lastTag.name === tagName) {
            stack.pop();
          } else {
            errors.push(`第${lineNum}行: 標籤不匹配，期望 </${lastTag.name}> 但找到 ${tag}`);
          }
        }
      } else if (!tag.endsWith('/>')) {
        // 開始標籤（非自閉合）
        const tagName = tag.match(/<([a-zA-Z]+)/)[1];
        stack.push({name: tagName, line: lineNum});
      }
    });
  }
}

console.log('錯誤列表:');
errors.forEach(error => console.log(error));

console.log('\n未閉合的標籤:');
stack.forEach(tag => console.log(`第${tag.line}行: <${tag.name}>`));

console.log(`\n總錯誤數: ${errors.length}`);
console.log(`未閉合標籤數: ${stack.length}`);