import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ShareInvite } from "@/types";

const INVITES_COL = "shareInvites";

/**
 * Share a place with another user by email.
 * Creates an invite record and, if the recipient already exists,
 * adds them to the sharedWith array immediately.
 */
export async function sharePlace(
  placeId: string,
  placeName: string,
  fromUserId: string,
  fromDisplayName: string,
  toEmail: string
): Promise<ShareInvite> {
  // Look up recipient by email
  const usersQuery = query(
    collection(db, "users"),
    where("email", "==", toEmail.toLowerCase())
  );
  const usersSnap = await getDocs(usersQuery);
  const recipientDoc = usersSnap.docs[0];
  const toUserId = recipientDoc?.id ?? null;

  // Create the invite
  const inviteData = {
    placeId,
    placeName,
    fromUserId,
    fromDisplayName,
    toEmail: toEmail.toLowerCase(),
    toUserId,
    status: "pending" as const,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, INVITES_COL), inviteData);

  // If recipient exists, add them to sharedWith immediately
  if (toUserId) {
    await updateDoc(doc(db, "places", placeId), {
      sharedWith: arrayUnion(toUserId),
    });
    // Auto-accept the invite
    await updateDoc(doc(db, INVITES_COL, docRef.id), {
      status: "accepted",
      toUserId,
    });
  }

  return { inviteId: docRef.id, ...inviteData };
}

/**
 * Accept a pending share invite (for users who signed up after being invited).
 */
export async function acceptInvite(
  inviteId: string,
  userId: string
): Promise<void> {
  const inviteRef = doc(db, INVITES_COL, inviteId);

  // Update invite status
  await updateDoc(inviteRef, {
    status: "accepted",
    toUserId: userId,
  });

  // Get invite to find placeId
  const inviteSnap = await getDocs(
    query(collection(db, INVITES_COL), where("__name__", "==", inviteId))
  );
  if (inviteSnap.empty) return;

  const invite = inviteSnap.docs[0].data();

  // Add user to place's sharedWith
  await updateDoc(doc(db, "places", invite.placeId), {
    sharedWith: arrayUnion(userId),
  });
}

/**
 * Decline a share invite.
 */
export async function declineInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(db, INVITES_COL, inviteId), {
    status: "declined",
  });
}

/**
 * Revoke sharing — remove a user from a place's sharedWith array.
 */
export async function unsharePlace(
  placeId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, "places", placeId), {
    sharedWith: arrayRemove(userId),
  });

  // Clean up any invites for this user/place
  const invitesQuery = query(
    collection(db, INVITES_COL),
    where("placeId", "==", placeId),
    where("toUserId", "==", userId)
  );
  const snap = await getDocs(invitesQuery);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Get all pending invites for a user (by email or userId).
 */
export async function getPendingInvites(
  userId: string,
  email: string
): Promise<ShareInvite[]> {
  // Query by userId
  const byUidQuery = query(
    collection(db, INVITES_COL),
    where("toUserId", "==", userId),
    where("status", "==", "pending")
  );

  // Also query by email (for invites sent before user signed up)
  const byEmailQuery = query(
    collection(db, INVITES_COL),
    where("toEmail", "==", email.toLowerCase()),
    where("status", "==", "pending")
  );

  const [byUidSnap, byEmailSnap] = await Promise.all([
    getDocs(byUidQuery),
    getDocs(byEmailQuery),
  ]);

  const seen = new Set<string>();
  const invites: ShareInvite[] = [];

  for (const d of [...byUidSnap.docs, ...byEmailSnap.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    invites.push({ inviteId: d.id, ...d.data() } as ShareInvite);
  }

  return invites;
}

/**
 * Get all active shares for a place (accepted invites).
 */
export async function getPlaceShares(
  placeId: string
): Promise<ShareInvite[]> {
  const q = query(
    collection(db, INVITES_COL),
    where("placeId", "==", placeId),
    where("status", "==", "accepted")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ inviteId: d.id, ...d.data() }) as ShareInvite);
}
