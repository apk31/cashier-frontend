import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut, 
  Wifi, 
  WifiOff,
  Sun,
  Moon
} from 'lucide-react';
import styles from './AppLayout.module.css';
import { useThemeStore } from '../../store/themeStore';
import { useI18nStore } from '../../store/i18nStore';
import { useAuthStore } from '../../store/authStore';
import NotificationDropdown from './NotificationDropdown';

export default function AppLayout() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { theme, toggleTheme } = useThemeStore();
  const { lang, toggleLang, t } = useI18nStore();
  const { user, clearAuth } = useAuthStore();
  const currentUser = user ?? { name: 'User', role: 'CASHIER' as const };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { name: t('nav.pos'), path: '/', icon: ShoppingCart },
    { name: t('nav.inventory'), path: '/inventory', icon: Package, minRole: 'MANAGER' },
    { name: t('nav.reports'), path: '/reports', icon: BarChart3, minRole: 'MANAGER' },
    { name: t('nav.settings'), path: '/settings', icon: Settings, minRole: 'ADMIN' },
  ];

  const canAccess = (minRole?: string) => {
    if (!minRole) return true;
    const order = ['CASHIER', 'MANAGER', 'ADMIN'];
    return order.indexOf(currentUser.role) >= order.indexOf(minRole);
  };

  return (
    <div className={styles.layout}>
      
      {/* ─── SIDEBAR ────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          CASHIER PRO
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            if (!canAccess(item.minRole)) return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────── */}
      <main className={styles.main}>
        
        {/* HEADER */}
        <header className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              Penguin Walk POS
            </h2>
          </div>

          <div className={styles.headerActions}>
            
            <NotificationDropdown />
            
            {/* Language Toggle */}
            <button 
              onClick={toggleLang} 
              className={styles.themeBtn}
              title="Toggle Language"
            >
              <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{lang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className={styles.themeBtn}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Network Status Badge */}
            <div className={`${styles.networkBadge} ${isOnline ? styles.networkOnline : styles.networkOffline}`}>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isOnline ? t('sys.online') : t('sys.offline')}
            </div>

            {/* User Profile */}
            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{currentUser.name}</span>
                <span className={styles.userRole}>{currentUser.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <div className={styles.content}>
          <Outlet />
        </div>

      </main>
    </div>
  );
}