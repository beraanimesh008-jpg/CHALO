import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Award, Settings, Shield, ChevronRight, LogOut, Camera, ClipboardList, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [model, setModel] = useState(profile?.bikeDetails?.model || '');
  const [number, setNumber] = useState(profile?.bikeDetails?.number || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateRole = async (role: UserRole) => {
    if (!profile) return;
    
    if (role === UserRole.DRIVER && !profile.driverOnboardingComplete) {
      navigate('/driver-onboarding');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), { role });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleSaveVehicleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        bikeDetails: { model, number }
      });
    } catch (error) {
      console.error('Error saving vehicle details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      {/* Profile Card */}
      <div className="bg-white rounded-[2.5rem] p-10 card-shadow border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-48 h-48 bg-brand-50 rounded-full -ml-24 -mt-24 opacity-50 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent-50 rounded-full -mr-16 -mb-16 opacity-50 group-hover:scale-110 transition-transform duration-700" />
        
        <div className="relative mb-6 z-10">
          <div className="w-32 h-32 rounded-[2rem] overflow-hidden ring-8 ring-slate-50 shadow-2xl relative group/avatar">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
              alt="Profile" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" 
            />
            <button className="absolute inset-0 bg-brand-600/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all cursor-pointer">
              <Camera className="w-8 h-8 text-white" />
            </button>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl border-4 border-white shadow-lg">
            <Shield className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="z-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{profile.displayName}</h2>
          <p className="text-slate-400 font-medium flex items-center gap-2 justify-center mb-10">
            <Mail className="w-4 h-4" />
            {profile.email}
          </p>
        </div>
        
        <div className="flex gap-4 w-full z-10">
          <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100 group/stat hover:bg-white hover:shadow-xl transition-all">
            <div className="text-3xl font-black text-slate-900 mb-1 group-hover:text-brand-600 transition-colors uppercase">{profile.totalRides || 0}</div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total Trips</div>
          </div>
           <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100 group/stat hover:bg-white hover:shadow-xl transition-all">
            <div className="text-3xl font-black text-slate-900 mb-1 group-hover:text-accent-500 transition-colors uppercase">₹0</div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Earnings</div>
          </div>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="bg-white rounded-[2.5rem] p-8 card-shadow border border-slate-100">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 ml-2">
          <Settings className="w-4 h-4 text-brand-600" />
          Service Preferences
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleUpdateRole(UserRole.USER)}
            className={cn(
              "p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden",
              profile.role === UserRole.USER 
                ? "bg-brand-600 border-brand-600 shadow-xl shadow-brand-600/30 ring-8 ring-brand-50" 
                : "bg-slate-50 border-transparent hover:border-slate-200"
            )}
          >
            <div className={cn(
              "mb-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              profile.role === UserRole.USER ? "bg-white/20 text-white" : "bg-white text-slate-400 group-hover:text-brand-600 shadow-sm"
            )}>
              <User className={cn("w-6 h-6", profile.role === UserRole.USER ? "scale-110" : "")} />
            </div>
            <div className={cn(
              "text-left",
              profile.role === UserRole.USER ? "text-white" : "text-slate-900"
            )}>
              <span className="block font-black text-lg leading-tight uppercase tracking-tight">Rider</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", profile.role === UserRole.USER ? "text-brand-100" : "text-slate-400")}>Book journeys</span>
            </div>
          </button>

          <button 
            onClick={() => handleUpdateRole(UserRole.DRIVER)}
            className={cn(
              "p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden",
              profile.role === UserRole.DRIVER 
                ? "bg-accent-500 border-accent-500 shadow-xl shadow-accent-500/30 ring-8 ring-accent-50" 
                : "bg-slate-50 border-transparent hover:border-slate-200"
            )}
          >
            <div className={cn(
              "mb-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              profile.role === UserRole.DRIVER ? "bg-white/20 text-white" : "bg-white text-slate-400 group-hover:text-accent-500 shadow-sm"
            )}>
              <ClipboardList className={cn("w-6 h-6", profile.role === UserRole.DRIVER ? "scale-110" : "")} />
            </div>
            <div className={cn(
              "text-left",
              profile.role === UserRole.DRIVER ? "text-white" : "text-slate-900"
            )}>
              <span className="block font-black text-lg leading-tight uppercase tracking-tight">Driver</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", profile.role === UserRole.DRIVER ? "text-accent-50" : "text-slate-400")}>Accept requests</span>
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {profile.role === UserRole.DRIVER && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[2.5rem] p-8 card-shadow border border-slate-100 h-full">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 ml-2">
                <ClipboardList className="w-4 h-4 text-accent-500" />
                Vehicle & ID Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {profile.vehiclePhoto && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-[0.2em]">Vehicle Photo</label>
                    <div className="p-1 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden aspect-video relative group/vehicle">
                      <img src={profile.vehiclePhoto} className="w-full h-full object-cover rounded-[1.8rem]" alt="Vehicle" />
                    </div>
                  </div>
                )}

                {profile.aadhaarPhoto && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-[0.2em]">Aadhaar Card</label>
                    <div className="p-1 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden aspect-video relative group/aadhaar">
                      <img src={profile.aadhaarPhoto} className="w-full h-full object-cover rounded-[1.8rem]" alt="Aadhaar" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Account Number</div>
                  <div className="text-lg font-black text-slate-900 leading-tight">{profile.accountNumber || 'Not set'}</div>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">IFSC Code</div>
                  <div className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{profile.ifscCode || 'Not set'}</div>
                </div>
              </div>

              <form onSubmit={handleSaveVehicleDetails} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-[0.2em]">Vehicle Model / Color</label>
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-accent-200 focus-within:ring-8 focus-within:ring-accent-500/5 transition-all">
                    <ClipboardList className="w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="e.g. Sedan - Black"
                      className="w-full bg-transparent outline-none text-base font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-[0.2em]">License Plate Number</label>
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-accent-200 focus-within:ring-8 focus-within:ring-accent-500/5 transition-all">
                    <Shield className="w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="e.g. WB 00 AA 0000"
                      className="w-full bg-transparent outline-none text-base font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium uppercase tracking-widest"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 shadow-xl hover:shadow-brand-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Updating Fleet...' : 'Save Vehicle Profile'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout */}
      <button 
        onClick={() => signOut()}
        className="w-full p-6 bg-slate-50 text-slate-400 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 transition-all mb-10 group"
      >
        <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        Sign Out Securely
      </button>
    </div>
  );
}
