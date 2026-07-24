import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function MenuNav({ path, onLinkClick }) {
  const { isSuperAdmin } = useAuth();
  const menu = [
    {
      title: '신청 관리',
      items: [
        { icon: 'add_box', label: '신청 개설', to: '/admin' },
        { icon: 'pending_actions', label: '신청 승인', to: '/admin/status' },
      ],
    },
    {
      title: '설정 관리',
      items: [
        { icon: 'verified_user', label: '화이트리스트', to: '/admin/whitelist' },
        { icon: 'people', label: '사용자 관리', to: '/admin/users' },
        { icon: 'mail', label: '메일 설정', to: '/admin/mail' },
        { icon: 'playlist_add_check', label: '질문항목 관리', to: '/admin/questions' },
      ],
    },
    {
      title: '시스템 보안/관리',
      items: [
        { icon: 'admin_panel_settings', label: '관리자 관리', to: '/admin/managers' },
        ...(isSuperAdmin ? [{ icon: 'settings', label: 'SMTP 설정', to: '/admin/smtp' }] : []),
        ...(isSuperAdmin ? [{ icon: 'visibility', label: '개인정보 로그', to: '/admin/audit' }] : []),
      ],
    },
  ];

  return (
    <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
      {menu.map((group) => (
        <div key={group.title}>
          <h3 className="px-4 py-2 text-[11px] font-medium text-[#727785] tracking-wider">
            {group.title}
          </h3>
          <div className="mt-1 space-y-1">
            {group.items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={onLinkClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[13px] ${
                  path === item.to
                    ? 'text-primary font-medium bg-primary-light border-l-2 border-primary'
                    : 'text-text-sub hover:bg-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminSidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-white z-[110] flex flex-col md:hidden">
          <div className="flex items-center justify-between px-4 h-16 border-b border-outline-variant/30 shrink-0">
            <Link to="/admin" className="flex items-center text-[20px] tracking-tight">
              <span className="font-bold text-[#171C1F]">주차</span>
              <span className="font-extrabold text-secondary">ON</span>
              <span className="ml-2 text-xs font-medium text-[#1D4ED8] bg-primary-light px-2 py-0.5 rounded">ADMIN</span>
            </Link>
            <button onClick={onToggle} className="material-symbols-outlined text-2xl">close</button>
          </div>
          <MenuNav path={path} onLinkClick={onToggle} />
        </div>
      )}
      <aside className="hidden md:flex w-[200px] bg-surface-container-low/50 border-r border-outline-variant/30 flex-col fixed left-0 top-[64px] h-[calc(100vh-64px)] z-50">
        <MenuNav path={path} />
      </aside>
    </>
  );
}
