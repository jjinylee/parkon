import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { pendingUploadFiles } from '../../sharedState';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import RichEditor from '../../components/RichEditor';

function toSaveFormat(questions) {
  return questions.map(q => ({
    question_text: q.question_text,
    input_type: q.input_type,
    is_required: Boolean(q.is_required),
    score: q.score || 0,
    sort_order: q.sort_order || 0,
    placeholder: q.placeholder || '',
    options: (q.options || []).filter(o => o.option_text).map(o => ({
      option_text: o.option_text,
      score: o.score || 0,
      sort_order: o.sort_order || 0,
    })),
  }));
}

export default function AdminCopyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const original = state?.template || {};
  const editMode = state?.edit === true;

  const MAX_FILES = 5;
  const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [originalQuestions, setOriginalQuestions] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [form, setForm] = useState({
    title: editMode ? (original.title || '') : (original.title ? `${original.title} (복사)` : ''),
    start_date: original.start_date || '',
    end_date: original.end_date || '',
    allow_modify: editMode ? Boolean(original.allow_modify) : false,
    description: original.description || (editMode ? '' : '기존 신청 양식을 복사하여 재등록합니다.'),
    attachments: [],
  });

  const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_FILES - form.attachments.length;
    if (remaining <= 0) { alert(`파일은 최대 ${MAX_FILES}개까지 첨부 가능합니다.`); return; }
    const currentTotal = form.attachments.reduce((s, f) => s + f.size, 0);
    const toAdd = files.slice(0, remaining);
    const addSize = toAdd.reduce((s, f) => s + f.size, 0);
    if (currentTotal + addSize > MAX_TOTAL_SIZE) { alert(`전체 파일 크기는 100MB를 초과할 수 없습니다. (현재 ${formatSize(currentTotal)} / 추가 ${formatSize(addSize)})`); return; }
    pendingUploadFiles.length = 0;
    const newFiles = [...form.attachments, ...toAdd.map(f => ({ file: f, name: f.name, size: f.size }))];
    newFiles.forEach(f => { if (f.file) pendingUploadFiles.push(f.file); });
    setForm({ ...form, attachments: newFiles });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index) => {
    const file = form.attachments[index];
    const updated = form.attachments.filter((_, i) => i !== index);
    if (file._existing) {
      setFilesToDelete(prev => new Set([...prev, file.id]));
    } else {
      pendingUploadFiles.length = 0;
      updated.forEach(f => { if (f.file) pendingUploadFiles.push(f.file); });
    }
    setForm({ ...form, attachments: updated });
  };

  useEffect(() => {
    if (original?.id) {
      api(`/templates/${original.id}`).then(data => {
        setOriginalQuestions(data.questions || []);
        if (editMode && data.attachments?.length > 0) {
          setForm(prev => ({
            ...prev,
            attachments: data.attachments.map(a => ({
              id: a.id,
              original_name: a.original_name,
              size: a.size,
              _existing: true,
            })),
          }));
        }
      }).catch(() => {});
    }
  }, [original?.id, editMode]);

  const handleStep1Next = () => {
    if (!form.title.trim()) { alert('신청 제목을 입력해 주세요.'); return; }
    if (!form.start_date || !form.end_date) { alert('참여 기간을 설정해 주세요.'); return; }
    if (form.start_date > form.end_date) { alert('종료일은 시작일보다 빠를 수 없습니다.'); return; }
    setStep(2);
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

  const deleteRemovedFiles = async () => {
    for (const fileId of filesToDelete) {
      await api(`/templates/${original.id}/files/${fileId}`, { method: 'DELETE' });
    }
    setFilesToDelete(new Set());
  };

  const saveOrUpdate = async (publish) => {
    if (originalQuestions.length === 0) { alert('질문이 없습니다.'); return null; }
    setSaving(true);
    try {
      let id;
      if (editMode) {
        id = original.id;
        await deleteRemovedFiles();
        await api(`/templates/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, status: publish ? 'published' : undefined }),
        });
        await uploadFiles(id);
        await api(`/templates/${id}/questions`, {
          method: 'POST',
          body: JSON.stringify(toSaveFormat(originalQuestions)),
        });
      } else {
        const tmpl = await api('/templates', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        id = tmpl.id;
        await uploadFiles(tmpl.id);
        await api(`/templates/${tmpl.id}/questions`, {
          method: 'POST',
          body: JSON.stringify(toSaveFormat(originalQuestions)),
        });
        if (publish) {
          await api(`/templates/${tmpl.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'published' }),
          });
        }
      }
      return id;
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const id = await saveOrUpdate(false);
    if (id) { alert(editMode ? '수정되었습니다.' : '저장되었습니다.'); navigate('/admin'); }
  };

  const handlePublish = async () => {
    const id = await saveOrUpdate(true);
    if (id) { alert('공개되었습니다.'); navigate('/admin'); }
  };

  const handleBack = () => {
    setShowBackConfirm(true);
  };

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
            <span className="font-medium">{editMode ? '수정' : '복사 등록'} {step}단계</span>
          </nav>
          <h1 className="text-[20px] font-bold">{editMode ? '신청 개설 수정' : '신청 개설 복사'}</h1>
        </div>

        <div className="px-4 md:px-8 pt-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-text-sub'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-white' : 'bg-surface-container'}`}>1</span>
              <span className="text-sm font-bold">기본 설정</span>
            </div>
            <span className="material-symbols-outlined text-text-sub text-sm">arrow_forward</span>
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-text-sub'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-white' : 'bg-surface-container'}`}>2</span>
              <span className="text-sm font-bold">항목 설정</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <section className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">
                  신청 제목 <span className="text-red-500">*</span>
                </label>
                <input className="w-full neumorphic-recessed p-3 text-sm" placeholder="예) 2026년 7월 정기 주차 신청"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold">참여 기간 설정 <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input type="date" className="flex-1 neumorphic-recessed p-2 text-sm"
                      value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    <span className="text-text-sub">~</span>
                    <input type="date" className="flex-1 neumorphic-recessed p-2 text-sm"
                      value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">수정 허용 여부</label>
                  <div className="flex gap-4 p-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={form.allow_modify} onChange={() => setForm({ ...form, allow_modify: true })} className="text-primary" /> 허용
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={!form.allow_modify} onChange={() => setForm({ ...form, allow_modify: false })} className="text-primary" /> 미허용
                    </label>
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold mb-3 block">신청 안내 설명</label>
                <RichEditor
                  value={form.description}
                  onChange={v => setForm({ ...form, description: v })}
                  placeholder="안내 내용을 입력해 주세요."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">파일 첨부 (최대 {MAX_FILES}개) <span className="text-blue-500 font-normal"><span className="material-symbols-outlined text-sm align-text-bottom">help</span> 총 업로드 파일 최대 사이즈 : 100MB</span></label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileAttach} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={form.attachments.length >= MAX_FILES}
                    className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold hover:bg-[#F8F9FF] flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    파일 선택
                  </button>
                </div>
                {form.attachments.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.attachments.map((f, i) => (
                        <span key={f._existing ? `e-${f.id}` : `n-${i}`} className="text-sm text-text-sub bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span className="max-w-[200px] truncate" title={f.original_name || f.name}>{f.original_name || f.name}</span>
                          <span className="text-[11px] text-gray-400">({formatSize(f.size)})</span>
                          {f._existing && <span className="text-[10px] text-blue-500">기존</span>}
                          <button onClick={() => handleRemoveAttachment(i)} className="text-red-500 hover:text-red-700 shrink-0">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-blue-500 mt-1.5">총 {formatSize(form.attachments.reduce((s, f) => s + f.size, 0))} / 100.00 MB</p>
                  </div>
                )}
              </div>
            </section>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button onClick={() => navigate('/admin')} className="w-full sm:w-auto px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5">
                취소
              </button>
              <button onClick={handleStep1Next}
                className="w-full sm:w-auto px-10 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm shadow-lg hover:bg-primary-hover flex items-center justify-center gap-1">
                다음 <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
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
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">playlist_add_check</span>
                질문 항목 및 점수 설정 {editMode ? '(수정)' : '(복사됨)'}
              </h3>
              <div className="space-y-4">
                {originalQuestions.length === 0 ? (
                  <div className="text-center py-8 text-text-sub">원본 템플릿의 질문이 없습니다. 저장 또는 공개 버튼을 눌러 진행해 주세요.</div>
                ) : (
                  originalQuestions.map((item, i) => (
                    <div key={i} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_required ? 'bg-primary-light text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>
                          {item.is_required ? '필수' : '선택'}
                        </span>
                        <h4 className="font-bold text-sm">{i + 1}. {item.question_text}</h4>
                        {item.score > 0 && (
                          <span className="ml-auto text-primary font-bold text-xs">최대 {item.score} pt</span>
                        )}
                      </div>

                      {item.input_type === 'text' && (
                        <div className="ml-7">
                          <input type="text" placeholder={item.placeholder || '텍스트 입력'} disabled
                            className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                      )}

                      {item.input_type === 'radio' && item.options && (
                        <div className="ml-7 space-y-1.5">
                          {item.options.map((o, oi) => (
                            <label key={oi} className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 cursor-default">
                              <input type="radio" disabled className="accent-primary" />
                              <span className="text-sm text-gray-600">{o.option_text}</span>
                              {o.score > 0 && <span className="ml-auto text-primary font-bold text-xs">+{o.score}pt</span>}
                            </label>
                          ))}
                        </div>
                      )}

                      {item.input_type === 'date' && (
                        <div className="ml-7">
                          <input type="date" disabled
                            className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                      )}

                      {item.input_type === 'textarea' && (
                        <div className="ml-7">
                          <textarea disabled placeholder={item.placeholder || '텍스트 입력'}
                            className="w-full max-w-md p-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed resize-none" rows={2} />
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                <button onClick={handleSave} disabled={saving || originalQuestions.length === 0} className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg border border-primary-light text-primary font-bold text-sm hover:bg-primary/5 disabled:opacity-50">
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button onClick={handlePublish} disabled={saving || originalQuestions.length === 0} className="flex-1 sm:flex-none px-10 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg disabled:opacity-50">
                  {saving ? '저장 중...' : '공개'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => { setShowBackConfirm(false); setStep(1); }}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
