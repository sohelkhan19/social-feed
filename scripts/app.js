import { firebaseConfig } from './firebase-config.js';
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();
