{/* 화면 ID: UI_421 | 승인 이력 */}
import { useState, useEffect } from 'react';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import { api } from "../../api";


export default function AdminHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/stats/approval?months=6").then(setStats).catch(() => {});
  }, []);

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
            <span>신청 승인</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="font-medium">신청 이력</span>
          </nav>
          <h1 className="text-[20px] font-bold">승인 이력 (통계)</h1>
        </div>
        <div className="p-4 md:p-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-outline-variant bg-white/60 p-6">
              <p className="text-xs font-bold text-text-sub mb-2">총 신청자 (6개월)</p>
              <h3 className="text-2xl font-black">{(stats?.total_applicants || 0).toLocaleString()}명</h3>
              <span className="text-[10px] text-green-600 font-bold">+12.5%</span>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white/60 p-6">
              <p className="text-xs font-bold text-text-sub mb-2">총 승인자 (6개월)</p>
              <h3 className="text-2xl font-black">{(stats?.total_approved || 0).toLocaleString()}명</h3>
              <span className="text-[10px] text-green-600 font-bold">+8.2%</span>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white/60 p-6">
              <p className="text-xs font-bold text-text-sub mb-2">평균 승인율</p>
              <h3 className="text-2xl font-black">{stats?.avg_approval_rate || 0}%</h3>
              <span className="text-[10px] text-red-500 font-bold">-0.5%</span>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-outline-variant bg-white/60 p-8">
            <h4 className="font-bold mb-10 flex items-center gap-1">
              최근 6개월 승인 추이
              <span className="material-symbols-outlined text-text-sub text-base cursor-pointer" title="도움말">help_outline</span>
            </h4>
            <div className="flex items-end justify-between h-48 gap-4 px-10">
              {(() => {
                const monthly = stats?.monthly || [];
                const maxVal = Math.max(...monthly.map(m => m.applicants), 1);
                return monthly.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center gap-1">
                      <div className="w-4 bg-primary rounded-t" style={{ height: `${(r.applicants / maxVal) * 100}%` }}></div>
                      <div className="w-4 bg-blue-200 rounded-t" style={{ height: `${(r.approved / maxVal) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-text-sub">{r.month}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* History Grid */}
          <div className="rounded-xl border border-outline-variant bg-white/60 p-6">
            <h4 className="font-bold mb-4 flex items-center gap-1">
              신청 이력
              <span className="material-symbols-outlined text-text-sub text-base cursor-pointer" title="도움말">help_outline</span>
            </h4>
            <div className="overflow-hidden rounded-lg border border-outline-variant">
              <table className="w-full text-left">
                <thead className="bg-surface-container text-xs font-bold text-text-sub">
                  <tr className="border-b">
                    <th className="p-4">제목</th>
                    <th className="p-4">신청자수</th>
                    <th className="p-4">승인자수</th>
                    <th className="p-4">기간</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(stats?.monthly || []).map((r, i) => (
                    <tr key={i} className="border-b hover:bg-[#F8F9FF]">
                      <td className="p-4 font-medium">{r.month}</td>
                      <td className="p-4">
                        <span className="font-medium">{r.applicants?.toLocaleString() || 0}</span>
                      </td>
                      <td className="p-4 font-medium">{r.approved?.toLocaleString() || 0}</td>
                      <td className="p-4 text-text-sub">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
