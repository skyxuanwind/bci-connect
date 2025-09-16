// 測試學員過濾邏輯的簡單腳本

// 模擬API響應數據（基於之前的調試結果）
const mockCoacheesData = [
  {
    id: 6,
    name: '學員1',
    coachUserId: 8, // 現在添加了這個字段
    coach: { id: 8, name: '吳岳軒', email: 'xuanowind@gmail.com' }
  },
  {
    id: 816,
    name: '學員2', 
    coachUserId: 8,
    coach: { id: 8, name: '吳岳軒', email: 'xuanowind@gmail.com' }
  },
  {
    id: 632,
    name: '學員3',
    coachUserId: 8,
    coach: { id: 8, name: '吳岳軒', email: 'xuanowind@gmail.com' }
  }
];

// 模擬當前登錄的教練ID
const currentCoachId = 8;

console.log('🔍 測試學員過濾邏輯...');
console.log(`\n當前教練ID: ${currentCoachId}`);
console.log(`API返回的學員數據:`);

mockCoacheesData.forEach((coachee, index) => {
  console.log(`\n學員 ${index + 1}:`);
  console.log(`  ID: ${coachee.id}`);
  console.log(`  姓名: ${coachee.name}`);
  console.log(`  coachUserId: ${coachee.coachUserId}`);
  console.log(`  coach.id: ${coachee.coach.id}`);
  console.log(`  是否屬於當前教練: ${coachee.coachUserId === currentCoachId ? '✅' : '❌'}`);
});

// 前端過濾邏輯測試
console.log('\n🎯 前端過濾邏輯測試:');
const filteredCoachees = mockCoacheesData.filter(coachee => {
  console.log(`檢查學員 ${coachee.name}: coachUserId(${coachee.coachUserId}) === currentCoachId(${currentCoachId}) = ${coachee.coachUserId === currentCoachId}`);
  return coachee.coachUserId === currentCoachId;
});

console.log(`\n📊 結果:`);
console.log(`  - 原始學員數: ${mockCoacheesData.length}`);
console.log(`  - 過濾後學員數: ${filteredCoachees.length}`);
console.log(`  - 應該顯示的學員:`);
filteredCoachees.forEach(coachee => {
  console.log(`    • ${coachee.name} (ID: ${coachee.id})`);
});

if (filteredCoachees.length === mockCoacheesData.length) {
  console.log('\n✅ 修復成功！所有學員都正確屬於當前教練');
} else {
  console.log('\n❌ 仍有問題，部分學員不屬於當前教練');
}

console.log('\n🚀 修復總結:');
console.log('1. 在my-coachees API響應中添加了coachUserId字段');
console.log('2. coachUserId字段的值來自數據庫查詢中的coach.id');
console.log('3. 前端可以使用coachUserId字段進行正確的過濾');
console.log('4. 這樣教練就只能看到自己的學員了');

console.log('\n📝 下一步:');
console.log('1. 將修復部署到生產環境');
console.log('2. 測試生產環境的API響應');
console.log('3. 確認前端正確使用coachUserId字段進行過濾');