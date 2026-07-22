import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from '../../api';


const STATUS_LABEL = { active: '사용', inactive: '미사용' };

export default function AdminMail() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api("/mail-templates").then(d => setRows(d)).catch(() => {});
  }, []);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
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
            <span className="font-medium">메일 설정</span>
          </nav>
          <h1 className="text-[20px] font-bold">메일 설정 관리</h1>
        </div>
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <label className="text-sm font-bold shrink-0 whitespace-nowrap">메일 제목</label>
              <input className="neumorphic-recessed w-full sm:w-64 rounded-lg px-4 py-2" placeholder="제목을 입력하세요" />
            </div>
            <button className="bg-primary text-white font-bold py-2 px-5 rounded-lg text-sm flex items-center justify-center gap-1 w-full sm:w-auto">
              <span className="material-symbols-outlined text-sm">search</span>조회
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-sm">총 <strong className="text-primary">{rows.length}</strong>건</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={async () => { if (selected.size === 0) return; if (confirm("선택한 메일 템플릿을 삭제하시겠습니까?")) { for (const id of selected) { await api("/mail-templates/" + id, { method: "DELETE" }); } setSelected(new Set()); api("/mail-templates").then(d => setRows(d)).catch(() => {}); } }} className="flex-1 sm:flex-none px-4 py-2 bg-danger-container text-danger font-bold rounded-lg text-xs">삭제</button>
              <button
                onClick={() => navigate('/admin/mail/create')}
                className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>등록
              </button>
            </div>
          </div>
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold border-b">
                <tr>
                  <th className="p-4 w-12"><input type="checkbox" /></th>
                  <th className="p-4 w-20">번호</th>
                  <th className="p-4">제목</th>
                  <th className="p-4">등록일</th>
                  <th className="p-4 text-center">사용여부</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-[#F8F9FF] group">
                    <td className="p-4"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td className="p-4 text-text-sub">{r.id}</td>
                    <td className="p-4 font-medium group-hover:text-primary cursor-pointer" onClick={() => setDetail(r)}>{r.title}</td>
                    <td className="p-4 text-text-sub">{r.created_at}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${r.status === 'active' ? 'bg-badge-active-bg text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>{STATUS_LABEL[r.status] || r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          {detail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
              <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-outline-variant">
                  <h2 className="font-bold text-lg">{detail.title}</h2>
                  <button onClick={() => setDetail(null)} className="material-symbols-outlined text-text-sub hover:text-text">close</button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-text-sub">
                    <span>등록일: {detail.created_at}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${detail.status === 'active' ? 'bg-badge-active-bg text-badge-active-text' : 'bg-gray-100 text-gray-500'}`}>{STATUS_LABEL[detail.status] || detail.status}</span>
                  </div>
                  <div className="border-t border-outline-variant pt-4">
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detail.content }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
