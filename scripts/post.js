import app from "./firebase.js";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  where,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  collection,
  addDoc,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// ✅ Your Cloudinary config
const CLOUD_NAME = "do0do4mft";
const UPLOAD_PRESET = "social-feed";

// 🎨 Theme Toggle
function initTheme() {
  const themeToggle = document.querySelector('.theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });
  
  // Set initial icon
  const icon = themeToggle.querySelector('i');
  icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 🎭 Modal Functions
function openPostModal() {
  document.getElementById('post-modal').style.display = 'flex';
}

function closePostModal() {
  document.getElementById('post-modal').style.display = 'none';
}

// 🖼️ Image Preview
function setupImagePreview() {
  const fileInput = document.getElementById('post-image');
  const imagePreview = document.getElementById('image-preview');
  
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = function(event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        imagePreview.style.display = 'block';
      }
      
      reader.readAsDataURL(file);
    } else {
      imagePreview.style.display = 'none';
      imagePreview.innerHTML = '';
    }
  });
}

// 🔐 Auth check
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("user-info").innerHTML = `
      <span>${user.email.split('@')[0]}</span>
      <span class="user-avatar">${user.email.charAt(0).toUpperCase()}</span>
    `;
    
    // Initialize theme and image preview after auth
    initTheme();
    setupImagePreview();
    
    // Load content
    listenToPosts();
    loadStories();
    
    // Hide loading skeletons
    setTimeout(() => {
      document.getElementById('feed-loading').style.display = 'none';
    }, 1000);
  } else {
    window.location.href = "login.html";
  }
});

// 🚪 Logout
window.logout = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

// 📝 Submit post
window.submitPost = async () => {
  const text = document.getElementById("post-text").value;
  const imageFile = document.getElementById("post-image").files[0];
  let imageUrl = "";

  if (!text && !imageFile) {
    alert("Please add text or an image to your post");
    return;
  }

  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      // Show loading state
      const postBtn = document.querySelector('.post-btn');
      postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
      postBtn.disabled = true;

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
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
    } finally {
      // Reset button state
      const postBtn = document.querySelector('.post-btn');
      postBtn.innerHTML = 'Post';
      postBtn.disabled = false;
    }
  }

  await addDoc(collection(db, "posts"), {
    text,
    imageUrl,
    createdAt: serverTimestamp(),
    user: {
      uid: currentUser.uid,
      email: currentUser.email,
      name: currentUser.email.split('@')[0]
    },
  });

  // Reset form
  document.getElementById("post-text").value = "";
  document.getElementById("post-image").value = "";
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("image-preview").innerHTML = "";
  
  // Close modal
  closePostModal();
};

// 📡 Listen for comments on a post
function listenToComments(postId, commentsContainer) {
  const q = query(
    collection(db, "comments"), 
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );
  
  // Return the unsubscribe function so we can detach the listener when needed
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
      return;
    }
    
    commentsContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
      const comment = doc.data();
      const commentId = doc.id;
      const commentTime = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
      const timeString = formatTime(commentTime);
      
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <div class="comment-avatar">${comment.user.name.charAt(0).toUpperCase()}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${comment.user.name}</span>
            <span class="comment-time">${timeString}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
        </div>
        ${comment.user.uid === currentUser.uid ? 
          `<div class="comment-delete" onclick="deleteComment('${commentId}')">
            <i class="fas fa-trash"></i>
          </div>` : ''}
      `;
      
      commentsContainer.appendChild(commentElement);
    });
    
    // Update comment count in post
    const postElement = commentsContainer.closest('.post');
    const commentsCountEl = postElement.querySelector('.comments-count');
    commentsCountEl.textContent = `${snapshot.size} ${snapshot.size === 1 ? 'comment' : 'comments'}`;
  });
}

// 📡 Listen for posts
function listenToPosts() {
  const feedDiv = document.getElementById("feed");
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    feedDiv.innerHTML = "";
    snapshot.forEach(async (docSnap) => {
      const postElement = await renderPost(docSnap);
      feedDiv.appendChild(postElement);
    });
  });
}

// 🏰 Load Stories
function loadStories() {
  const storiesContainer = document.querySelector('.stories');
  
  // Add some dummy stories (in a real app, these would come from your database)
  const stories = [
    { id: 1, name: "Alex", avatar: "👨" },
    { id: 2, name: "Jamie", avatar: "👩" },
    { id: 3, name: "Taylor", avatar: "🧑" },
    { id: 4, name: "Morgan", avatar: "👨" },
    { id: 5, name: "Casey", avatar: "👩" },
    { id: 6, name: "Riley", avatar: "🧑" },
  ];
  
  stories.forEach(story => {
    const storyElement = document.createElement('div');
    storyElement.className = 'story';
    storyElement.innerHTML = `
      <div class="story-avatar">${story.avatar}</div>
      <span>${story.name}</span>
    `;
    storiesContainer.appendChild(storyElement);
  });
}

// 🧱 Render post with live like updates
async function renderPost(docSnap) {
  const post = docSnap.data();
  const postId = docSnap.id;

  const div = document.createElement('div');
  div.classList.add('post', 'fade-in');

  // Format timestamp
  const postTime = post.createdAt?.toDate ? post.createdAt.toDate() : new Date();
  const timeString = formatTime(postTime);

  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${post.user.name?.charAt(0) || post.user.email.charAt(0)}</div>
      <div class="post-user">
        <div class="post-user-name">${post.user.name || post.user.email.split('@')[0]}</div>
        <div class="post-time">${timeString}</div>
      </div>
      <div class="post-more">
        <i class="fas fa-ellipsis-h"></i>
      </div>
    </div>
    <div class="post-content">
      ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
      ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" loading="lazy">` : ''}
    </div>
    <div class="post-stats">
      <span class="likes-count">0 likes</span>
      <span class="comments-count">0 comments</span>
    </div>
    <div class="post-actions">
      <div class="post-action like-btn">
        <i class="far fa-heart"></i>
        <span>Like</span>
      </div>
      <div class="post-action comment-btn">
        <i class="far fa-comment"></i>
        <span>Comment</span>
      </div>
      <div class="post-action share-btn">
        <i class="far fa-share-square"></i>
        <span>Share</span>
      </div>
    </div>
    <div class="post-comments" style="display: none;">
      <div class="comments-list"></div>
      <div class="comment-form">
        <div class="comment-avatar">${currentUser.email.charAt(0).toUpperCase()}</div>
        <input type="text" class="comment-input" placeholder="Write a comment...">
        <button class="comment-submit">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  // 🔁 Real-time like listener
  const likeQuery = query(collection(db, "likes"), where("postId", "==", postId));
  onSnapshot(likeQuery, (likeSnap) => {
    const likeCount = likeSnap.size;
    const liked = likeSnap.docs.some((doc) => doc.data().userId === currentUser.uid);
    
    const likesCountEl = div.querySelector('.likes-count');
    const likeBtn = div.querySelector('.like-btn');
    
    likesCountEl.textContent = `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;
    
    if (liked) {
      likeBtn.innerHTML = '<i class="fas fa-heart"></i><span>Liked</span>';
      likeBtn.classList.add('liked');
    } else {
      likeBtn.innerHTML = '<i class="far fa-heart"></i><span>Like</span>';
      likeBtn.classList.remove('liked');
    }
    
    // Add click handler
    likeBtn.onclick = () => liked ? unlikePost(postId) : likePost(postId);
  });

  // 🔁 Real-time comment count listener - Add this section
  const commentCountQuery = query(collection(db, "comments"), where("postId", "==", postId));
  onSnapshot(commentCountQuery, (commentSnap) => {
    const commentCount = commentSnap.size;
    const commentsCountEl = div.querySelector('.comments-count');
    commentsCountEl.textContent = `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`;
  });

  // Comment submission handler
  const commentInput = div.querySelector('.comment-input');
  const commentSubmitBtn = div.querySelector('.comment-submit');
  
  commentSubmitBtn.addEventListener('click', () => {
    submitComment(postId, commentInput);
  });
  
  // Allow submitting comments with Enter key
  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitComment(postId, commentInput);
    }
  });

  // Comment button handler
  div.querySelector('.comment-btn').addEventListener('click', function() {
    const commentsSection = div.querySelector('.post-comments');
    const displayState = commentsSection.style.display === 'none' ? 'block' : 'none';
    commentsSection.style.display = displayState;
    
    // Attach comment listeners when opening the comments section
    if (displayState === 'block') {
      const commentsListContainer = div.querySelector('.comments-list');
      // Only create the listener if not already listening
      if (!div.dataset.listeningToComments) {
        div.dataset.commentListener = listenToComments(postId, commentsListContainer);
        div.dataset.listeningToComments = 'true';
      }
      
      // Focus on comment input
      commentInput.focus();
    }
  });

  return div;
}

// ⏰ Format time
function formatTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ❤️ Like post
async function likePost(postId) {
  const likeRef = doc(db, "likes", `${postId}_${currentUser.uid}`);
  await setDoc(likeRef, {
    postId,
    userId: currentUser.uid,
    likedAt: serverTimestamp(),
  });
}

// 💔 Unlike post
async function unlikePost(postId) {
  const likeRef = doc(db, "likes", `${postId}_${currentUser.uid}`);
  await deleteDoc(likeRef);
}

// 💬 Submit comment
window.submitComment = async (postId, commentInputElement) => {
  const commentText = commentInputElement.value.trim();
  
  if (!commentText) {
    alert("Please enter a comment");
    return;
  }
  
  try {
    await addDoc(collection(db, "comments"), {
      postId,
      text: commentText,
      createdAt: serverTimestamp(),
      user: {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.email.split('@')[0]
      }
    });
    
    // Clear the comment input
    commentInputElement.value = "";
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Failed to post comment. Please try again.");
  }
};

// 🗑️ Delete comment
window.deleteComment = async (commentId) => {
  if (confirm("Are you sure you want to delete this comment?")) {
    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  }
};

// Expose functions for HTML onclick
window.likePost = likePost;
window.unlikePost = unlikePost;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.submitComment = submitComment;
window.deleteComment = deleteComment;