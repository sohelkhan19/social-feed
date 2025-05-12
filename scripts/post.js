import app from "./firebase.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// ✅ Replace these with your Cloudinary values
const CLOUD_NAME = "do0do4mft"; // e.g. "sohelcloud"
const UPLOAD_PRESET = "social-feed"; // e.g. "unsigned_preset"

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("user-info").innerText = `Logged in as: ${user.email}`;
    listenToPosts();
  } else {
    window.location.href = "login.html";
  }
});

window.logout = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

window.submitPost = async () => {
  const text = document.getElementById("post-text").value;
  const imageFile = document.getElementById("post-image").files[0];
  let imageUrl = "";

  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.secure_url) {
        imageUrl = data.secure_url;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      alert("Image upload failed. Please try again.");
      return;
    }
  }

  // Save post to Firestore
  await addDoc(collection(db, "posts"), {
    text,
    imageUrl,
    createdAt: serverTimestamp(),
    user: {
      uid: currentUser.uid,
      email: currentUser.email,
    },
  });

  document.getElementById("post-text").value = "";
  document.getElementById("post-image").value = "";
};

function listenToPosts() {
  const feedDiv = document.getElementById("feed");
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    feedDiv.innerHTML = "";
    snapshot.forEach((doc) => {
      const post = doc.data();
      const div = document.createElement("div");
      div.classList.add("post");

      div.innerHTML = `
        <p><strong>${post.user.email}</strong></p>
        <p>${post.text}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" width="200">` : ""}
        <hr>
      `;

      feedDiv.appendChild(div);
    });
  });
}
