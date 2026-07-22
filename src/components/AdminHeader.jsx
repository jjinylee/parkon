import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AdminHeader() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  return (
    <header className="h-16 glass-effect border-b border-outline-variant/30 flex items-center fixed top-0 left-0 w-full z-[100]">
      <div className="w-[120px] md:w-[200px] min-w-[120px] md:min-w-[200px] h-full flex items-center justify-center shrink-0">
        <Link to="/admin" className="flex items-center text-[20px] tracking-tight shrink-0">
          <span className="font-bold text-[#171C1F] hidden sm:inline">주차</span>
          <span className="font-extrabold text-secondary">ON</span>
          <span className="ml-2 text-xs font-medium text-[#1D4ED8] bg-primary-light px-2 py-0.5 rounded">
            ADMIN
          </span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-end px-2 md:px-6 gap-2 md:gap-3 min-w-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-primary bg-background border border-primary-light rounded-lg hover:bg-primary/5 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">open_in_new</span>
          <span className="whitespace-nowrap">사용자 화면으로</span>
        </button>
        <div className="w-[1px] h-5 bg-outline-variant shrink-0"></div>
        <span className="text-sm font-medium text-on-surface whitespace-nowrap shrink-0">{authUser?.name || '관리자'}</span>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-text-sub hover:text-primary transition-colors shrink-0">
          <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
          <span className="whitespace-nowrap">로그아웃</span>
        </button>
      </div>
    </header>
  );
}
