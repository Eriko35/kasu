import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {getFirestore, getDoc, doc} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js"

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  // Note: Storage is handled by Supabase
const firebaseConfig = {
  apiKey: "AIzaSyAj1k6vykPc_AcVy67_j31UGb2rRTzJH7o",
  authDomain: "kakamuseo.firebaseapp.com",
  projectId: "kakamuseo",
  storageBucket: "kakamuseo.firebasestorage.app",
  messagingSenderId: "428063366247",
  appId: "1:428063366247:web:6de923e74ecc627e6f08c2",
  measurementId: "G-JV9GSD9CX4"
};


  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth();
  const db=getFirestore();

  onAuthStateChanged(auth, (user)=>{
    const loggedInUserId=localStorage.getItem('loggedInUserId');
    if(loggedInUserId){
        const docRef = doc(db, "users", loggedInUserId);
        getAuth(docRef).then((docSnap)=>{
            if(docSnap.exists()){
                const userData=docSnap.data();
            }
        })
    }
  });
