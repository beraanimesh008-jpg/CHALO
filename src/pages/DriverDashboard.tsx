import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { Ride, RideStatus, UserRole } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, MapPin, IndianRupee, Bell, Power, TrendingUp, History, Star, ChevronRight, ClipboardList, Loader2, Phone, Bike } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'earnings'>('available');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Sync isOnline with profile
  useEffect(() => {
    if (profile?.isOnline !== undefined) {
      setIsOnline(profile.isOnline);
    }
  }, [profile?.isOnline]);

  useEffect(() => {
    if (!profile || profile.role !== UserRole.DRIVER) return;

    // Listen for accepted rides assigned to this driver
    const activeQuery = query(
      collection(db, 'rides'), 
      where('driverId', '==', profile.uid),
      where('status', 'in', [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS])
    );

    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      if (!snapshot.empty) {
        const rideData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride;
        setActiveRide(rideData);
      } else {
        setActiveRide(null);
      }
    });

    return () => unsubscribeActive();
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== UserRole.DRIVER) return;

    if (!isOnline) {
      setRides([]);
      return;
    }

    const q = query(collection(db, 'rides'), where('status', '==', RideStatus.SEARCHING));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
      setRides(ridesData);
    }, (error) => {
      console.error("Rides snapshot error:", error);
    });

    return () => unsubscribe();
  }, [profile, isOnline]);

  const toggleOnline = async () => {
    if (!profile) return;
    const newStatus = !isOnline;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        isOnline: newStatus
      });
      // The local setIsOnline will be updated by the useEffect syncing with profile
    } catch (error) {
      console.error('Error toggling online status:', error);
      alert('Failed to update online status. Please try again.');
    }
  };

  const handleMakeOffer = async (ride: Ride) => {
    if (!profile) return;
    setLoadingAction(ride.id);
    
    const offeredFare = ride.userOfferedFare; 

    try {
      // 1. Try "Quick Accept" first (direct acceptance)
      await updateDoc(doc(db, 'rides', ride.id), {
        status: RideStatus.ACCEPTED,
        driverId: profile.uid,
        driverName: profile.displayName || 'Driver',
        driverPhoto: profile.photoURL || '',
        driverRating: profile.rating || 5,
        driverPhone: profile.phoneNumber || '',
        bikeDetails: profile.bikeDetails || { model: 'Bike', number: 'N/A' },
        acceptedFare: offeredFare,
        updatedAt: Date.now()
      });
      alert('Ride Accepted! Moving to Active Journey.');
    } catch (error: any) {
      console.log('Direct accept failed (likely permissions or taken), trying to send offer:', error);
      
      try {
        // 2. Fallback to sending an offer (Interest)
        const offerData = {
          driverId: profile.uid,
          driverName: profile.displayName || 'Driver',
          driverPhoto: profile.photoURL || '',
          driverRating: profile.rating || 5,
          driverPhone: profile.phoneNumber || '',
          driverLocation: { lat: 21.85, lng: 88.37 }, 
          offeredFare: offeredFare,
          bikeDetails: profile.bikeDetails || { model: 'Bike', number: 'N/A' },
          timestamp: Date.now()
        };

        await setDoc(doc(db, 'rides', ride.id, 'offers', profile.uid), offerData);
        alert('Interest sent! Waiting for rider to accept or call.');
      } catch (innerError: any) {
        console.error('Error making offer:', innerError);
        alert(`This ride is no longer available.`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateRideStatus = async (rideId: string, status: RideStatus) => {
    setLoadingAction(rideId);
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    // window.confirm can be blocked in some iFrame environments, removing for testing
    setLoadingAction(rideId);
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status: RideStatus.SEARCHING,
        driverId: deleteField(),
        driverName: deleteField(),
        driverPhoto: deleteField(),
        driverRating: deleteField(),
        driverPhone: deleteField(),
        bikeDetails: deleteField(),
        acceptedFare: deleteField(),
        updatedAt: Date.now()
      });
      alert('Ride cancelled and returned to the pool.');
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      alert('Failed to cancel ride: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingAction(null);
    }
  };

  const openInGoogleMaps = (lat: number, lng: number, label: string) => {
    // This format is highly compatible across mobile devices and opens directly to coordinates
    const url = `https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(label)}`;
    window.open(url, '_blank');
  };

  if (profile?.role !== UserRole.DRIVER) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Driver <span className="text-brand-600">Portal</span></h1>
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
            <button 
              onClick={toggleOnline}
              className={cn(
                "px-5 py-2 rounded-[0.85rem] font-bold text-sm transition-all flex items-center gap-2",
                isOnline ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "text-slate-400"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-white animate-pulse" : "bg-slate-300")} />
              GO ONLINE
            </button>
            <button 
              onClick={toggleOnline}
              className={cn(
                "px-5 py-2 rounded-[0.85rem] font-bold text-sm transition-all",
                !isOnline ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"
              )}
            >
              OFFLINE
            </button>
          </div>
        </div>
      </div>

      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Today Earnings', value: '₹1,240', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Rides', value: '12', icon: ClipboardList, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Rating', value: '4.8', icon: Star, color: 'text-accent-500', bg: 'bg-accent-50' },
          { label: 'Available Balance', value: '₹450', icon: IndianRupee, color: 'text-brand-600', bg: 'bg-brand-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 card-shadow group hover:-translate-y-1 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("p-2 rounded-xl shrink-0 transition-colors", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Active Ride Section */}
      <AnimatePresence>
        {activeRide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Bike className="w-40 h-40" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                      <Navigation className="w-8 h-8 text-brand-400" />
                    </div>
                    <div>
                      <span className="block text-2xl font-black tracking-tight">Active Journey</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Status: {activeRide.status.replace('_', ' ')}</span>
                        {activeRide.distance && (
                          <span className="text-[10px] font-black bg-white/10 text-white px-2 py-0.5 rounded-lg border border-white/10 uppercase tracking-wider">
                            Distance: {activeRide.distance} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/20">
                    {formatCurrency(activeRide.acceptedFare || activeRide.userOfferedFare)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <img src={activeRide.userPhoto || `https://ui-avatars.com/api/?name=${activeRide.userName}`} className="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover" />
                      <div>
                        <span className="block font-bold text-lg">{activeRide.userName}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <a 
                            href={`tel:${activeRide.userPhone}`} 
                            className="bg-brand-600 flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-black hover:bg-brand-700 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            CALL RIDER
                          </a>
                          <span className="text-white/40 text-xs font-medium">{activeRide.userPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                      <div className="flex items-start gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">PICKUP</span>
                          <span className="text-sm font-semibold">{activeRide.pickup.address}</span>
                          <button 
                            onClick={() => openInGoogleMaps(activeRide.pickup.lat, activeRide.pickup.lng, 'Pickup')}
                            className="mt-2 text-[10px] font-bold text-brand-400 flex items-center gap-1 hover:text-brand-300"
                          >
                            <MapPin className="w-3 h-3" />
                            VIEW ON MAP
                          </button>
                        </div>
                      </div>
                      <div className="w-px h-6 bg-white/10 ml-[5px]" />
                      <div className="flex items-start gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">DRROP OFF</span>
                          <span className="text-sm font-semibold">{activeRide.drop.address}</span>
                          <button 
                            onClick={() => openInGoogleMaps(activeRide.drop.lat, activeRide.drop.lng, 'Drop-off')}
                            className="mt-2 text-[10px] font-bold text-brand-400 flex items-center gap-1 hover:text-brand-300"
                          >
                            <MapPin className="w-3 h-3" />
                            VIEW ON MAP
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-3">
                    <div className="flex gap-3">
                      <a 
                        href={`tel:${activeRide.userPhone}`}
                        onClick={(e) => {
                          if (!activeRide.userPhone) {
                            e.preventDefault();
                            alert('No phone number provided for this customer.');
                          }
                        }}
                        className="flex-1 bg-brand-600 text-white py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-600/25 active:scale-95 border-b-4 border-brand-800"
                      >
                        <Phone className="w-5 h-5" />
                        Call Customer
                      </a>
                    </div>
                    {activeRide.status === RideStatus.ACCEPTED && (
                      <button 
                        onClick={() => handleUpdateRideStatus(activeRide.id, RideStatus.ARRIVED)}
                        disabled={!!loadingAction}
                        className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-xl"
                      >
                        {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'I have Arrived'}
                      </button>
                    )}
                    {activeRide.status === RideStatus.ARRIVED && (
                      <button 
                        onClick={() => handleUpdateRideStatus(activeRide.id, RideStatus.IN_PROGRESS)}
                        disabled={!!loadingAction}
                        className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-xl"
                      >
                        {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Trip'}
                      </button>
                    )}
                    {activeRide.status === RideStatus.IN_PROGRESS && (
                      <button 
                        onClick={() => handleUpdateRideStatus(activeRide.id, RideStatus.COMPLETED)}
                        disabled={!!loadingAction}
                        className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl"
                      >
                        {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finish Trip'}
                      </button>
                    )}
                    
                    {(activeRide.status === RideStatus.ACCEPTED || activeRide.status === RideStatus.ARRIVED) && (
                      <button 
                        onClick={() => handleCancelRide(activeRide.id)}
                        disabled={!!loadingAction}
                        className="w-full bg-rose-500/10 text-rose-500 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20 mt-2"
                      >
                        {loadingAction ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel Ride'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] card-shadow border border-slate-100 overflow-hidden">
        {/* Sub-Nav Tabs */}
        <div className="flex border-b border-slate-50 p-2">
          <button 
            onClick={() => setActiveTab('available')}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'available' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Bell className={cn("w-4 h-4", activeTab === 'available' ? "animate-bounce" : "")} />
            LIVE REQUESTS
          </button>
          <button 
            onClick={() => setActiveTab('earnings')}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'earnings' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <History className="w-4 h-4" />
            HISTORY
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="p-6">
          {activeTab === 'available' ? (
            <AnimatePresence>
              {!isOnline ? (
                <div className="text-center py-24 px-8">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Power className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">You're Offline</h3>
                  <p className="text-slate-400 font-medium">Toggle the switch above to start receiving ride requests.</p>
                </div>
              ) : rides.length === 0 ? (
                <div className="text-center py-24 px-8">
                  <div className="bg-brand-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Navigation className="w-10 h-10 text-brand-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Searching for Rides...</h3>
                  <p className="text-slate-400 font-medium">Keep app open to catch the latest requests in your area.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {rides.map((ride) => (
                    <motion.div 
                      key={ride.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform" />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-6">
                             <img src={ride.userPhoto || `https://ui-avatars.com/api/?name=${ride.userName}`} className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover" />
                             <div>
                               <span className="block text-sm font-bold text-slate-900">{ride.userName}</span>
                               <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">RIDER REQUEST</span>
                                 {ride.distance && (
                                   <span className="text-[10px] font-black bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg border border-brand-100/50">
                                     {ride.distance} KM
                                   </span>
                                 )}
                                 {ride.userPhone && (
                                   <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                     {ride.userPhone}
                                   </span>
                                 )}
                               </div>
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-start gap-4">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15 mt-1 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PICKUP</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800 line-clamp-1">{ride.pickup.address}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInGoogleMaps(ride.pickup.lat, ride.pickup.lng, 'Pickup');
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded-lg text-brand-600 transition-colors"
                                    title="View on Map"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="w-px h-4 bg-slate-200 ml-[5px] my-1 border-l border-dashed" />
                            <div className="flex items-start gap-4">
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/15 mt-1 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DROP</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800 line-clamp-1">{ride.drop.address}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInGoogleMaps(ride.drop.lat, ride.drop.lng, 'Drop-off');
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded-lg text-brand-600 transition-colors"
                                    title="View on Map"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end justify-between bg-white md:bg-transparent p-4 md:p-0 rounded-2xl border border-slate-100 md:border-none">
                          <div className="text-center md:text-right mb-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-1">PROPOSED FARE</span>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(ride.userOfferedFare)}</div>
                          </div>
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            <button 
                              onClick={() => handleMakeOffer(ride)}
                              disabled={loadingAction === ride.id}
                              className="w-full md:w-auto bg-brand-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-700 shadow-xl shadow-brand-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 group-hover:ring-4 group-hover:ring-brand-500/10 disabled:opacity-50"
                            >
                              {loadingAction === ride.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  Accept Request
                                  <ChevronRight className="w-5 h-5" />
                                </>
                              )}
                            </button>
                            {ride.userPhone && (
                              <a 
                                href={`tel:${ride.userPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full md:w-auto bg-slate-900/5 text-slate-600 px-10 py-3 rounded-2xl font-bold hover:bg-slate-900/10 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-slate-200"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call Rider
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center justify-between hover:bg-white transition-all">
                  <div className="flex items-center gap-5">
                    <div className="bg-brand-50 p-3 rounded-2xl">
                      <History className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">May 0{i}, 2024</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">2.4 km • Completed Ride</div>
                    </div>
                  </div>
                  <div className="px-6 py-2 bg-emerald-50 rounded-full font-black text-emerald-600 text-lg">+₹140</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
