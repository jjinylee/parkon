{/* 화면 ID: UI_201 | 주차 신청 (입력) */}
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { api } from '../../api';
import UserHeader from '../../components/UserHeader';

const INPUT_CLASS = 'neumorphic-recessed w-full p-3 text-sm';
const RADIO_CLASS = 'flex items-center p-4 rounded-xl border border-outline-variant hover:bg-primary/5 cursor-pointer transition-all';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const templateId = location.state?.templateId;

  const [template, setTemplate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [consentAgreed, setConsentAgreed] = useState(null);
  const [appId, setAppId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configQuestions, setConfigQuestions] = useState([]);
  const [showMypageConfirm, setShowMypageConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!templateId) { navigate('/'); return; }

    let fetchedQuestions = [];

    api(`/templates/${templateId}`)
      .then(data => {
        setTemplate(data);
        fetchedQuestions = data.questions || [];
        setQuestions(fetchedQuestions);
        return Promise.all([
          api('/applications'),
          api('/mypage').catch(() => null),
          api('/config/questions').catch(() => ({ questions: [] })),
        ]);
      })
      .then(([apps, mypage, config]) => {
        const configQ = config.questions || [];
        setConfigQuestions(configQ);
        const draft = apps.find(a => a.template_id === templateId && a.status === 'draft');
        if (draft) {
          setAppId(draft.id);
          return api(`/applications/${draft.id}`).then(app => ({ app, mypage, configQ }));
        }
        return { app: null, mypage, configQ };
      })
      .then(({ app, mypage, configQ }) => {
        const loaded = {};
        if (app) {
          setConsentAgreed(app.consent_agreed === 1 ? true : app.consent_agreed === 0 ? false : null);
        }
        if (app?.answers) {
          app.answers.forEach(a => {
            loaded[a.question_id] = { option_id: a.option_id, answer_text: a.answer_text };
          });
        }
        if (mypage?.mypage_answers && fetchedQuestions.length > 0) {
          Object.entries(mypage.mypage_answers).forEach(([cfgQId, value]) => {
            const cfg = configQ.find(c => c.question_id === cfgQId);
            if (!cfg) return;
            const tplQ = fetchedQuestions.find(q => q.sort_order === cfg.question_no);
            if (!tplQ) return;
            if (loaded[tplQ.id]) return;
            if (tplQ.input_type === 'radio') {
              const cfgOpt = (cfg.options || []).find(o => o.option_id === value);
              if (cfgOpt) {
                const tplOpt = (tplQ.options || []).find(o => o.option_text === cfgOpt.label);
                if (tplOpt) loaded[tplQ.id] = { option_id: tplOpt.id, answer_text: null };
              }
            } else {
              loaded[tplQ.id] = { option_id: null, answer_text: value };
            }
          });
        }
        const q4q = fetchedQuestions.find(q => q.sort_order === 4);
        const q5q = fetchedQuestions.find(q => q.sort_order === 5);
        if (q4q && q5q && loaded[q4q.id]?.answer_text && !loaded[q5q.id]?.option_id) {
          const joinDate = loaded[q4q.id].answer_text;
          const join = new Date(joinDate);
          if (!isNaN(join.getTime())) {
            const now = new Date();
            let years = now.getFullYear() - join.getFullYear();
            const monthDiff = now.getMonth() - join.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < join.getDate())) years--;
            let label;
            if (years > 15) label = '15년 초과';
            else if (years > 10) label = '10년 초과 15년 미만';
            else if (years > 5) label = '5년 초과 10년 미만';
            else if (years > 1) label = '1년 초과 5년 미만';
            else label = '1년 미만';
            const opt = q5q.options?.find(o => o.option_text === label);
            if (opt) loaded[q5q.id] = { option_id: opt.id, answer_text: null };
          }
        }
        setAnswers(loaded);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const setAnswer = (qId, field, value) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], [field]: value } }));
  };

  const joinDateQ = questions.find(q => q.sort_order === 4);
  const tenureQ = questions.find(q => q.sort_order === 5);

  useEffect(() => {
    if (loading) return;
    if (!joinDateQ || !tenureQ) return;
    const dateVal = answers[joinDateQ.id]?.answer_text;
    if (!dateVal) return;

    const join = new Date(dateVal);
    if (isNaN(join.getTime())) return;
    const now = new Date();
    let years = now.getFullYear() - join.getFullYear();
    const monthDiff = now.getMonth() - join.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < join.getDate())) years--;

    let label;
    if (years > 15) label = '15년 초과';
    else if (years > 10) label = '10년 초과 15년 미만';
    else if (years > 5) label = '5년 초과 10년 미만';
    else if (years > 1) label = '1년 초과 5년 미만';
    else label = '1년 미만';

    const opt = tenureQ.options?.find(o => o.option_text === label);
    if (opt && answers[tenureQ.id]?.option_id !== opt.id) {
      setAnswers(prev => ({ ...prev, [tenureQ.id]: { ...prev[tenureQ.id], option_id: opt.id } }));
    }
  }, [joinDateQ?.id, tenureQ?.id, answers[joinDateQ?.id]?.answer_text, loading]);

  const previewScore = questions.reduce((sum, q) => {
    const ans = answers[q.id];
    if (!ans) return sum;
    if (q.input_type === 'radio' && ans.option_id) {
      const opt = q.options?.find(o => o.id === ans.option_id);
      return sum + (opt?.score || 0);
    }
    return sum + (q.score || 0);
  }, 0);

  const dDays = template ? Math.ceil((new Date(template.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  const saveToMypage = async () => {
    const mypageAnswers = {};
    questions.forEach(q => {
      const cfg = configQuestions.find(c => c.question_no === q.sort_order);
      if (!cfg) return;
      const ans = answers[q.id];
      if (!ans) return;
      if (q.input_type === 'radio' && ans.option_id) {
        const tplOpt = (q.options || []).find(o => o.id === ans.option_id);
        if (tplOpt) {
          const cfgOpt = (cfg.options || []).find(o => o.label === tplOpt.option_text);
          if (cfgOpt) mypageAnswers[cfg.question_id] = cfgOpt.option_id;
        }
      } else if (ans.answer_text) {
        mypageAnswers[cfg.question_id] = ans.answer_text;
      }
    });
    if (Object.keys(mypageAnswers).length > 0) {
      await api('/mypage', {
        method: 'PUT',
        body: JSON.stringify({ answers: JSON.stringify(mypageAnswers) }),
      }).catch(() => {});
    }
  };

  const validateRequired = () => {
    const missing = [];
    questions.forEach(q => {
      if (!q.is_required) return;
      const ans = answers[q.id];
      if (!ans) { missing.push(q.question_text); return; }
      if (q.input_type === 'radio' && !ans.option_id) missing.push(q.question_text);
      if (['text', 'date', 'textarea'].includes(q.input_type) && !ans.answer_text?.trim()) missing.push(q.question_text);
    });
    if (consentAgreed === null) missing.push('동의 확인');
    return missing;
  };

  const handleSaveClick = (action) => {
    if (action === 'submit') {
      const missing = validateRequired();
      if (missing.length > 0) {
        alert(`다음 필수 항목을 입력해 주세요:\n${missing.map((t, i) => `  ${i+1}. ${t}`).join('\n')}`);
        return;
      }
    }
    setPendingAction(action);
    setShowMypageConfirm(true);
  };

  const handleMypageConfirm = async (saveToMypageFlag) => {
    setShowMypageConfirm(false);
    if (saveToMypageFlag) await saveToMypage();
    await handleSave(pendingAction);
  };

  const handleSave = async (action) => {
    setSaving(true);
    try {
      let id = appId;
      if (!id) {
        const res = await api('/applications', {
          method: 'POST',
          body: JSON.stringify({ template_id: templateId }),
        });
        id = res.id;
        setAppId(id);
      }

      const answerList = questions.map(q => ({
        question_id: q.id,
        option_id: answers[q.id]?.option_id || null,
        answer_text: answers[q.id]?.answer_text || null,
      }));

      const body = { answers: answerList, consent_agreed: consentAgreed === true };
      if (action === 'submit') body.action = 'submit';

      await api(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      alert(action === 'submit' ? '제출되었습니다.' : '임시저장되었습니다.');
      if (action === 'submit') navigate('/');
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <UserHeader />
        <main className="pt-[64px] pb-8 px-4 max-w-max-width mx-auto">
          <div className="flex items-center justify-center h-64 text-text-sub">로딩 중...</div>
        </main>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="bg-background min-h-screen">
      <UserHeader />
      <main className="pt-[64px] md:pt-24 pb-8 md:pb-12 px-4 md:px-gutter max-w-max-width mx-auto">
        <nav className="flex items-center gap-1 text-[13px] text-text-sub mb-4">
          <span>홈</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span>주차 신청</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-semibold text-on-surface">주차 등록</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-[22px] md:text-[28px] font-semibold text-text-main">주차 등록</h1>
            <p className="text-[13px] md:text-[14px] text-text-sub mt-1">주차 신청을 위한 정보를 입력해 주세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-full md:w-auto px-6 py-2 rounded-lg border border-primary-light text-primary font-bold hover:bg-primary/5 transition-all text-sm">
              취소
            </button>
            <button onClick={() => handleSaveClick('draft')} disabled={saving} className="w-full md:w-auto px-6 py-2 rounded-lg border border-primary-light text-primary font-bold hover:bg-primary/5 transition-all text-sm disabled:opacity-50">
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button onClick={() => handleSaveClick('submit')} disabled={saving} className="w-full md:w-auto px-6 py-2 rounded-lg bg-primary text-white font-bold hover:shadow-lg transition-all active:scale-95 text-sm disabled:opacity-50">
              {saving ? '저장 중...' : '제출'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1">{template.title}</h3>
            <p className="text-sm text-text-sub">참여 기간: {template.start_date} ~ {template.end_date}</p>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold text-sm mt-3 md:mt-0">D-{dDays}</div>
        </div>

        {(template.description || (template.attachments && template.attachments.length > 0)) && (
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 mb-6">
            <h4 className="font-bold text-base mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              신청 안내
            </h4>
            {template.description && (
              <div className="text-sm text-text-sub leading-relaxed" dangerouslySetInnerHTML={{ __html: template.description }} />
            )}
            {template.attachments && template.attachments.length > 0 && (
              <div className={template.description ? 'mt-4 space-y-2' : 'space-y-2'}>
                <p className="text-xs font-medium text-text-sub mb-1">첨부 파일 ({template.attachments.length}개)</p>
                {template.attachments.map((f) => (
                  <a key={f.id}
                    href={`/api/v1/files/${f.id}/download`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-white hover:bg-gray-50 transition-colors text-sm"
                  >
                    <span className="material-symbols-outlined text-primary text-lg">description</span>
                    <span className="font-medium flex-1 truncate">{f.original_name}</span>
                    <span className="text-xs text-text-sub">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="material-symbols-outlined text-base text-text-sub">download</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-sm">{questions.findIndex(x => x.id === q.id) + 1}. {q.question_text}</span>
                {q.is_required ? (
                  <span className="text-red-500 text-xs font-medium">필수</span>
                ) : (
                  <span className="text-text-sub text-xs font-medium">선택</span>
                )}
                {q.score > 0 && q.input_type !== 'radio' && (
                  <span className="text-primary text-xs font-medium">(+{q.score}점)</span>
                )}
              </div>

              {q.input_type === 'text' && (
                <input
                  className={INPUT_CLASS}
                  placeholder={q.placeholder || ''}
                  value={answers[q.id]?.answer_text || ''}
                  onChange={e => setAnswer(q.id, 'answer_text', e.target.value)}
                />
              )}

              {q.input_type === 'date' && (
                <input
                  type="date"
                  className={`${INPUT_CLASS} max-w-xs`}
                  value={answers[q.id]?.answer_text || ''}
                  onChange={e => setAnswer(q.id, 'answer_text', e.target.value)}
                />
              )}

              {q.input_type === 'textarea' && (
                <textarea
                  className={`${INPUT_CLASS} min-h-[100px]`}
                  placeholder={q.placeholder || ''}
                  value={answers[q.id]?.answer_text || ''}
                  onChange={e => setAnswer(q.id, 'answer_text', e.target.value)}
                />
              )}

              {q.input_type === 'radio' && (
                <div className={q.options?.length > 4 ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                  {[...(q.options || [])].sort((a, b) => b.score - a.score).map(opt => (
                    <label key={opt.id} className={RADIO_CLASS}>
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        className="text-primary"
                        checked={answers[q.id]?.option_id === opt.id}
                        onChange={() => setAnswer(q.id, 'option_id', opt.id)}
                      />
                      <span className="ml-3">{opt.option_text}</span>
                      <span className="ml-auto text-xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">+{opt.score}점</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Consent */}
        <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-lg">info</span>
            <span className="font-bold text-sm text-primary">입력하신 사실과 불일치하는 경우, 3개월간 주차 이용이 제한될 수 있습니다. 이에 동의하시겠습니까?</span>
            <span className="text-red-500 text-xs font-medium">필수</span>
          </div>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center p-4 rounded-xl border border-outline-variant hover:bg-primary/5 cursor-pointer transition-all">
              <input type="radio" name="consent" className="text-primary"
                checked={consentAgreed === true}
                onChange={() => setConsentAgreed(true)} />
              <span className="ml-3 text-sm font-medium">예(동의)</span>
            </label>
            <label className="flex-1 flex items-center p-4 rounded-xl border border-outline-variant hover:bg-primary/5 cursor-pointer transition-all">
              <input type="radio" name="consent" className="text-primary"
                checked={consentAgreed === false}
                onChange={() => setConsentAgreed(false)} />
              <span className="ml-3 text-sm font-medium">아니오(미동의)</span>
            </label>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white rounded-xl shadow-xl border border-outline-variant p-3 md:p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">leaderboard</span>
            <span className="text-2xl md:text-3xl text-primary font-bold">{previewScore} pt</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-8">
          <button onClick={() => navigate('/')} className="w-full md:w-auto px-10 py-3 rounded-lg border border-primary-light text-primary font-bold hover:bg-primary/5 transition-all">
            취소
          </button>
          <button onClick={() => handleSaveClick('draft')} disabled={saving} className="w-full md:w-auto px-10 py-3 rounded-lg border border-primary-light text-primary font-bold hover:bg-primary/5 transition-all disabled:opacity-50">
            {saving ? '저장 중...' : '임시저장'}
          </button>
          <button onClick={() => handleSaveClick('submit')} disabled={saving} className="w-full md:w-auto px-12 py-3 rounded-lg bg-primary text-white font-bold shadow-lg hover:bg-primary-hover transition-all disabled:opacity-50">
            {saving ? '저장 중...' : '제출'}
          </button>
        </div>
      </main>

      {showMypageConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-2">마이페이지 저장 확인</h3>
            <p className="text-sm text-text-sub mb-6">
              다음 주차신청에 동일하게 적용할 수 있도록<br />
              마이페이지 정보에 저장할까요?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleMypageConfirm(false)}
                className="px-6 py-2.5 rounded-lg border border-outline-variant text-sm font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleMypageConfirm(true)}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
