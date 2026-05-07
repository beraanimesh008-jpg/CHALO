import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { RideStatus, UserRole } from '../types';
import { MapPin, Search, Navigation, IndianRupee, ChevronRight, Locate, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function MapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [fare, setFare] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [center, setCenter] = useState<[number, number]>([21.85, 88.37]);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);

  const handleMapClick = (latlng: L.LatLng) => {
    if (!pickupCoords) {
      setPickupCoords([latlng.lat, latlng.lng]);
    } else if (!dropCoords) {
      setDropCoords([latlng.lat, latlng.lng]);
    } else {
      // If both set, reset to just pickup on new click
      setPickupCoords([latlng.lat, latlng.lng]);
      setDropCoords(null);
    }
  };

  // Create an inverted polygon for masking is complex in React-Leaflet simply, 
  // so we will use maxBounds and a boundary highlight.
  
  const calculateDistance = async (lat1: number, lon1: number, lat2: number, lon2: number) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
      );
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].distance / 1000; // Meters to KM
      }
    } catch (error) {
      console.error('OSRM Distance calculation failed:', error);
    }

    // Fallback to Haversine if API fails
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!pickupCoords || !dropCoords) {
      alert('Please select pickup and drop-off points on the map first.');
      return;
    }

    if (!fare) {
      alert('Please enter an offered fare.');
      return;
    }

    setIsSearching(true);

    try {
      const distance = await calculateDistance(
        pickupCoords[0], pickupCoords[1],
        dropCoords[0], dropCoords[1]
      );

      const rideData = {
        userId: profile.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL || null,
        userPhone: profile.phoneNumber || '',
        pickup: {
          address: pickup || 'Map Selection',
          lat: pickupCoords[0],
          lng: pickupCoords[1]
        },
        drop: {
          address: drop || 'Map Selection',
          lat: dropCoords[0],
          lng: dropCoords[1]
        },
        distance: Number(distance.toFixed(2)),
        userOfferedFare: Number(fare),
        status: RideStatus.SEARCHING,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'rides'), rideData);
      navigate(`/ride/${docRef.id}`);
    } catch (error) {
      console.error('Error requesting ride:', error);
      setIsSearching(false);
    }
  };

  if (profile?.role === UserRole.DRIVER) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-brand-100 p-6 rounded-3xl mb-8 shadow-inner"
        >
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-black text-xl italic leading-none">CL</span>
          </div>
        </motion.div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Ready to Ride?</h2>
        <p className="text-slate-500 mb-10 max-w-sm leading-relaxed font-medium">Switch to the Driver Dashboard to find and accept ride requests near you and start earning.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-brand-600 text-white px-10 py-4.5 rounded-2xl font-bold hover:bg-brand-700 shadow-xl shadow-brand-600/20 transition-all active:scale-95 flex items-center gap-2 group"
        >
          Go to Driver Dashboard
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const dropIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-10">
      {/* Map Implementation */}
      <div className="relative aspect-[16/10] bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl z-0">
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => {
              setPickupCoords(null);
              setDropCoords(null);
              setPickup('');
              setDrop('');
            }}
            className="group flex items-center gap-3 bg-white/95 backdrop-blur-md pl-1 pr-5 py-1.5 rounded-2xl shadow-xl border border-white/50 cursor-pointer hover:bg-white transition-colors"
          >
            <div className="bg-green-600 p-2 rounded-[0.8rem] shadow-lg shadow-green-600/20 transition-transform group-hover:scale-110">
              <MapPin className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Step 01</span>
                {pickupCoords && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded">SET</span>}
              </div>
              <span className="text-xs font-bold text-slate-900">Tap for Pickup</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => {
              setDropCoords(null);
              setDrop('');
            }}
            className="group flex items-center gap-3 bg-white/95 backdrop-blur-md pl-1 pr-5 py-1.5 rounded-2xl shadow-xl border border-white/50 cursor-pointer hover:bg-white transition-colors"
          >
            <div className="bg-red-600 p-2 rounded-[0.8rem] shadow-lg shadow-red-600/20 transition-transform group-hover:scale-110">
              <MapPin className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Step 02</span>
                {dropCoords && <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded">SET</span>}
              </div>
              <span className="text-xs font-bold text-slate-900">Tap for Drop-off</span>
            </div>
          </motion.div>
        </div>
        <MapContainer 
          center={center} 
          zoom={12} 
          minZoom={3}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {pickupCoords && <Marker position={pickupCoords} icon={pickupIcon} />}
          {dropCoords && <Marker position={dropCoords} icon={dropIcon} />}
          <MapUpdater center={center} />
          <MapEvents onMapClick={handleMapClick} />
        </MapContainer>
        <div className="absolute bottom-6 right-6 z-[1000]">
          <button 
            onClick={() => {
              navigator.geolocation.getCurrentPosition((pos) => setCenter([pos.coords.latitude, pos.coords.longitude]))
            }}
            className="p-4 glass rounded-2xl shadow-xl text-brand-600 hover:bg-white transition-all active:scale-90"
            title="Recenter Map"
          >
            <Locate className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Ride Request Form */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 card-shadow border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <div className="bg-accent-500/10 p-2 rounded-xl">
            <Navigation className="w-6 h-6 text-accent-500" />
          </div>
          Book a Ride
        </h2>
        
        <form onSubmit={handleRequestRide} className="space-y-6">
          <div className="space-y-4 relative">
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-500/5 transition-all">
              <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
              <input 
                type="text" 
                placeholder="Pickup Point" 
                className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:text-slate-400"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-500/5 transition-all">
              <div className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
              <input 
                type="text" 
                placeholder="Where are you going?" 
                className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:text-slate-400"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">Proposed Fare</label>
            <div className="flex items-center gap-4 p-5 bg-brand-50/50 rounded-2xl border border-brand-100 focus-within:bg-white focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/5 transition-all">
              <div className="bg-brand-600 p-1.5 rounded-lg shrink-0">
                <IndianRupee className="w-5 h-5 text-white" />
              </div>
              <input 
                type="number" 
                placeholder="Your Price" 
                className="bg-transparent border-none outline-none w-full text-2xl font-bold text-brand-900 placeholder:text-brand-200"
                value={fare}
                onChange={(e) => setFare(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSearching}
            className={cn(
              "w-full bg-brand-600 text-white flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-brand-600/25 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
            )}
          >
            {isSearching ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                Finding Rides...
              </div>
            ) : (
              <>
                Confirm Ride Request
                <Search className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Suggested Places */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Work', address: 'Market Place', icon: MapPin },
          { label: 'Home', address: 'Vill St.', icon: MapPin },
        ].map((item, idx) => (
          <button key={idx} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 hover:border-brand-200 hover:shadow-lg transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 relative z-10">
              <item.icon className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
            </div>
            <div className="text-left relative z-10">
              <span className="block text-sm font-bold text-slate-900">{item.label}</span>
              <span className="text-[11px] font-medium text-slate-400">{item.address}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
