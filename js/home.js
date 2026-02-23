import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {getAuth, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {getFirestore, getDoc, doc} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js"

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  // Note: Storage is handled by Supabase
const firebaseConfig = {
  apiKey: "AIzaSyDQ_poDvhiZFPmFpPFeEnOku1cGcNxKRRM",
  authDomain: "kamuseo-dadf9.firebaseapp.com",
  projectId: "kamuseo-dadf9",
  messagingSenderId: "604608096712",
  appId: "1:604608096712:web:21ecc54df78b2844b0f8fd",
  measurementId: "G-ELWE92RRGY"
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
