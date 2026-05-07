/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  USER = 'USER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum RideStatus {
  SEARCHING = 'SEARCHING',
  NEGOTIATING = 'NEGOTIATING',
  ACCEPTED = 'ACCEPTED',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingComplete?: boolean;
  driverOnboardingComplete?: boolean;
  vehiclePhoto?: string;
  aadhaarPhoto?: string;
  accountNumber?: string;
  ifscCode?: string;
  rating?: number;
  totalRides?: number;
  isOnline?: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  bikeDetails?: {
    model: string;
    number: string;
  };
}

export interface RideOffer {
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  driverRating: number;
  driverPhone?: string;
  driverLocation: {
    lat: number;
    lng: number;
  };
  offeredFare: number;
  bikeDetails: {
    model: string;
    number: string;
  };
  timestamp: number;
}

export interface Ride {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userPhone?: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  drop: {
    address: string;
    lat: number;
    lng: number;
  };
  distance?: number;
  userOfferedFare: number;
  status: RideStatus;
  driverId?: string;
  driverName?: string;
  driverPhoto?: string;
  driverRating?: number;
  driverPhone?: string;
  bikeDetails?: {
    model: string;
    number: string;
  };
  acceptedFare?: number;
  offers: RideOffer[];
  createdAt: number;
  updatedAt: number;
}

export interface AdminStats {
  totalRides: number;
  totalUsers: number;
  totalDrivers: number;
  totalEarnings: number;
  commissionRate: number;
}
