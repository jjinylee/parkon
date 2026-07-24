/* 화면 ID: UI_411 | 신청 현황 */
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import MailSendModal from '../../components/admin/MailSendModal';
import { api } from "../../api";
import { getTemplateBadgeClass, getTemplateBadgeLabel } from '../../utils/status';

const BADGE = {
  approved: 'bg-badge-completed-bg text-badge-completed-text',
  submitted: 'bg-badge-pending-bg text-badge-pending-text',
  rejected: 'bg-badge-rejected-bg text-badge-rejected-text',
  draft: 'bg-badge-inactive-bg text-badge-inactive-text',
};

const BADGE_LABEL = {
  approved: '승인',
  submitted: '대기',
  rejected: '반려',
  draft: '작성중',
};

const SORTABLE = ['status', 'name', 'position', 'join_date', 'phone', 'car_number', 'special_reason', 'total_score', 'submitted_at'];

function downloadCSV(rows, filename) {
  const bom = '\uFEFF';
  const header = '이름,전화번호,차량번호,총점,상태,화이트리스트';
  const body = rows.map(r =>
    [r.name, r.phone, r.car_number || '', r.total_score,
     r.status === 'approved' ? '승인' : r.status === 'rejected' ? '반려' : r.status === 'whitelist' ? '화이트리스트' : '대기',
     r.is_whitelisted ? 'Y' : 'N']
    .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

function DetailView({ template, rows, quota, onQuotaChange, onBatchApprove, onApprove, onReject, onBack }) {
  const [sortBy, setSortBy] = useState('total_score');
  const [sortDir, setSortDir] = useState('desc');
  const [showMailModal, setShowMailModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [mailLog, setMailLog] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterField, setFilterField] = useState('name');
  const [filterQuery, setFilterQuery] = useState('');
  const [specialReasonPopup, setSpecialReasonPopup] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const enrichedRows = useMemo(() => (rows || []).map((r, i) => ({
    ...r,
    position: r.position || ['팀원', '팀장', '매니저', '대리', '과장'][i % 5],
    join_date: r.join_date || `${2020 + (i % 4)}-${String((i % 12) + 1).padStart(2, '0')}`,
    special_reason: r.special_reason || (i % 4 === 0 ? '있음' : '없음'),
    special_reason_text: r.special_reason_text || (i % 4 === 0 ? ['장애인 등록', '임산부', '장기 치료', '기타 사유'][Math.floor(i / 4) % 4] : ''),
  })), [rows]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const filtered = enrichedRows.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (!filterQuery) return true;
    const val = (r[filterField] || '').toString().toLowerCase();
    return val.includes(filterQuery.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy];
    if (sortBy === 'total_score') { va = Number(va) || 0; vb = Number(vb) || 0; }
    else if (sortBy === 'submitted_at') { va = va || ''; vb = vb || ''; }
    else { va = (va || '').toString(); vb = (vb || '').toString(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  const approved = sorted.filter(r => r.status === 'approved').length;
  const waiting = sorted.filter(r => r.status === 'submitted').length;
  const whitelisted = sorted.filter(r => r.is_whitelisted).length;

  const selectedRows = sorted.filter(r => selectedIds.has(r.id));
  const selectedStatuses = [...new Set(selectedRows.map(r => r.status))];
  const canApprove = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'submitted' || s === 'rejected');
  const canReject = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'submitted' || s === 'approved');
  const multiActionLabel = canApprove ? '승인' : canReject ? '반려' : null;
  const multiActionColor = canApprove ? 'text-primary border-primary' : canReject ? 'text-red-500 border-red-400' : 'text-text-sub border-outline-variant';

  const handleMultiAction = () => {
    if (!multiActionLabel) return;
    const action = multiActionLabel === '승인' ? 'approve' : 'reject';
    if (action === 'reject' && !window.confirm('선택한 항목을 반려 처리하시겠습니까?')) return;
    selectedRows.forEach(r => {
      if (action === 'approve') onApprove(r.id);
      else onReject(r.id);
    });
    setSelectedIds(new Set());
  };

  const handleFinalize = async () => {
    if (!window.confirm('최종 마감 처리하시겠습니까?\n마감 후에는 사용자에게 승인/반려 결과가 공개됩니다.')) return;
    try {
      await api(`/templates/${template.id}/finalize`, { method: 'PUT' });
      alert('마감 처리되었습니다.');
    } catch (err) { alert(err.message); }
  };

  const handleSearch = () => {}; // trigger re-render by setting state

  const allVisibleSelected = sorted.length > 0 && sorted.every(r => selectedIds.has(r.id));
  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map(r => r.id)));
    }
  };
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-bold text-text-sub hover:bg-gray-50">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          목록
        </button>
        <span className="w-px h-4 bg-outline-variant" />
        <div className="min-w-0">
          <h2 className="font-bold text-sm md:text-base truncate">{template.title}</h2>
          <p className="text-[11px] text-text-sub">{template.start_date} ~ {template.end_date}</p>
        </div>
      </div>

      {/* Search area */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-white/60 p-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="appearance-none bg-white border border-outline-variant rounded-lg px-3 py-1.5 text-xs w-28 cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%23666%22%3E%3Cpath%20d%3D%22M4%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center] pr-7">
          <option value="all">전체 상태</option>
          <option value="approved">승인</option>
          <option value="submitted">대기</option>
          <option value="rejected">반려</option>
        </select>
        <select value={filterField} onChange={e => setFilterField(e.target.value)}
          className="appearance-none bg-white border border-outline-variant rounded-lg px-3 py-1.5 text-xs w-28 cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22%23666%22%3E%3Cpath%20d%3D%22M4%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center] pr-7">
          <option value="name">신청자</option>
          <option value="phone">연락처</option>
          <option value="car_number">차량번호</option>
        </select>
        <input type="text" value={filterQuery} onChange={e => setFilterQuery(e.target.value)}
          placeholder="검색어 입력" className="neumorphic-recessed px-2 py-1.5 text-xs w-40"
          onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold">조회</button>
        <span className="text-[11px] text-text-sub ml-auto">검색 {filtered.length} / 전체 {enrichedRows.length}건</span>
      </div>

      {/* Stats + Batch controls */}
      {sorted.length > 0 ? (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-outline-variant bg-white/60 p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold whitespace-nowrap">배정 대수</span>
              <span className="relative group">
                <span className="material-symbols-outlined text-[14px] text-text-sub cursor-help">help_outline</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded-lg p-2 whitespace-nowrap z-50 shadow-lg">
                  화이트리스트 회원은 배정 인원에서 제외됩니다
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              </span>
              <input type="number" value={quota} onChange={e => onQuotaChange(Number(e.target.value))}
                className="w-16 md:w-20 neumorphic-recessed py-1 px-2 text-center font-bold text-sm" />
              <span className="text-[11px] text-text-sub">(화이트리스트 제외)</span>
            </div>
            <button onClick={onBatchApprove} disabled={waiting === 0}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-40">
              상위 {quota}명 승인
            </button>
            <button onClick={handleMultiAction} disabled={!multiActionLabel}
              className={`border px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-40 ${multiActionColor}`}>
              선택 {multiActionLabel || '...'} ({selectedIds.size})
            </button>
            <div className="relative">
              <button onClick={() => setShowExport(prev => !prev)}
                className="border border-primary text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/5">
                엑셀 다운로드
              </button>
              {showExport && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-outline-variant shadow-lg z-30 py-1 min-w-[180px]">
                  <button onClick={() => { downloadCSV(sorted, `${template.title}_명단.csv`); setShowExport(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">화이트리스트 미포함</button>
                  <button onClick={async () => {
                    try {
                      const wl = await api('/whitelist');
                      const all = [...sorted, ...wl.map(w => ({ name: w.name, phone: w.phone, car_number: w.car_number, total_score: '-', status: 'whitelist', is_whitelisted: true }))];
                      downloadCSV(all, `${template.title}_명단_화이트리스트포함.csv`);
                    } catch {}
                    setShowExport(false);
                  }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">화이트리스트 포함</button>
                </div>
              )}
            </div>
            {(approved > 0 || sorted.length - approved - waiting > 0) && (
              <button onClick={() => setShowMailModal(true)}
                className="border border-primary text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/5">
                메일 발송
              </button>
            )}
            {!template.finalized ? (
              <div className="flex items-center gap-1">
                <button onClick={handleFinalize}
                  className="border border-amber-600 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-50 whitespace-nowrap">
                  마감
                </button>
                <span className="text-[10px] text-text-sub hidden md:inline">마감 이후, 사용자에게 승인/반려 정보가 표시됩니다.</span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-badge-completed-text font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-badge-completed-dot" />
                마감완료
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-badge-completed-text font-bold">승인 {approved}</span>
            <span className="text-text-sub">/</span>
            <span className="text-badge-pending-text font-bold">대기 {waiting}</span>
            <span className="text-text-sub">/</span>
            <span className="text-badge-rejected-text font-bold">반려 {sorted.length - approved - waiting}</span>
            <span className="text-text-sub">/</span>
            <span className="font-bold">총 {sorted.length}명</span>
            {whitelisted > 0 && <><span className="text-text-sub">/</span><span className="text-amber-700 font-bold text-[11px]">화이트 {whitelisted}</span></>}
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-sub">신청 내역이 없습니다.</div>
      )}

      {/* Desktop table */}
      {sorted.length > 0 ? (
        <div className="bento-card overflow-hidden hidden md:block">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-[12px] font-bold text-text-sub">
                <tr className="border-b">
                  <th className="p-3 w-10 text-center"><input type="checkbox" checked={allVisibleSelected} onChange={handleSelectAll} className="cursor-pointer" /></th>
                  <th className="p-3 w-10 text-center">#</th>
                  {SORTABLE.map(col => (
                    <th key={col} onClick={() => handleSort(col)}
                      className="p-3 whitespace-nowrap cursor-pointer select-none hover:text-text transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        {{status: '상태', name: '신청자', position: '직책', join_date: '입사연월', phone: '연락처', car_number: '차량번호', special_reason: '특수사유', total_score: '총점', submitted_at: '제출일'}[col]}
                        {sortBy === col && (
                          <span className="material-symbols-outlined text-[14px]">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="p-3 whitespace-nowrap">메일</th>
                  <th className="p-3 w-24 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sorted.flatMap((r, i) => {
                  const showCutoff = i === quota && sorted.some((_, idx) => idx < quota && sorted[idx].status === 'submitted');
                  const row = (
                    <tr key={r.id}
                      className={`border-b hover:bg-[#F8F9FF] transition-colors ${
                        r.status === 'approved' ? 'bg-green-50/30' : ''
                      } ${
                        i < quota && r.status === 'submitted' ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleToggleSelect(r.id)} className="cursor-pointer" /></td>
                      <td className={`p-3 text-center font-bold text-xs ${
                        i < quota ? r.status === 'approved' ? 'text-badge-completed-text' : r.status === 'submitted' ? 'text-primary' : 'text-text-sub' : 'text-text-sub'
                      }`}>
                        {i + 1}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BADGE[r.status] || BADGE.draft}`}>
                          {BADGE_LABEL[r.status] || BADGE_LABEL.draft}
                        </span>
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap text-sm">
                        {r.name}
                        {r.is_whitelisted ? <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 align-middle">화이트</span> : null}
                      </td>
                      <td className="p-3 text-text-sub whitespace-nowrap text-xs">{r.position}</td>
                      <td className="p-3 text-text-sub whitespace-nowrap text-xs">{r.join_date}</td>
                      <td className="p-3 text-text-sub whitespace-nowrap text-xs">{r.phone}</td>
                      <td className="p-3 text-text-sub whitespace-nowrap text-xs">{r.car_number || '-'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {r.special_reason === '있음' ? (
                          <button onClick={() => setSpecialReasonPopup({ reason: r.special_reason_text })}
                            className="text-[10px] text-red-500 font-bold underline">{r.special_reason}</button>
                        ) : (
                          <span className="text-[10px] text-gray-300">{r.special_reason}</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-primary whitespace-nowrap">{r.total_score}</td>
                      <td className="p-3 text-text-sub whitespace-nowrap text-[11px]">{r.submitted_at ? r.submitted_at.split(' ')[0] : '-'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {mailLog[r.id] ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-badge-completed-text font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-badge-completed-text" />
                            발송
                            <span className="text-text-sub font-normal max-w-[80px] truncate" title={mailLog[r.id].template_title}>{mailLog[r.id].template_title}</span>
                          </span>
                        ) : r.status !== 'submitted' ? (
                          <span className="text-[10px] text-text-sub">미발송</span>
                        ) : null}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {r.status === 'submitted' && (
                          <>
                            <button onClick={() => onApprove(r.id)} className="px-2 py-1 bg-primary text-white rounded text-[10px] font-bold mr-1">승인</button>
                            <button onClick={() => onReject(r.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-bold">반려</button>
                          </>
                        )}
                        {r.status === 'approved' && <span className="text-[10px] text-badge-completed-text font-bold">승인완료</span>}
                        {r.status === 'rejected' && <span className="text-[10px] text-badge-rejected-text font-bold">반려처리</span>}
                      </td>
                    </tr>
                  );
                  return showCutoff
                    ? [<tr key={`cutoff-${i}`}><td colSpan={13} className="p-0"><div className="h-px bg-primary/40 mx-3" /></td></tr>, row]
                    : [row];
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="hidden md:block bento-card px-5 py-8 text-center text-sm text-text-sub">신청 내역이 없습니다.</div>
      )}

      {/* Mobile cards */}
      {sorted.length > 0 ? (
        <div className="block md:hidden space-y-2">
          {sorted.flatMap((r, i) => {
            const showCutoff = i === quota && sorted.some((_, idx) => idx < quota && sorted[idx].status === 'submitted');
            return [
              showCutoff && <div key={`cutoff-m-${i}`} className="h-px bg-primary/40 mx-1" />,
              <div key={r.id} className={`rounded-xl border border-outline-variant p-4 ${r.status === 'approved' ? 'bg-green-50/20' : ''} ${i < quota && r.status === 'submitted' ? 'bg-blue-50/10' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleToggleSelect(r.id)} className="cursor-pointer" />
                      <span className={`text-xs font-bold ${i < quota ? 'text-primary' : 'text-text-sub'}`}>#{i + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BADGE[r.status] || BADGE.draft}`}>
                      {BADGE_LABEL[r.status] || BADGE_LABEL.draft}
                    </span>
                  </div>
                  <span className="font-bold text-primary text-sm">{r.total_score}점</span>
                </div>
                <div className="text-sm font-medium mb-0.5">
                  {r.name}
                  {r.is_whitelisted ? <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 align-middle">화이트</span> : null}
                </div>
                <div className="text-[10px] text-text-sub mb-0.5">직책: {r.position}</div>
                <div className="text-[10px] text-text-sub mb-1">입사: {r.join_date}</div>
                <div className="text-[11px] text-text-sub mb-1">{r.phone}</div>
                <div className="text-[11px] text-text-sub mb-1">{r.car_number || '-'}</div>
                <div className="text-[10px] mb-1">
                  특수사유:{' '}
                  {r.special_reason === '있음' ? (
                    <button onClick={() => setSpecialReasonPopup({ reason: r.special_reason_text })}
                      className="text-red-500 font-bold underline">{r.special_reason}</button>
                  ) : (
                    <span className="text-gray-300">{r.special_reason}</span>
                  )}
                </div>
                <div className="text-[10px] mb-3">
                  {mailLog[r.id] ? (
                    <span className="text-badge-completed-text font-bold">✓ 발송 ({mailLog[r.id].template_title})</span>
                  ) : r.status !== 'submitted' ? (
                    <span className="text-text-sub">미발송</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {r.status === 'submitted' && (
                    <>
                      <button onClick={() => onApprove(r.id)} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold">승인</button>
                      <button onClick={() => onReject(r.id)} className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold">반려</button>
                    </>
                  )}
                  {r.status === 'approved' && <span className="flex-1 py-2 text-center text-xs text-badge-completed-text font-bold bg-green-50 rounded-lg">승인완료</span>}
                  {r.status === 'rejected' && <span className="flex-1 py-2 text-center text-xs text-badge-rejected-text font-bold bg-red-50 rounded-lg">반려처리</span>}
                </div>
              </div>,
            ].filter(Boolean);
          })}
        </div>
      ) : (
        <div className="block md:hidden bento-card px-5 py-8 text-center text-sm text-text-sub">신청 내역이 없습니다.</div>
      )}

      {showMailModal && <MailSendModal rows={sorted} onClose={() => setShowMailModal(false)} onSent={r => {
        const updated = { ...mailLog };
        r.application_ids.forEach(id => { updated[id] = { sent: true, template_title: r.template_title }; });
        setMailLog(updated);
      }} />}

      {specialReasonPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSpecialReasonPopup(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">특수사유</h3>
              <button onClick={() => setSpecialReasonPopup(null)} className="material-symbols-outlined text-text-sub hover:text-text">close</button>
            </div>
            <p className="text-sm">{specialReasonPopup.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStatus() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [applicantsMap, setApplicantsMap] = useState({});
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [quotas, setQuotas] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = location.state?.templateId;
    setSelectedTemplateId(tid || null);
  }, [location.key]);

  const [showTrendPopup, setShowTrendPopup] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null);

  const years = [...new Set(templates.map(t => (t.start_date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  const filteredTemplates = templates.filter(t => (t.start_date || '').startsWith(selectedYear));

  const yearStats = useMemo(() => {
    let total = 0, approved = 0;
    for (const t of filteredTemplates) {
      const rows = applicantsMap[t.id] || [];
      total += rows.length;
      approved += rows.filter(r => r.status === 'approved').length;
    }
    return { total, approved, rate: total > 0 ? Math.round((approved / total) * 100) : 0 };
  }, [filteredTemplates, applicantsMap]);

  const prevYearTemplates = templates.filter(t => (t.start_date || '').startsWith(String(Number(selectedYear) - 1)));
  const prevStats = useMemo(() => {
    let total = 0, approved = 0;
    for (const t of prevYearTemplates) {
      const rows = applicantsMap[t.id] || [];
      total += rows.length;
      approved += rows.filter(r => r.status === 'approved').length;
    }
    return { total, approved, rate: total > 0 ? Math.round((approved / total) * 100) : 0 };
  }, [prevYearTemplates, applicantsMap]);

  const calcDiff = (cur, prev) => {
    if (prev === 0) return null;
    const diff = cur - prev;
    const pct = Math.round((diff / prev) * 100);
    return { diff, pct };
  };

  const monthlyChart = useMemo(() => {
    return filteredTemplates.map(t => {
      const rows = applicantsMap[t.id] || [];
      return {
        month: (t.start_date || '').slice(5, 7) + '월',
        applicants: rows.length,
        approved: rows.filter(r => r.status === 'approved').length,
        rejected: rows.filter(r => r.status === 'rejected').length,
        waiting: rows.filter(r => r.status === 'submitted').length,
      };
    });
  }, [filteredTemplates, applicantsMap]);

  const aggregatedMonths = useMemo(() => {
    const map = {};
    for (const d of monthlyChart) {
      if (!map[d.month]) map[d.month] = { month: d.month, applicants: 0, approved: 0, rejected: 0, waiting: 0 };
      map[d.month].applicants += d.applicants;
      map[d.month].approved += d.approved;
      map[d.month].rejected += d.rejected;
      map[d.month].waiting += d.waiting;
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [monthlyChart]);

  const selectedMonthData = selectedMonthIdx !== null ? aggregatedMonths[selectedMonthIdx] : null;
  const prevMonthData = aggregatedMonths.length > 0 ? aggregatedMonths[aggregatedMonths.length - 1] : null;
  const prevPrevMonthData = aggregatedMonths.length > 1 ? aggregatedMonths[aggregatedMonths.length - 2] : null;

  const momPctFor = (cur, prev) => {
    if (cur === null || cur === undefined || prev === null || prev === undefined || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  useEffect(() => {
    api('/templates').then(async (templates) => {
      const published = templates.filter(t => t.status === 'published');
      setTemplates(templates);

      if (published.length > 0) {
        const results = await Promise.all(
          published.map(t =>
            api(`/applications/admin/list?template_id=${t.id}&sort_by=total_score&sort_order=desc&limit=500`)
              .then(d => ({ id: t.id, items: d.items || [] }))
              .catch(() => ({ id: t.id, items: [] }))
          )
        );
        const map = {};
        results.forEach(r => { map[r.id] = r.items; });
        setApplicantsMap(map);

        const qs = {};
        published.forEach(t => { qs[t.id] = 60; });
        setQuotas(qs);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refreshTemplate = async (id) => {
    const d = await api(`/applications/admin/list?template_id=${id}&sort_by=total_score&sort_order=desc&limit=500`).catch(() => null);
    if (d) setApplicantsMap(prev => ({ ...prev, [id]: d.items || [] }));
  };

  const handleBatchApprove = async (templateId) => {
    const rows = applicantsMap[templateId] || [];
    const sorted = [...rows].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    const waiting = sorted.filter(r => r.status === 'submitted');
    const approved = sorted.filter(r => r.status === 'approved');
    const quota = quotas[templateId] || 60;
    const target = waiting.slice(0, quota - approved.length);
    if (target.length === 0) return;
    if (!window.confirm(`상위 ${quota}명 기준, 대기 ${waiting.length}명 중 ${target.length}명을 승인하고 나머지 ${waiting.length - target.length}명을 반려 처리하시겠습니까?`)) return;
    for (const r of target) {
      try { await api(`/applications/${r.id}/approve`, { method: 'PUT', body: '{}' }); } catch {}
    }
    const rejectTargets = waiting.slice(target.length);
    for (const r of rejectTargets) {
      try { await api(`/applications/${r.id}/reject`, { method: 'PUT', body: JSON.stringify({ reason: '배정 인원 초과' }) }); } catch {}
    }
    refreshTemplate(templateId);
  };

  const handleApprove = async (id, templateId) => {
    const row = applicantsMap[templateId]?.find(r => r.id === id);
    if (row?.is_whitelisted && !window.confirm('화이트리스트 회원입니다. 승인 시 배정 인원에서 제외됩니다.\n계속하시겠습니까?')) return;
    try { await api(`/applications/${id}/approve`, { method: 'PUT', body: '{}' }); } catch {}
    refreshTemplate(templateId);
  };

  const handleReject = async (id, templateId) => {
    const reason = prompt('반려 사유를 입력하세요:');
    if (!reason) return;
    try { await api(`/applications/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }); } catch {}
    refreshTemplate(templateId);
  };

  const selectedTemplate = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null;
  const selectedRows = selectedTemplateId ? (applicantsMap[selectedTemplateId] || []) : [];

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
            <span className="font-medium">신청 승인</span>
          </nav>
          <h1 className="text-[20px] font-bold">신청 승인</h1>
        </div>

        <div className="p-4 md:p-8 space-y-4">
          {loading ? (
            <div className="text-center py-20 text-text-sub">로딩 중...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-text-sub">등록된 신청 개설이 없습니다.</div>
          ) : selectedTemplateId ? (
            <DetailView
              template={selectedTemplate}
              rows={selectedRows}
              quota={quotas[selectedTemplateId] || 60}
              onQuotaChange={val => setQuotas(prev => ({ ...prev, [selectedTemplateId]: val }))}
              onBatchApprove={() => handleBatchApprove(selectedTemplateId)}
              onApprove={(id) => handleApprove(id, selectedTemplateId)}
              onReject={(id) => handleReject(id, selectedTemplateId)}
              onBack={() => setSelectedTemplateId(null)}
            />
          ) : (
            <>
              {/* Year filter + KPIs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                    className="neumorphic-recessed px-3 py-2 text-sm w-full md:w-auto">
                    {years.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(selectedMonthData ? (() => {
                      const prevIdx = selectedMonthIdx > 0 ? selectedMonthIdx - 1 : null;
                      const prevData = prevIdx !== null ? aggregatedMonths[prevIdx] : null;
                      const curRate = selectedMonthData.applicants > 0 ? Math.round((selectedMonthData.approved / selectedMonthData.applicants) * 100) : 0;
                      const prevRate = prevData && prevData.applicants > 0 ? Math.round((prevData.approved / prevData.applicants) * 100) : null;
                      return [
                        { label: `${selectedMonthData.month} 신청자`, yearLabel: `${yearStats.total}명 (${selectedYear}년)`, value: selectedMonthData.applicants, unit: '명', sub: null, momPct: momPctFor(selectedMonthData.applicants, prevData?.applicants) },
                        { label: `${selectedMonthData.month} 승인자`, yearLabel: `${yearStats.approved} 명(${selectedYear}년)`, value: selectedMonthData.approved, unit: '명', sub: null, momPct: momPctFor(selectedMonthData.approved, prevData?.approved) },
                        { label: `${selectedMonthData.month} 승인율`, yearLabel: `${yearStats.rate}%(${selectedYear}년)`, value: curRate, unit: '%', sub: null, momPct: momPctFor(curRate, prevRate) },
                      ];
                    })() : (() => {
                      const prevMonthRate = prevMonthData ? Math.round((prevMonthData.approved / (prevMonthData.applicants || 1)) * 100) : 0;
                      return [
                        { label: '총 신청자', yearLabel: `${yearStats.total}명 (${selectedYear}년)`, value: prevMonthData?.applicants || 0, unit: '명', sub: prevMonthData ? `(${prevMonthData.month})` : '', momPct: momPctFor(prevMonthData?.applicants, prevPrevMonthData?.applicants) },
                        { label: '총 승인자', yearLabel: `${yearStats.approved} 명(${selectedYear}년)`, value: prevMonthData?.approved || 0, unit: '명', sub: prevMonthData ? `(${prevMonthData.month})` : '', momPct: momPctFor(prevMonthData?.approved, prevPrevMonthData?.approved) },
                        { label: '평균 승인율', yearLabel: `${yearStats.rate}%(${selectedYear}년)`, value: prevMonthRate, unit: '%', sub: prevMonthData ? `(${prevMonthData.month})` : '', momPct: momPctFor(prevMonthRate, prevPrevMonthData ? Math.round((prevPrevMonthData.approved / (prevPrevMonthData.applicants || 1)) * 100) : null) },
                      ];
                    })()).map((item, idx) => (
                      <div key={idx} className="rounded-lg bg-white border border-outline-variant p-3 flex flex-col" style={{ minHeight: 110 }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-text-sub">{item.label}</span>
                          <span className="text-[11px] font-bold text-text-sub">{item.yearLabel}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center flex-col">
                          <span className={`text-[30px] font-bold ${item.color || ''}`}>{item.value}{item.unit}</span>
                          {item.sub && <span className="text-[15px] text-text-sub">{item.sub}</span>}
                        </div>
                        {item.momPct !== null && (
                          <div className={`text-center text-[15px] ${item.momPct >= 0 ? 'text-red-500' : 'text-primary'}`}>
                            전월 {item.momPct >= 0 ? '+' : ''}{item.momPct}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {monthlyChart.length > 0 && (
                    <div className="flex-1 rounded-xl bg-white border border-outline-variant p-4 cursor-pointer hover:border-primary/30 transition-all" onClick={() => setShowTrendPopup(true)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-text-sub">월별 신청 추이</span>
                        <span className="material-symbols-outlined text-text-sub text-sm">trending_up</span>
                      </div>
                      <svg viewBox="0 0 200 26" className="w-full" style={{ overflow: 'visible' }}>
                        {(() => {
                          const vals = aggregatedMonths.map(d => d.applicants);
                          const max = Math.max(...vals, 1);
                          const w = 200, h = 26, padL = 4, padR = 4, padT = 2, padB = 10;
                          const innerH = h - padT - padB;
                          const xStep = (w - padL - padR) / (vals.length - 1 || 1);
                          const pts = vals.map((v, i) => `${padL + i * xStep},${padT + (1 - v / max) * innerH}`);
                          const areaPts = pts.join(' ') + ` ${padL + (vals.length - 1) * xStep},${h - padB} ${padL},${h - padB}`;
                          return (
                            <>
                              <polygon points={areaPts} fill="url(#trendGrad)" />
                              <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                                </linearGradient>
                              </defs>
                              <polyline points={pts.join(' ')} fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
                              {aggregatedMonths.map((d, i) => {
                                const cx = padL + i * xStep;
                                const cy = padT + (1 - d.applicants / max) * innerH;
                                const isSelected = selectedMonthIdx === i;
                                return (
                                  <g key={i}>
                                    <circle cx={cx} cy={cy} r="4" fill="transparent" stroke="none"
                                      className="cursor-pointer"
                                      onClick={e => { e.stopPropagation(); setSelectedMonthIdx(prev => prev === i ? null : i); }} />
                                    <circle cx={cx} cy={cy} r={isSelected ? 1.5 : 0.8} fill={isSelected ? '#2563EB' : '#3B82F6'} stroke={isSelected ? '#fff' : 'none'} strokeWidth="0.5" pointerEvents="none" />
                                    <title>신청자수 : {d.applicants}명</title>
                                  </g>
                                );
                              })}
                              {aggregatedMonths.map((d, i) => (
                                <text key={i} x={padL + i * xStep} y={h - 1} textAnchor="middle" fill="#9CA3AF" fontSize="3"
                                  className="cursor-pointer"
                                  onClick={e => { e.stopPropagation(); setSelectedMonthIdx(prev => prev === i ? null : i); }}>{d.month}</text>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Template list */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-16 text-text-sub">{selectedYear}년 신청 개설이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map(t => {
                    const rows = applicantsMap[t.id] || [];
                    const approved = rows.filter(r => r.status === 'approved').length;
                    const waiting = rows.filter(r => r.status === 'submitted').length;
                    const rejected = rows.filter(r => r.status === 'rejected').length;
                    const total = rows.length;

                    return (
                      <button key={t.id} onClick={() => setSelectedTemplateId(t.id)}
                        className="w-full text-left rounded-xl border border-outline-variant bg-white p-4 md:p-5 hover:border-primary/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm md:text-base truncate">{t.title}</h3>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getTemplateBadgeClass(t)}`}>
                                {getTemplateBadgeLabel(t)}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-sub mt-0.5">{t.start_date} ~ {t.end_date}</p>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 text-[11px] md:text-xs shrink-0">
                            <span className="text-badge-completed-text font-bold">승인 {approved}</span>
                            <span className="text-badge-pending-text font-bold">대기 {waiting}</span>
                            {rejected > 0 && <span className="text-badge-rejected-text font-bold">반려 {rejected}</span>}
                            <span className="text-text-sub">총 {total}</span>
                            <span className="material-symbols-outlined text-text-sub text-sm">chevron_right</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Trend popup */}
        {showTrendPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTrendPopup(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
                <h2 className="font-bold text-base">월별 신청 추이</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-sub">{selectedYear}년</span>
                  <button onClick={() => setShowTrendPopup(false)} className="material-symbols-outlined text-text-sub hover:text-text">close</button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 text-[11px] text-text-sub">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary" /> 승인</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> 대기</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-300" /> 반려</span>
                </div>
                <div className="space-y-3">
                  {monthlyChart.map(d => {
                    const maxVal = Math.max(...monthlyChart.map(x => x.applicants), 1);
                    const pct = v => (v / maxVal) * 100;
                    const total = d.applicants;
                    const approved = d.approved;
                    const rejected = d.rejected;
                    const waiting = d.waiting;
                    return (
                      <div key={d.month}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-text-sub w-12">{d.month}</span>
                          <span className="font-bold text-sm">{total}명</span>
                        </div>
                        <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex">
                          {approved > 0 && <div className="h-full bg-primary transition-all" style={{ width: pct(approved) + '%' }} title={`승인 ${approved}`} />}
                          {waiting > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: pct(waiting) + '%' }} title={`대기 ${waiting}`} />}
                          {rejected > 0 && <div className="h-full bg-red-300 transition-all" style={{ width: pct(rejected) + '%' }} title={`반려 ${rejected}`} />}
                          {total === 0 && <div className="h-full bg-gray-200 w-full" />}
                        </div>
                        <div className="flex gap-3 text-[10px] text-text-sub mt-0.5">
                          {approved > 0 && <span>승인 {approved}</span>}
                          {waiting > 0 && <span>대기 {waiting}</span>}
                          {rejected > 0 && <span>반려 {rejected}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {monthlyChart.length === 0 && (
                    <div className="text-center py-10 text-sm text-text-sub">데이터가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
