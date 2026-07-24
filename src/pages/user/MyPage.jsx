import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { api, logout } from '../../api';
import UserHeader from '../../components/UserHeader';

export default function MyPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [configQuestions, setConfigQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState({});
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/mypage'),
      api('/config/questions').catch(() => ({ questions: [] })),
    ])
      .then(([myData, config]) => {
        setForm({
          name: myData.user?.name || '',
          phone: myData.user?.phone || '',
          email: myData.user?.email || '',
        });
        setConfigQuestions(config.questions || []);
        if (myData.mypage_answers) {
          setAnswers(myData.mypage_answers);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const calcTenureYears = (joinDate) => {
    if (!joinDate) return null;
    const join = new Date(joinDate);
    const today = new Date();
    let years = today.getFullYear() - join.getFullYear();
    const monthDiff = today.getMonth() - join.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < join.getDate())) {
      years--;
    }
    return years;
  };

  const getTenureOptionId = (years) => {
    if (years === null) return null;
    if (years > 15) return 'Q05_A';
    if (years > 10) return 'Q05_B';
    if (years > 5) return 'Q05_C';
    if (years > 1) return 'Q05_D';
    return 'Q05_E';
  };

  const handleAnswer = (questionId, value) => {
    const next = { ...answers, [questionId]: value };
    if (questionId === 'Q04_JOIN_DATE') {
      const years = calcTenureYears(value);
      const tenureId = getTenureOptionId(years);
      if (tenureId) next['Q05_TENURE'] = tenureId;
      else delete next['Q05_TENURE'];
    }
    setAnswers(next);
  };

  const calcScore = () => {
    let total = 0;
    configQuestions.forEach(q => {
      if (q.type === 'radio' && q.scored && answers[q.question_id]) {
        const option = (q.options || []).find(o => o.option_id === answers[q.question_id]);
        if (option) total += option.score;
      }
    });
    return total;
  };

  const totalScore = calcScore();

  const validate = () => {
    const missing = [];
    if (!form.phone.trim()) missing.push('연락처');
    if (!form.email.trim()) missing.push('회사 이메일');
    configQuestions.forEach(q => {
      if (!q.required) return;
      const val = answers[q.question_id];
      if (!val || (typeof val === 'string' && !val.trim())) {
        missing.push(`"${q.label}"`);
      }
    });
    return missing;
  };

  const handleSave = async () => {
    const missing = validate();
    if (missing.length > 0) {
      alert(`다음 필수 항목을 입력해 주세요:\n${missing.join('\n')}`);
      return;
    }
    setSaving(true);
    try {
      await api('/mypage', {
        method: 'PUT',
        body: JSON.stringify({
          phone: form.phone,
          email: form.email,
          answers: JSON.stringify(answers),
        }),
      });
      localStorage.setItem('visited_mypage', 'true');
      alert('저장되었습니다.');
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setPwdSaving(true);
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: pwdForm.current_password,
          new_password: pwdForm.new_password,
        }),
      });
      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      logout();
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setPwdSaving(false);
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

  return (
    <div className="bg-background min-h-screen">
      <UserHeader />
      <main className="pt-[64px] md:pt-24 pb-20 md:pb-24 px-4 md:px-gutter max-w-max-width mx-auto">
        <nav className="flex items-center gap-2 text-text-sub mb-4 text-xs">
          <span>홈</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-primary">마이페이지</span>
        </nav>
        <h1 className="text-[22px] md:text-[28px] font-semibold mb-6 md:mb-8">내 정보 관리</h1>
        <div className="flex flex-col gap-8 max-w-4xl">
          <section className="bento-card p-4 md:p-8">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              기본 정보
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">이름</label>
                <div className="bg-slate-50 p-3 rounded-lg text-text-sub">{form.name}</div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub"><span className="bg-primary-light text-badge-active-text px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">필수</span>연락처</label>
                <input
                  className="neumorphic-recessed p-3 rounded-lg border-none w-full"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub"><span className="bg-primary-light text-badge-active-text px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">필수</span>회사 이메일</label>
                <input
                  className="neumorphic-recessed p-3 rounded-lg border-none w-full"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="bento-card p-4 md:p-8">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              비밀번호 변경
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">현재 비밀번호</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={pwdForm.current_password} onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">새 비밀번호</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={pwdForm.new_password} onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-sub">새 비밀번호 확인</label>
                <input type="password" className="neumorphic-recessed p-3 rounded-lg border-none w-full" value={pwdForm.confirm_password} onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })} required />
              </div>
              <button type="submit" disabled={pwdSaving} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg text-sm disabled:opacity-50">
                {pwdSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </section>

          {configQuestions.length > 0 && (
            <section className="bento-card p-4 md:p-8">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">playlist_add_check</span>
                주차 신청 항목
              </h2>
              <p className="text-sm text-text-sub mb-4">
                주차 신청 시 사용되는 항목입니다. 아래에서 답변을 입력하고 점수를 확인해 보세요.
              </p>
              <div className="space-y-4">
                {configQuestions.map((q, i) => (
                  <div key={q.question_id || i} className="border rounded-xl p-4 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.required ? 'bg-primary-light text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>
                        {q.required ? '필수' : '선택'}
                      </span>
                      <h4 className="font-bold text-sm">{q.question_no}. {q.label}</h4>
                      {q.scored && (
                        <span className="ml-auto text-primary font-bold text-xs">
                          최대 {q.options?.length ? Math.max(...q.options.map(o => o.score)) : q.score || 0} pt
                        </span>
                      )}
                    </div>

                    {q.type === 'text' && (
                      <div className="ml-7">
                        <input
                          type="text"
                          placeholder={q.placeholder || '텍스트 입력'}
                          value={answers[q.question_id] || ''}
                          onChange={e => handleAnswer(q.question_id, e.target.value)}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    {q.type === 'radio' && q.options && (
                      <div className="ml-7 space-y-1.5">
                        {[...q.options].sort((a, b) => b.score - a.score).map(o => (
                          <label key={o.option_id || o.label} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="radio"
                              name={`q_${q.question_id}`}
                              checked={answers[q.question_id] === o.option_id}
                              onChange={() => handleAnswer(q.question_id, o.option_id)}
                              className="accent-primary"
                            />
                            <span className="text-sm text-gray-700">{o.label}</span>
                            <span className="ml-auto text-primary font-bold text-xs">+{o.score}pt</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'date' && (
                      <div className="ml-7">
                        <input
                          type="date"
                          value={answers[q.question_id] || ''}
                          onChange={e => handleAnswer(q.question_id, e.target.value)}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    {q.type === 'textarea' && (
                      <div className="ml-7">
                        <textarea
                          placeholder={q.placeholder || '텍스트 입력'}
                          value={answers[q.question_id] || ''}
                          onChange={e => handleAnswer(q.question_id, e.target.value)}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </section>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-2.5 bg-primary text-white font-bold rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </main>

      {configQuestions.some(q => q.scored) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-50">
          <div className="max-w-4xl mx-auto px-4 md:px-gutter py-3 flex items-center justify-between">
            <span className="text-sm text-text-sub font-medium">주차 신청 점수</span>
            <span className="text-xl font-bold text-primary">
              총 <span className="text-2xl">{totalScore}</span> 점
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
