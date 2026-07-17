// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjwzOpxOzkXpMIDRIfeND74YHImUVjEKs",
  authDomain: "fullmark-portal-new.firebaseapp.com",
  projectId: "fullmark-portal-new",
  storageBucket: "fullmark-portal-new.firebasestorage.app",
  messagingSenderId: "1067625858078",
  appId: "1:1067625858078:web:cbea69d85475f903c69a0f",
  measurementId: "G-8LSC9QRD23"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
