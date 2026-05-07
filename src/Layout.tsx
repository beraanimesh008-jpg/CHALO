import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { UserRole } from './types';
import { Home, ClipboardList, User, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from './lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: Home, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { label: 'Tasks', path: '/dashboard', icon: ClipboardList, roles: [UserRole.DRIVER] },
    { label: 'Admin', path: '/admin', icon: ShieldCheck, roles: [UserRole.ADMIN] },
    { label: 'Profile', path: '/profile', icon: User, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="glass sticky top-0 z-50 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-bold text-3xl tracking-tighter text-slate-900 group italic">
            <div className="bg-brand-600 p-2 rounded-xl shadow-lg shadow-brand-500/20 group-hover:rotate-6 transition-transform relative">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="text-white text-xs font-black not-italic">CL</span>
              </div>
              <div className="absolute -top-1 -right-1 bg-accent-500 w-3 h-3 rounded-sm flex items-center justify-center">
                <span className="text-[5px] font-bold text-white">AI</span>
              </div>
            </div>
            <span className="bg-gradient-to-r from-brand-600 to-brand-900 bg-clip-text text-transparent">Cha<span className="text-brand-600">Lo</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95",
                  location.pathname === item.path 
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30" 
                    : "text-slate-600 hover:bg-white hover:text-brand-600 shadow-sm hover:shadow-md"
                )}
              >
                {item.label}
              </Link>
            ))}
            {profile && (
               <button 
                onClick={() => signOut()}
                className="p-2.5 text-slate-400 hover:text-red-500 transition-colors ml-2 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </nav>

          {/* Mobile Profile Icon */}
          <div className="md:hidden">
             {profile && (
               <Link to="/profile">
                 <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} alt="Profile" className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover" />
               </Link>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden glass border-t border-white/40 flex items-center justify-around h-20 sticky bottom-0 z-50 px-4 pb-4 pt-2">
        {filteredNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 px-6 py-2 rounded-2xl transition-all",
              location.pathname === item.path 
                ? "text-brand-600 bg-brand-50" 
                : "text-slate-400"
            )}
          >
            <item.icon className={cn("w-6 h-6", location.pathname === item.path ? "scale-110" : "")} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
