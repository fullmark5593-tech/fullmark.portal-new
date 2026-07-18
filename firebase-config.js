// ==========================================================
// إعدادات Firebase - مشروع fullmark-portal-new
// ==========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjwzOpxOzkXpMIDRIfeND74YHImUVjEKs",
  authDomain: "fullmark-portal-new.firebaseapp.com",
  projectId: "fullmark-portal-new",
  storageBucket: "fullmark-portal-new.firebasestorage.app",
  messagingSenderId: "1067625858078",
  appId: "1:1067625858078:web:cbea69d85475f903c69a0f",
  measurementId: "G-8LSC9QRD23"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
