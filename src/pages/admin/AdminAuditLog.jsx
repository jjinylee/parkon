import { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';

const actionLabels = {
  VIEW_USER_LIST: '사용자 목록 조회',
  UPDATE_USER_STATUS: '사용자 상태 변경',
  VIEW_APPLICATION_LIST: '신청 현황 조회',
  VIEW_APPLICATION_DETAIL: '신청 상세 조회',
};

export default function AdminAuditLog() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 30;

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    try {
      const d = await api(`/admin/audit?page=${page}&limit=${limit}`);
      setLogs(d.items || []);
      setTotal(d.total || 0);
    } catch { setLogs([]); }
  };

  const totalPages = Math.ceil(total / limit);

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
            <span className="font-medium">개인정보 열람 로그</span>
          </nav>
          <h1 className="text-[20px] font-bold">개인정보 열람 로그</h1>
        </div>
        <div className="p-4 md:p-8 space-y-6">
          <span className="text-sm">총 <strong className="text-primary">{total}</strong>건</span>
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-surface-container text-xs font-bold">
                  <tr className="border-b">
                    <th className="p-4">시간</th>
                    <th className="p-4">관리자</th>
                    <th className="p-4">작업</th>
                    <th className="p-4">대상</th>
                    <th className="p-4">상세</th>
                    <th className="p-4">IP</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.map(log => (
                    <tr key={log.id} className="border-b hover:bg-[#F8F9FF]">
                      <td className="p-4 text-text-sub whitespace-nowrap">{log.created_at}</td>
                      <td className="p-4 font-medium">{log.admin_name} ({log.admin_id})</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="p-4 text-text-sub">{log.target_type}{log.target_id ? ` #${log.target_id}` : ''}</td>
                      <td className="p-4 text-text-sub max-w-[200px] truncate">{log.detail || '-'}</td>
                      <td className="p-4 text-text-sub text-xs">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-text-sub text-sm">로그가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30">이전</button>
              <span className="text-sm text-text-sub">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-30">다음</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
