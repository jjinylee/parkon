{/* 화면 ID: UI_531 | 메일 설정 등록 */}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminMailCreate() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { alert('메일 제목을 입력해 주세요.'); return; }
    if (!form.content.trim()) { alert('메일 내용을 입력해 주세요.'); return; }
    setSaving(true);
    try {
      await api('/mail-templates', {
        method: 'POST',
        body: JSON.stringify({ title: form.title, content: form.content }),
      });
      alert('등록되었습니다.');
      navigate('/admin/mail');
    } catch (err) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
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
            <span>설정 관리</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>메일 설정</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">등록</span>
          </nav>
          <h1 className="text-[20px] font-bold">메일 설정 등록</h1>
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
          <div className="bento-card p-4 md:p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-bold">메일 제목 <span className="text-red-500">*</span></label>
              <input
                className="w-full neumorphic-recessed border-none rounded-lg p-4"
                placeholder="발송될 메일의 제목을 입력해 주세요."
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">메일 내용 <span className="text-red-500">*</span></label>
              <div className="border rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 p-3 border-b flex gap-3">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                  <span className="material-symbols-outlined text-[18px]">format_italic</span>
                  <span className="material-symbols-outlined text-[18px]">image</span>
                </div>
                <textarea
                  className="p-6 min-h-[300px] w-full border-none outline-none resize-none text-sm"
                  placeholder="내용을 입력해 주세요. 치환 코드 {'{userName}'} 등을 사용할 수 있습니다."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/admin/mail')}
              className="w-full sm:w-auto px-10 py-3 border rounded-lg font-bold"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-12 py-3 bg-primary text-white rounded-lg font-bold shadow-lg disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
