import { Timestamp, GeoPoint } from "firebase/firestore";
import type { PlaceCategory } from "@/constants/categories";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: UserSettings;
}

export interface UserSettings {
  proximityRadius: number; // meters
  notificationsEnabled: boolean;
}

export interface Place {
  placeId: string;
  userId: string;
  name: string;
  address: string;
  externalPlaceId: string | null;
  location: GeoPoint;
  geohash: string;
  category: PlaceCategory;
  tags: string[];
  noteCount: number;
  lastNoteAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPublic: boolean;
  /** UIDs of users this place is shared with */
  sharedWith: string[];
}

export interface Note {
  noteId: string;
  userId: string;
  placeId: string;
  title: string;
  body: string;
  rating: number | null; // 1-5
  photos: string[];
  visitedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** A pending share invitation */
export interface ShareInvite {
  inviteId: string;
  placeId: string;
  placeName: string;
  fromUserId: string;
  fromDisplayName: string;
  toEmail: string;
  toUserId: string | null; // null until recipient signs up
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
}

// Form input types (before Firestore conversion)
export interface PlaceInput {
  name: string;
  address: string;
  externalPlaceId?: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  tags?: string[];
}

export interface NoteInput {
  title: string;
  body: string;
  rating?: number | null;
  photos?: string[];
  visitedAt?: Date;
}
