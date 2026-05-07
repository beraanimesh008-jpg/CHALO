import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, limit, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { UserProfile, Ride, UserRole } from '../types';
import { useAuth } from '../lib/AuthContext';
import { Users, TrendingUp, History, Shield, MoreVertical, Search, Filter, ClipboardList } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

export default function AdminPanel() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== UserRole.ADMIN) return;

    const usersQuery = query(collection(db, 'users'), limit(50));
    const ridesQuery = query(collection(db, 'rides'), limit(50));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubRides = onSnapshot(ridesQuery, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubRides();
    };
  }, [profile]);

  if (profile?.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center">Unauthorized. Admins only.</div>;
  }

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Network Users', value: users.length, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Active Rides', value: rides.length, icon: ClipboardList, color: 'text-accent-500', bg: 'bg-accent-50' },
          { label: 'Gross Revenue', value: '₹45,210', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] card-shadow border border-slate-100 flex items-center gap-6 group hover:-translate-y-1 transition-all">
            <div className={cn("p-5 rounded-3xl transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-8 h-8", stat.color)} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* User List */}
        <div className="bg-white rounded-[2.5rem] card-shadow border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
              <Users className="w-6 h-6 text-brand-600" />
              Community <span className="text-slate-400 font-medium">Directory</span>
            </h3>
            <div className="flex gap-2">
              <button className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl text-slate-400 hover:text-brand-600 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Live</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover" />
                        <div className="text-sm font-bold text-slate-900">{user.displayName}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                        user.role === UserRole.ADMIN ? "bg-slate-900 text-white" :
                        user.role === UserRole.DRIVER ? "bg-accent-50 text-accent-700 border border-accent-100" :
                        "bg-brand-50 text-brand-700 border border-brand-100"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full mx-auto ring-4",
                        user.isOnline ? "bg-emerald-500 ring-emerald-500/20 animate-pulse" : "bg-slate-200 ring-transparent"
                      )} />
                    </td>
                    <td className="p-6 text-right">
                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-600 transition-colors px-4 py-2 rounded-lg bg-slate-50 group-hover:bg-white border border-transparent group-hover:border-slate-100 group-hover:shadow-sm">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[2.5rem] card-shadow border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
              <History className="w-6 h-6 text-accent-500" />
              Live <span className="text-slate-400 font-medium">Activity</span>
            </h3>
            <button className="p-2.5 bg-white border border-slate-100 shadow-sm rounded-xl text-slate-400 hover:text-brand-600 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {rides.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No Recent Activity</div>
            ) : rides.map((ride) => (
              <div key={ride.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-brand-50 transition-colors">
                    <ClipboardList className="w-6 h-6 text-slate-400 group-hover:text-brand-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                      {ride.pickup.address} → {ride.drop.address}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                      <span className="text-brand-600 font-black">{ride.userName}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      {ride.status}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(ride.userOfferedFare)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
