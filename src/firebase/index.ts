'use client';
import {
  useFirebaseApp,
  useAuth,
  useFirestore,
  useUser,
  useFirebase,
} from './provider';

// This file serves as a barrel file for all public Firebase hooks and utilities.

export {
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useUser,
};
