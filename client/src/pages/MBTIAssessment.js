import React, { useMemo, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// 簡易版 MBTI 測評頁面（32 題）
// 每題兩個選項，分別對應 MBTI 四個維度的其中一邊
// 維度：E/I, S/N, T/F, J/P

const QUESTIONS = [
  // E vs I
  { dim: 'EI', A: { key: 'E', text: '參加社交派對時，我喜歡和很多人寒暄聊聊' }, B: { key: 'I', text: '參加社交派對時，我更喜歡和少數朋友深度聊天' } },
  { dim: 'EI', A: { key: 'E', text: '遇到新環境時，我會主動認識新朋友' }, B: { key: 'I', text: '遇到新環境時，我會先觀察再互動' } },
  { dim: 'EI', A: { key: 'E', text: '我從與他人互動中獲得能量' }, B: { key: 'I', text: '我從獨處與思考中獲得能量' } },
  { dim: 'EI', A: { key: 'E', text: '工作時，我喜歡討論與腦力激盪' }, B: { key: 'I', text: '工作時，我偏好專注安靜地完成' } },
  { dim: 'EI', A: { key: 'E', text: '我習慣把想法說出來再釐清' }, B: { key: 'I', text: '我習慣先在腦中想清楚再開口' } },
  { dim: 'EI', A: { key: 'E', text: '認識新朋友讓我感到興奮' }, B: { key: 'I', text: '認識新朋友讓我感到需要時間適應' } },
  { dim: 'EI', A: { key: 'E', text: '我喜歡團隊中的熱鬧氛圍' }, B: { key: 'I', text: '我偏好安靜、有秩序的合作方式' } },
  { dim: 'EI', A: { key: 'E', text: '臨時演講對我來說不難' }, B: { key: 'I', text: '我更喜歡事先準備好的發言' } },

  // S vs N
  { dim: 'SN', A: { key: 'S', text: '我會先看當下的事實與細節' }, B: { key: 'N', text: '我會先思考可能性與整體趨勢' } },
  { dim: 'SN', A: { key: 'S', text: '學習時我偏好具體範例' }, B: { key: 'N', text: '學習時我偏好概念與模型' } },
  { dim: 'SN', A: { key: 'S', text: '我信任經驗與證據' }, B: { key: 'N', text: '我信任直覺與靈感' } },
  { dim: 'SN', A: { key: 'S', text: '我會一步一步按部就班' }, B: { key: 'N', text: '我會先設想全局再行動' } },
  { dim: 'SN', A: { key: 'S', text: '我重視實用性與可行性' }, B: { key: 'N', text: '我重視創新與可能性' } },
  { dim: 'SN', A: { key: 'S', text: '我注意當下事物的現況' }, B: { key: 'N', text: '我關注事物未來的發展' } },
  { dim: 'SN', A: { key: 'S', text: '我常用五感去理解世界' }, B: { key: 'N', text: '我常用聯想去理解世界' } },
  { dim: 'SN', A: { key: 'S', text: '我寫作時言簡意賅、直截了當' }, B: { key: 'N', text: '我寫作時富含比喻與抽象概念' } },

  // T vs F
  { dim: 'TF', A: { key: 'T', text: '做決策時我優先考慮邏輯與公平' }, B: { key: 'F', text: '做決策時我優先考慮人際與感受' } },
  { dim: 'TF', A: { key: 'T', text: '我擅長客觀評估利弊' }, B: { key: 'F', text: '我擅長同理他人感受' } },
  { dim: 'TF', A: { key: 'T', text: '我會直接提出問題與建議' }, B: { key: 'F', text: '我會先顧及對方的感受再提出' } },
  { dim: 'TF', A: { key: 'T', text: '我認為衝突是釐清問題的機會' }, B: { key: 'F', text: '我傾向避免衝突以維持和諧' } },
  { dim: 'TF', A: { key: 'T', text: '我喜歡以數據和事實支撐觀點' }, B: { key: 'F', text: '我喜歡從價值觀與關係面思考' } },
  { dim: 'TF', A: { key: 'T', text: '別人說我理性、冷靜' }, B: { key: 'F', text: '別人說我溫暖、體貼' } },
  { dim: 'TF', A: { key: 'T', text: '我偏好清楚、直接的溝通' }, B: { key: 'F', text: '我偏好委婉、照顧情緒的溝通' } },
  { dim: 'TF', A: { key: 'T', text: '我欣賞一針見血的反饋' }, B: { key: 'F', text: '我欣賞鼓勵與肯定的反饋' } },

  // J vs P
  { dim: 'JP', A: { key: 'J', text: '我會先規劃再行動' }, B: { key: 'P', text: '我喜歡彈性、即興而為' } },
  { dim: 'JP', A: { key: 'J', text: '我喜歡列清單、按計畫完成' }, B: { key: 'P', text: '我喜歡保留選項、隨機應變' } },
  { dim: 'JP', A: { key: 'J', text: '面對截止日我會提前完成' }, B: { key: 'P', text: '面對截止日我常在壓力下爆發' } },
  { dim: 'JP', A: { key: 'J', text: '我追求確定性與結論' }, B: { key: 'P', text: '我喜歡探索與開放性' } },
  { dim: 'JP', A: { key: 'J', text: '我重視結構與秩序' }, B: { key: 'P', text: '我重視彈性與即興' } },
  { dim: 'JP', A: { key: 'J', text: '我會把事情安排得井然有序' }, B: { key: 'P', text: '我會隨機安排、看當下情況' } },
  { dim: 'JP', A: { key: 'J', text: '我喜歡明確的計畫與步驟' }, B: { key: 'P', text: '我喜歡按感覺走的自由' } },
  { dim: 'JP', A: { key: 'J', text: '我需要完成度來讓我安心' }, B: { key: 'P', text: '我需要選擇與變化讓我有活力' } },
];

const TYPE_DESCRIPTIONS = {
  INFP: '調停者：理想主義且富同理心，重視價值與意義，適合關係建立與內容創作。',
  INFJ: '提倡者：洞察力強、關懷他人，善於長期規劃與引導他人成長。',
  INTJ: '建築師：邏輯嚴謹、策略性高，擅長系統設計與長期規劃。',
  INTP: '邏輯學家：理性好奇，喜歡探索概念，適合研究與解決複雜問題。',
  ISFP: '探險家：感受細膩、追求自由，擅長以行動與作品表達自我。',
  ISFJ: '守衛者：可靠踏實、重視責任，擅長支持團隊與維護秩序。',
  ISTJ: '物流師：務實謹慎、重視細節，擅長流程管理與執行。',
  ISTP: '鑄造師：冷靜靈活、動手能力強，擅長排除故障與臨場解決。',
  ENFP: '競選者：熱情創意、擅長啟發他人，適合創新與人脈拓展。',
  ENFJ: '主人公：具影響力與同理心，擅長組織與帶領團隊。',
  ENTJ: '指揮官：目標導向、具決斷力，擅長統籌資源與推動變革。',
  ENTP: '辯論家：點子多、反應快，擅長創新與說服。',
  ESFP: '表演者：活力充沛、熱愛互動，擅長帶動氣氛與即時表現。',
  ESFJ: '執政官：關心他人、善於協調，擅長建立秩序與服務團隊。',
  ESTJ: '總經理：實事求是、管理能力強，擅長制定規範與執行計畫。',
  ESTP: '企業家：行動果敢、喜歡挑戰，擅長即時決策與拓展機會。',
};

const MBTIAssessment = () => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // 儲存 'A' 或 'B'
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const total = QUESTIONS.length;
  const progress = Math.round(((index) / total) * 100);

  const handleAnswer = (choice) => {
    const next = [...answers];
    next[index] = choice; // 'A' 或 'B'
    setAnswers(next);
    if (index < total - 1) {
      setIndex(index + 1);
    }
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const computeType = (finalAnswers) => {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    QUESTIONS.forEach((q, i) => {
      const choice = finalAnswers[i];
      if (!choice) return;
      const side = choice === 'A' ? q.A.key : q.B.key; // E/I/S/N/T/F/J/P
      scores[side] += 1;
    });
    const type = `${scores.E >= scores.I ? 'E' : 'I'}${scores.S >= scores.N ? 'S' : 'N'}${scores.T >= scores.F ? 'T' : 'F'}${scores.J >= scores.P ? 'J' : 'P'}`;
    return type;
  };

  const current = QUESTIONS[index];

  const onSubmit = async () => {
    if (answers.length < total || answers.some((a) => a !== 'A' && a !== 'B')) {
      toast.error('請完成所有題目再提交');
      return;
    }
    const mbtiType = computeType(answers);
    setSubmitting(true);
    try {
      await api.post('/api/users/mbti-type', { mbtiType });
      setResult(mbtiType);
      toast.success('測評完成，已為您儲存結果');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || '儲存失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const key = (result || '').toUpperCase();
    const desc = TYPE_DESCRIPTIONS[key] || '感謝完成測評！';
    return (
      <div className="min-h-screen bg-primary-900 text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-primary-800 rounded-xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-4">🎉 測評完成！</h1>
          <p className="text-lg mb-6">您的性格類型是：</p>
          <div className="text-5xl font-extrabold text-yellow-300 tracking-widest mb-4">{key}</div>
          <p className="text-primary-100 leading-relaxed mb-8">{desc}</p>
          <div className="space-y-3 text-sm text-primary-200">
            <p>• 您可以在 AI 畫像頁面中使用此結果，獲取更精準的商務互動建議。</p>
            <p>• 若需更改結果，可重新進行測評。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-primary-800 rounded-xl shadow-xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">MBTI 性格測評</h1>
          <p className="text-primary-200 text-sm mt-2">共 {total} 題，花費約 10-15 分鐘。請直覺作答，沒有對錯之分。</p>
        </div>

        {/* 進度條 */}
        <div className="w-full bg-primary-700 rounded-full h-3 mb-6 overflow-hidden">
          <div className="bg-yellow-400 h-3 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm text-primary-200 mb-4">
          <span>進度：{index}/{total}</span>
          <span>{progress}%</span>
        </div>

        {/* 題目卡片 */}
        <div className="bg-primary-900 rounded-lg p-5 border border-primary-700 mb-6">
          <div className="text-primary-300 text-sm mb-2">第 {index + 1} 題</div>
          <div className="text-lg font-medium mb-4">請選擇較符合您的描述：</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className={`p-4 rounded-lg border text-left transition-colors ${answers[index]==='A' ? 'bg-yellow-400 text-primary-900 border-yellow-300' : 'border-primary-600 hover:border-yellow-400'}`}
              onClick={() => handleAnswer('A')}
            >
              A. {current.A.text}
            </button>
            <button
              className={`p-4 rounded-lg border text-left transition-colors ${answers[index]==='B' ? 'bg-yellow-400 text-primary-900 border-yellow-300' : 'border-primary-600 hover:border-yellow-400'}`}
              onClick={() => handleAnswer('B')}
            >
              B. {current.B.text}
            </button>
          </div>
        </div>

        {/* 操作列 */}
        <div className="flex items-center justify-between">
          <button
            className="px-4 py-2 rounded-md bg-primary-700 hover:bg-primary-600 text-sm"
            onClick={goPrev}
            disabled={index===0}
          >
            上一題
          </button>

          {index < total - 1 ? (
            <button
              className="px-6 py-2 rounded-md bg-yellow-400 hover:bg-yellow-300 text-primary-900 font-semibold"
              onClick={() => setIndex(index + 1)}
              disabled={typeof answers[index] === 'undefined'}
            >
              下一題
            </button>
          ) : (
            <button
              className="px-6 py-2 rounded-md bg-green-400 hover:bg-green-300 text-primary-900 font-semibold disabled:opacity-60"
              onClick={onSubmit}
              disabled={submitting || answers.length < total}
            >
              {submitting ? '提交中…' : '提交結果'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MBTIAssessment;