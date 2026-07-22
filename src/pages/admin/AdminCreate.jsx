import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pendingUploadFiles } from '../../sharedState';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import RichEditor from '../../components/RichEditor';

export default function AdminCreate() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const MAX_FILES = 5;
  const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    allow_modify: false,
    description: '',
    attachments: [],
  });
  const fileInputRef = useRef(null);

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
    const updated = form.attachments.filter((_, i) => i !== index);
    pendingUploadFiles.length = 0;
    updated.forEach(f => { if (f.file) pendingUploadFiles.push(f.file); });
    setForm({ ...form, attachments: updated });
  };

  const handleNext = () => {
    if (!form.title.trim()) { alert('신청 제목을 입력해 주세요.'); return; }
    if (!form.start_date || !form.end_date) { alert('참여 기간을 설정해 주세요.'); return; }
    if (form.start_date > form.end_date) { alert('종료일은 시작일보다 빠를 수 없습니다.'); return; }
    navigate('/admin/create/step2', { state: { form } });
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
            <span className="font-medium">등록 1단계</span>
          </nav>
          <h1 className="text-[20px] font-bold">신청 개설 등록</h1>
        </div>
        <div className="px-4 md:px-8 pt-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-white">1</span>
              <span className="text-sm font-bold">기본 설정</span>
            </div>
            <span className="material-symbols-outlined text-text-sub text-sm">arrow_forward</span>
            <div className="flex items-center gap-2 text-text-sub">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-surface-container">2</span>
              <span className="text-sm font-bold">항목 설정</span>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <section className="rounded-xl border border-outline-variant bg-white/60 p-4 md:p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">
                신청 제목 <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full neumorphic-recessed p-3 text-sm"
                placeholder="예) 2026년 7월 정기 주차 신청"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold">
                  참여 기간 설정 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 neumorphic-recessed p-2 text-sm"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                  />
                  <span className="text-text-sub">~</span>
                  <input
                    type="date"
                    className="flex-1 neumorphic-recessed p-2 text-sm"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                  />
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
                      <span key={i} className="text-sm text-text-sub bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">description</span>
                        <span className="max-w-[200px] truncate" title={f.name}>{f.name}</span>
                        <span className="text-[11px] text-gray-400">({formatSize(f.size)})</span>
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
            <button onClick={handleNext} className="w-full sm:w-auto px-10 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm shadow-lg hover:bg-primary-hover flex items-center justify-center gap-1">
              다음 <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
