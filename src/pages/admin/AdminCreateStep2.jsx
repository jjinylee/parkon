import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { pendingUploadFiles } from '../../sharedState';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminCreateStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const formData = location.state?.form;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  useEffect(() => {
    api('/config/questions')
      .then(data => setQuestions(data.questions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildQuestionPayload = () => {
    return questions.map(q => ({
      question_text: q.label,
      input_type: q.type,
      is_required: q.required,
      score: q.scored ? Math.max(...(q.options || []).map(o => o.score), 0) : 0,
      sort_order: q.question_no,
      placeholder: q.placeholder || '',
      options: (q.options || []).map(o => ({
        option_text: o.label,
        score: o.score,
        sort_order: 0,
      })),
    }));
  };

  const uploadFiles = async (templateId) => {
    if (pendingUploadFiles.length === 0) return;
    const formData = new FormData();
    for (const file of pendingUploadFiles) {
      formData.append('files', file);
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/v1/templates/${templateId}/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || '파일 업로드 실패');
    pendingUploadFiles.length = 0;
  };

  const saveAll = async (publish) => {
    if (!formData) { alert('1단계 정보가 없습니다.'); return null; }
    if (questions.length === 0) { alert('등록된 질문이 없습니다.'); return null; }
    setSaving(true);
    try {
      const tmpl = await api('/templates', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      await uploadFiles(tmpl.id);
      await api(`/templates/${tmpl.id}/questions`, {
        method: 'POST',
        body: JSON.stringify(buildQuestionPayload()),
      });
      if (publish) {
        await api(`/templates/${tmpl.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'published' }),
        });
      }
      return tmpl.id;
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const id = await saveAll(false);
    if (id) { alert('저장되었습니다.'); navigate('/admin'); }
  };

  const handlePublish = async () => {
    const id = await saveAll(true);
    if (id) { alert('공개되었습니다.'); navigate('/admin'); }
  };

  const handleBack = () => {
    setShowBackConfirm(true);
  };

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
            <span>신청 개설</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">등록 2단계</span>
          </nav>
          <h1 className="text-[20px] font-bold">신청 항목 확인</h1>
        </div>
        <div className="px-4 md:px-8 pt-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-text-sub">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-surface-container">1</span>
              <span className="text-sm font-bold">기본 설정</span>
            </div>
            <span className="material-symbols-outlined text-text-sub text-sm">arrow_forward</span>
            <div className="flex items-center gap-2 text-primary">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-white">2</span>
              <span className="text-sm font-bold">항목 설정</span>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
              <div>
                <h4 className="font-bold text-sm mb-1">공개 전에는 사용자에게 표시되지 않습니다.</h4>
                <p className="text-sm text-text-sub">
                  <strong>[저장]</strong>만 하면 임시 상태로 저장되며, <strong>[공개]</strong>를 해야 사용자가 신청 화면에서 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">질문 항목 ({questions.length}개)</h3>
              {questions.length > 0 && (
                <span className="text-xs text-text-sub">
                  총 {questions.reduce((sum, q) => sum + (q.scored ? Math.max(...(q.options || []).map(o => o.score), 0) : 0), 0)}점
                </span>
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
                        최대 {Math.max(...(item.options || []).map(o => o.score), 0)} pt
                      </span>
                    )}
                  </div>

                  {item.type === 'text' && (
                    <div className="ml-7">
                      <input
                        type="text"
                        placeholder={item.placeholder || '텍스트 입력'}
                        disabled
                        className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {item.type === 'radio' && item.options && (
                    <div className="ml-7 space-y-1.5">
                      {item.options.map(o => (
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
                        className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {item.type === 'textarea' && (
                    <div className="ml-7">
                      <textarea
                        disabled
                        placeholder={item.placeholder || '텍스트 입력'}
                        className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Consent preview */}
          <div className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-light text-badge-active-text">필수</span>
              <h4 className="font-bold text-sm">입력하신 사실과 불일치하는 경우, 3개월간 주차 이용이 제한될 수 있습니다. 이에 동의하시겠습니까?</h4>
            </div>
            <div className="ml-7 space-y-1.5">
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 cursor-default">
                <input type="radio" disabled className="accent-primary" />
                <span className="text-sm text-gray-600">예(동의)</span>
              </label>
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 cursor-default">
                <input type="radio" disabled className="accent-primary" />
                <span className="text-sm text-gray-600">아니오(미동의)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
            <button onClick={handleBack} className="w-full sm:w-auto px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>이전
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={handleSave} disabled={saving || questions.length === 0} className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={handlePublish} disabled={saving || questions.length === 0} className="flex-1 sm:flex-none px-10 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg disabled:opacity-50">
                {saving ? '저장 중...' : '공개'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showBackConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-2">이전 단계로 이동하시겠습니까?</h3>
            <p className="text-sm text-text-sub mb-6">이전 단계로 이동시 입력한 사항이 저장되지않습니다.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="px-6 py-2.5 rounded-lg border border-outline-variant text-sm font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => navigate('/admin/create')}
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
