import { useState, useRef, useEffect } from 'react';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import defaultConfig from '../../../parking_score_config.json';

export default function AdminQuestionConfig() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [configVersion, setConfigVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingConfig, setPendingConfig] = useState(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    api('/config/questions')
      .then(data => {
        const qs = data.questions || [];
        setQuestions(qs);
        setSavedQuestions(qs);
        setConfigVersion(data.version || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setPendingFileName(file.name);
    const reader = new FileReader();
    let parsed;
    reader.onload = (evt) => {
      try {
        parsed = JSON.parse(evt.target.result);
      } catch (err) {
        setError(`JSON 파싱 오류: ${err.message}`);
        setPendingConfig(null);
        return;
      }
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        setError('"questions" 키가 없거나 배열 형태가 아닙니다.');
        setPendingConfig(null);
        return;
      }
      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        const idx = i + 1;
        if (!q.question_no) { setError(`질문 #${idx}: question_no 항목이 없습니다.`); setPendingConfig(null); return; }
        if (!q.question_id) { setError(`질문 #${idx} (Q${q.question_no}): question_id 항목이 없습니다.`); setPendingConfig(null); return; }
        if (!q.label) { setError(`질문 #${idx} (${q.question_id}): label 항목이 없습니다.`); setPendingConfig(null); return; }
        if (!q.type) { setError(`질문 #${idx} (${q.question_id}): type 항목이 없습니다.`); setPendingConfig(null); return; }
        if (!['text', 'radio', 'date', 'textarea'].includes(q.type)) {
          setError(`질문 #${idx} (${q.question_id}): type 값 "${q.type}"은(는) 올바르지 않습니다. (text, radio, date, textarea 중 하나)`);
          setPendingConfig(null); return;
        }
        if (q.type === 'radio') {
          if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
            setError(`질문 #${idx} (${q.question_id}): radio 타입은 options 배열이 필수입니다.`);
            setPendingConfig(null); return;
          }
          for (let j = 0; j < q.options.length; j++) {
            const o = q.options[j];
            if (!o.label) { setError(`질문 #${idx} (${q.question_id}) / 옵션 #${j+1}: label 항목이 없습니다.`); setPendingConfig(null); return; }
            if (o.score === undefined || o.score === null) { setError(`질문 #${idx} (${q.question_id}) / 옵션 "${o.label}": score 항목이 없습니다.`); setPendingConfig(null); return; }
          }
        }
      }
      setPendingConfig(parsed);
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    if (!pendingConfig) { setError('업로드된 파일이 없습니다.'); return; }
    setError('');
    setQuestions(pendingConfig.questions || []);
    setConfigVersion(pendingConfig.version || '');
    setPendingConfig(null);
    setPendingFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (questions.length === 0) { setError('표시된 질문이 없습니다.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { questions, version: configVersion || undefined };
      await api('/config/questions', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSavedQuestions([...questions]);
      alert('저장되었습니다.');
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError('');
    if (pendingConfig) {
      setPendingConfig(null);
      setPendingFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setQuestions([...savedQuestions]);
    }
  };

  const handleLoadDefault = () => {
    setError('');
    const parsed = defaultConfig;
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      setError('기본 설정 파일에 "questions" 키가 없습니다.');
      return;
    }
    setPendingConfig(parsed);
    setPendingFileName('parking_score_config.json (기본)');
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify({ version: configVersion, questions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parking_score_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasUnsavedChanges = questions !== savedQuestions;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        <main className="flex-1 pt-[64px] ml-0 md:ml-[200px]">
          <AdminHeader />
          <div className="p-8 text-center text-text-sub">로딩 중...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <main className="flex-1 pt-[64px] ml-0 md:ml-[200px]">
        <AdminHeader />
        <div className="bg-white border-b border-outline-variant px-4 md:px-6 py-2 md:py-3 flex flex-col gap-1 sticky top-[64px] z-40">
          <nav className="flex items-center gap-1 text-[11px] text-text-sub">
            <button className="md:hidden material-symbols-outlined text-[18px] text-text-sub mr-1" onClick={() => setSidebarOpen(true)}>menu</button>
            <span>관리자</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">질문항목 관리</span>
          </nav>
          <h1 className="text-[20px] font-bold">질문항목 설정</h1>
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">info</span>
              질문항목 변경 방법
            </h4>
            <ol className="text-sm text-text-sub space-y-1.5 list-decimal list-inside">
              <li><span className="font-medium text-on-surface">설정파일 다운로드</span> — 현재 설정을 JSON 파일로 내려받습니다.</li>
              <li><span className="font-medium text-on-surface">신청 항목 수정</span> — 다운로드한 JSON 파일을 텍스트 편집기로 수정합니다.</li>
              <li><span className="font-medium text-on-surface">설정파일 업로드</span> — 수정한 JSON 파일을 업로드합니다.</li>
              <li><span className="font-medium text-on-surface">보기</span> — 업로드한 설정을 화면에서 미리 확인합니다. (아직 저장되지 않음)</li>
              <li><span className="font-medium text-on-surface">저장</span> — 확인한 설정을 시스템에 저장합니다.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                <h3 className="font-bold">설정 파일</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                <button onClick={handleLoadDefault} className="flex-1 md:flex-none px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#F8F9FF]">
                  <span className="material-symbols-outlined text-sm">restore</span>기본 설정
                </button>
                <button onClick={handleDownload} className="flex-1 md:flex-none px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#F8F9FF]">
                  <span className="material-symbols-outlined text-sm">download</span>다운로드
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#F8F9FF]">
                  <span className="material-symbols-outlined text-sm">upload</span>업로드
                </button>
                {pendingConfig && (
                  <button
                    onClick={handlePreview}
                    className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                  >
                    보기
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex-1 md:flex-none px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!pendingConfig && !hasUnsavedChanges}
                  className="flex-1 md:flex-none px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold disabled:opacity-40"
                >
                  취소
                </button>
              </div>
            </div>
            {pendingConfig && (
              <div className="mt-3 text-xs text-primary bg-primary/5 px-3 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm align-text-bottom">hourglass_bottom</span>
                {pendingFileName} — [보기] 버튼을 눌러 미리보기 후 [저장]해야 반영됩니다.
              </div>
            )}
            {!pendingConfig && hasUnsavedChanges && (
              <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm align-text-bottom">warning</span>
                저장되지 않은 변경사항이 있습니다. [저장] 또는 [취소]를 눌러주세요.
              </div>
            )}
            {error && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-red-500 shrink-0 mt-[1px]">error</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">질문 항목 ({questions.length}개)</h3>
              {configVersion && (
                <span className="text-xs text-text-sub">v{configVersion}</span>
              )}
            </div>
            <div className="space-y-4">
              {questions.map((item, i) => (
                <div key={item.question_id || i} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.required ? 'bg-primary-light text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>
                      {item.required ? '필수' : '선택'}
                    </span>
                    <h4 className="font-bold text-sm">{item.question_no}. {item.label}</h4>
                    {item.scored && (
                      <span className="ml-auto text-primary font-bold text-xs">
                        최대 {item.options?.length ? Math.max(...item.options.map(o => o.score)) : item.score || 0} pt
                      </span>
                    )}
                  </div>

                  {item.type === 'text' && (
                    <div className="ml-7">
                      <input
                        type="text"
                        placeholder={item.placeholder || '텍스트 입력'}
                        disabled
                        className="w-full p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {item.type === 'radio' && item.options && (
                    <div className="ml-7 space-y-1.5">
                      {[...item.options].sort((a, b) => b.score - a.score).map(o => (
                        <label key={o.option_id || o.label} className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 cursor-default">
                          <input type="radio" disabled className="accent-primary" />
                          <span className="text-sm text-gray-600">{o.label}</span>
                          <span className="ml-auto text-primary font-bold text-xs">+{o.score}pt</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {item.type === 'date' && (
                    <div className="ml-7">
                      <input
                        type="date"
                        disabled
                        className="w-full p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {item.type === 'textarea' && (
                    <div className="ml-7">
                      <textarea
                        disabled
                        placeholder={item.placeholder || '텍스트 입력'}
                        className="w-full p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
