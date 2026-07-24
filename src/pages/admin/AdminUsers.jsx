{/* 화면 ID: UI_540 | 사용자 관리 */}
import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

const TABS = ['전체', '승인대기', '승인완료', '차단'];

const STATUS_BADGE = {
  pending: { bg: 'bg-badge-inactive-bg', text: 'text-badge-inactive-text', dot: 'bg-badge-inactive-dot', label: '대기' },
  approved: { bg: 'bg-badge-completed-bg', text: 'text-badge-completed-text', dot: 'bg-badge-completed-dot', label: '승인' },
  blocked: { bg: 'bg-badge-rejected-bg', text: 'text-badge-rejected-text', dot: 'bg-badge-rejected-dot', label: '차단' },
};

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('전체');
  const [selected, setSelected] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');

  const statusMap = { '전체': 'all', '승인대기': 'pending', '승인완료': 'approved', '차단': 'blocked' };

  useEffect(() => {
    api(`/users?status=${statusMap[activeTab]}&search=${searchText}`).then(d => setUsers(d.items || [])).catch(() => {});
  }, [activeTab]);

  const handleSearch = () => {
    api(`/users?status=${statusMap[activeTab]}&search=${searchText}`).then(d => setUsers(d.items || [])).catch(() => {});
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    } catch (err) { alert(err.message); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    selected.size === users.length ? setSelected(new Set()) : setSelected(new Set(users.map(u => u.id)));
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
            <span className="font-medium">사용자 관리</span>
          </nav>
          <h1 className="text-[20px] font-bold">사용자 관리</h1>
        </div>
        <div className="p-4 md:p-8 space-y-6">
          {/* Tab Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-text-sub border border-outline-variant bg-white hover:bg-surface-container'}`}
                >{tab}</button>
              ))}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input className="neumorphic-recessed px-4 py-2 text-sm flex-1 sm:w-64" placeholder="이름 또는 이메일 검색" value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button onClick={handleSearch} className="bg-primary text-white font-bold py-2 px-5 rounded-lg text-sm flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">search</span>조회
              </button>
            </div>
          </div>

          {/* Count + Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-sm">총 <strong className="text-primary">{users.length}</strong>건</span>
            <a href="/api/v1/users/export"
              onClick={e => { e.preventDefault(); window.open('/api/v1/users/export', '_blank'); }}
              className="border border-primary text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/5 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">download</span> 엑셀 다운로드
            </a>
          </div>

          {/* Grid */}
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold">
                <tr className="border-b">
                  <th className="p-4 w-12 text-center"><input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} /></th>
                  <th className="p-4">이름</th>
                  <th className="p-4">이메일</th>
                  <th className="p-4">전화번호</th>
                  <th className="p-4">가입일</th>
                  <th className="p-4">상태</th>
                  <th className="p-4">차단일</th>
                  <th className="p-4">관리</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(u => {
                  const badge = STATUS_BADGE[u.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={u.id} className={`border-b hover:bg-[#F8F9FF] transition-colors ${selected.has(u.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="p-4 text-center"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4 text-text-sub">{u.email}</td>
                      <td className="p-4 text-text-sub">{u.phone}</td>
                      <td className="p-4 text-text-sub">{u.created_at}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1.5 ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>{badge.label}
                        </span>
                      </td>
                      <td className="p-4 text-text-sub">{u.blocked_at || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {u.status === 'pending' && (
                            <>
                              <button onClick={() => handleStatusChange(u.id, 'blocked')} className="text-danger text-xs font-bold hover:underline">차단</button>
                              <button onClick={() => handleStatusChange(u.id, 'approved')} className="text-primary text-xs font-bold hover:underline">승인</button>
                            </>
                          )}
                          {u.status === 'approved' && (
                            <button onClick={() => handleStatusChange(u.id, 'blocked')} className="text-danger text-xs font-bold hover:underline">차단</button>
                          )}
                          {u.status === 'blocked' && (
                            <button onClick={() => handleStatusChange(u.id, 'approved')} className="text-primary text-xs font-bold hover:underline">승인</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
