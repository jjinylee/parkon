{/* 화면 ID: UI_530 | 관리자 관리 + UI_531 관리자 등록 팝업 */}
import { useState, useEffect } from 'react';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from "../../api";



export default function AdminManagers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('admin');

  useEffect(() => {
    api("/admin/managers").then(d => setManagers(d.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (showModal) {
      api("/users?status=approved").then(d => setUsers(d.items || [])).catch(() => {});
    }
  }, [showModal]);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const filteredUsers = users.filter(u =>
    u.name.includes(search) || u.email.includes(search)
  );

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
            <span className="font-medium">관리자 관리</span>
          </nav>
          <h1 className="text-[20px] font-bold">관리자 관리</h1>
        </div>
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-sm">총 <strong className="text-primary">{managers.length}</strong>건</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={async () => { if (selected.size === 0) return; if (confirm("선택한 관리자를 해제하시겠습니까?")) { for (const id of selected) { await api("/admin/managers/" + id, { method: "DELETE" }); } setSelected(new Set()); api("/admin/managers").then(d => setManagers(d.items || [])).catch(() => {}); } }} className="flex-1 sm:flex-none px-4 py-2 bg-danger-container text-danger font-bold rounded-lg text-xs">선택 해제</button>
              <button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">add</span>등록
              </button>
            </div>
          </div>
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold">
                  <tr className="border-b">
                    <th className="p-4 w-12 text-center"><input type="checkbox" /></th>
                    <th className="p-4">이름</th>
                    <th className="p-4">이메일</th>
                    <th className="p-4">권한</th>
                    <th className="p-4">등록일</th>
                    <th className="p-4 w-20 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {managers.map(m => (
                    <tr key={m.id} className="border-b hover:bg-[#F8F9FF]">
                      <td className="p-4 text-center"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                      <td className="p-4 font-medium">{m.name}</td>
                      <td className="p-4 text-text-sub">{m.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${m.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {m.role === 'super_admin' ? '슈퍼관리자' : '일반관리자'}
                        </span>
                      </td>
                      <td className="p-4 text-text-sub">{m.created_at}</td>
                      <td className="p-4 text-center">
                        <button onClick={async () => { if(confirm("해제하시겠습니까?")) { await api("/admin/managers/" + m.user_id, { method: "DELETE" }); setManagers(prev => prev.filter(x => x.id !== m.id)); } }} className="px-2 py-1 bg-danger-container text-danger rounded text-xs font-bold">해제</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </main>

      {/* UI_531: 관리자 등록 팝업 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">관리자 등록</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 border-b flex items-center gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} className="neumorphic-recessed flex-1 px-4 py-2 text-sm" placeholder="이름 검색" />
              <button className="bg-primary text-white font-bold py-2 px-5 rounded-lg text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">search</span>조회
              </button>
            </div>
            <div className="p-4 border-b flex items-center gap-3">
              <span className="text-sm font-bold text-text-main">권한:</span>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="role" value="admin" checked={selectedRole === 'admin'} onChange={() => setSelectedRole('admin')} />
                일반관리자
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="role" value="super_admin" checked={selectedRole === 'super_admin'} onChange={() => setSelectedRole('super_admin')} />
                슈퍼관리자
              </label>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead className="bg-surface-container text-xs font-bold">
                  <tr className="border-b">
                    <th className="p-4">이름</th>
                    <th className="p-4">이메일</th>
                    <th className="p-4 w-24 text-center">선택</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-[#F8F9FF]">
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4 text-text-sub">{u.email}</td>
                      <td className="p-4 text-center">
                        <button onClick={async () => { await api("/admin/managers", { method: "POST", body: JSON.stringify({user_id: u.id, role: selectedRole}) }); setShowModal(false); location.reload(); }} className="px-3 py-1 bg-primary text-white rounded text-xs font-bold">선택</button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-text-sub text-sm">검색 결과가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
