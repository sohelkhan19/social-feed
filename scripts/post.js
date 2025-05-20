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
  getFirestore,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let currentEditingPostId = null;
let currentEditingImageUrl = null;

// ✅ Your Cloudinary config
const CLOUD_NAME = "do0do4mft";
const UPLOAD_PRESET = "social-feed";

// 🎨 Theme Toggle
function initTheme() {
  const themeToggle = document.querySelector(".theme-toggle");
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    // Update icon
    const icon = themeToggle.querySelector("i");
    icon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  });

  // Set initial icon
  const icon = themeToggle.querySelector("i");
  icon.className = savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

// 🎭 Modal Functions
function openPostModal() {
  document.getElementById("post-modal").style.display = "flex";
}

function closePostModal() {
  document.getElementById("post-modal").style.display = "none";
}

// Edit Post Modal Functions
window.openEditPostModal = function (postId, currentText, currentImageUrl) {
  currentEditingPostId = postId;
  currentEditingImageUrl = currentImageUrl;

  document.getElementById("edit-post-text").value = currentText;

  const editImagePreview = document.getElementById("edit-image-preview");
  if (currentImageUrl) {
    editImagePreview.innerHTML = `<img src="${currentImageUrl}" alt="Current Image">`;
    editImagePreview.style.display = "block";
    document.getElementById("image-actions").style.display = "flex";
  } else {
    editImagePreview.style.display = "none";
    document.getElementById("image-actions").style.display = "none";
  }

  document.getElementById("edit-post-modal").style.display = "flex";
};

window.closeEditPostModal = function () {
  document.getElementById("edit-post-modal").style.display = "none";
  currentEditingPostId = null;
  currentEditingImageUrl = null;
  document.getElementById("edit-post-image").value = "";
};

window.removeImage = function () {
  currentEditingImageUrl = null;
  document.getElementById("edit-image-preview").style.display = "none";
  document.getElementById("edit-image-preview").innerHTML = "";
  document.getElementById("image-actions").style.display = "none";
};

// Story Modal Functions
function openStoryModal() {
  document.getElementById("story-modal").style.display = "flex";
}

window.closeStoryModal = function () {
  document.getElementById("story-modal").style.display = "none";
  document.getElementById("story-preview").style.display = "none";
  document.getElementById("story-preview").innerHTML = "";
  document.getElementById("story-image").value = "";
};

// Story Viewer Functions
// Story Viewer Functions
function viewStory(story) {
  const viewer = document.getElementById("story-viewer");
  const storyImage = document.getElementById("viewed-story-image");
  const storyUserName = document.querySelector(".story-user-name");
  const storyUserAvatar = document.querySelector(".story-user-avatar");
  const storyTime = document.querySelector(".story-time");

  // Clear any existing timeout to prevent multiple timers
  if (window.storyViewerTimeout) {
    clearTimeout(window.storyViewerTimeout);
  }

  // Reset progress bar
  const progressBar = viewer.querySelector(".story-progress-bar");
  progressBar.innerHTML = '<div class="progress"></div>';

  storyImage.src = story.imageUrl;
  storyUserName.textContent = story.user.name;
  storyUserAvatar.textContent = story.user.name.charAt(0).toUpperCase();

  // Format time
  const storyDate = story.createdAt?.toDate
    ? story.createdAt.toDate()
    : new Date();
  storyTime.textContent = formatTime(storyDate);

  viewer.style.display = "flex";

  // Start progress bar animation
  const progress = progressBar.querySelector(".progress");
  progress.style.animation = "progress 5s linear forwards";

  // Set a consistent 5-second timeout for auto-closing
  window.storyViewerTimeout = setTimeout(() => {
    if (viewer.style.display === "flex") {
      closeStoryViewer();
    }
  }, 5000); // 5000 milliseconds = 5 seconds
}

window.closeStoryViewer = function () {
  // Clear the timeout when manually closing
  if (window.storyViewerTimeout) {
    clearTimeout(window.storyViewerTimeout);
  }
  document.getElementById("story-viewer").style.display = "none";
};

// 🖼️ Image Preview
function setupImagePreview() {
  // Post image preview
  const fileInput = document.getElementById("post-image");
  const imagePreview = document.getElementById("image-preview");

  fileInput.addEventListener("change", function (e) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        imagePreview.style.display = "block";
      };

      reader.readAsDataURL(file);
    } else {
      imagePreview.style.display = "none";
      imagePreview.innerHTML = "";
    }
  });

  // Edit post image preview
  const editFileInput = document.getElementById("edit-post-image");
  const editImagePreview = document.getElementById("edit-image-preview");

  editFileInput.addEventListener("change", function (e) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        editImagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        editImagePreview.style.display = "block";
        document.getElementById("image-actions").style.display = "flex";
      };

      reader.readAsDataURL(file);
    }
  });

  // Story image preview
  const storyFileInput = document.getElementById("story-image");
  const storyImagePreview = document.getElementById("story-preview");

  storyFileInput.addEventListener("change", function (e) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        storyImagePreview.innerHTML = `
          <img src="${event.target.result}" alt="Story Preview">
        `;
        storyImagePreview.style.display = "block";
        storyImagePreview.scrollIntoView({ behavior: "smooth" });
      };

      reader.readAsDataURL(file);
    } else {
      storyImagePreview.style.display = "none";
      storyImagePreview.innerHTML = "";
    }
  });
}

// 🔐 Auth check
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("user-info").innerHTML = `
      <span>${user.email.split("@")[0]}</span>
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
      document.getElementById("feed-loading").style.display = "none";
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

  if (text && text.length > 1500) {
    Swal.fire({
      icon: "warning",
      title: "Content Too Long",
      text: "Post content is too long. Maximum 1500 characters allowed.",
    });
    return;
  }

  if (!text && !imageFile) {
    Swal.fire({
      icon: "error",
      title: "Empty Post",
      text: "Please add text or an image to your post",
    });
    return;
  }

  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      // Show loading state
      const postBtn = document.querySelector(".post-btn");
      postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
      postBtn.disabled = true;

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        imageUrl = data.secure_url;
      } else {
        throw new Error("Upload failed");
      }
      Swal.fire({
        icon: "success",
        title: "Posted!",
        text: "Your post has been shared successfully",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Image upload failed. Please try again.",
      });
      return;
    } finally {
      // Reset button state
      const postBtn = document.querySelector(".post-btn");
      postBtn.innerHTML = "Post";
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
      name: currentUser.email.split("@")[0],
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

// 🖊️ Submit edited post
window.submitEditPost = async function () {
  const newText = document.getElementById("edit-post-text").value;
  const imageFile = document.getElementById("edit-post-image").files[0];
  let newImageUrl = currentEditingImageUrl;

  if (newText && newText.length > 1500) {
    Swal.fire({
      icon: "warning",
      title: "Content Too Long",
      text: "Post content is too long. Maximum 1500 characters allowed.",
    });
    return;
  }

  if (!newText && !newImageUrl && !imageFile) {
    Swal.fire({
      icon: "error",
      title: "Empty Post",
      text: "Post cannot be empty. Please add text or an image.",
    });
    return;
  }

  // Upload new image if selected
  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      // Show loading state
      const saveBtn = document.querySelector("#edit-post-modal .post-btn");
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      saveBtn.disabled = true;

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        newImageUrl = data.secure_url;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Image upload failed. Please try again.",
      });
      return;
    }
  }

  try {
    const postRef = doc(db, "posts", currentEditingPostId);
    await setDoc(
      postRef,
      {
        text: newText,
        imageUrl: newImageUrl,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    closeEditPostModal();
    Swal.fire({
      icon: "success",
      title: "Updated!",
      text: "Your post has been updated successfully",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: "Failed to update post. Please try again.",
    });
  } finally {
    // Reset button state
    const saveBtn = document.querySelector("#edit-post-modal .post-btn");
    saveBtn.innerHTML = "Save Changes";
    saveBtn.disabled = false;
  }
};

// 🗑️ Delete Post
window.deletePost = async function (postId) {
  Swal.fire({
    title: "Delete Post?",
    text: "Are you sure you want to delete this post? This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Delete logic here
        const likesQuery = query(
          collection(db, "likes"),
          where("postId", "==", postId)
        );
        const likesSnapshot = await getDocs(likesQuery);
        likesSnapshot.forEach(async (likeDoc) => {
          await deleteDoc(likeDoc.ref);
        });

        // Then delete all associated comments
        const commentsQuery = query(
          collection(db, "comments"),
          where("postId", "==", postId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach(async (commentDoc) => {
          await deleteDoc(commentDoc.ref);
        });

        // Finally delete the post itself
        await deleteDoc(doc(db, "posts", postId));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Your post has been deleted successfully",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting post:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete post. Please try again.",
        });
      }
    }
  });
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
      commentsContainer.innerHTML =
        '<div class="no-comments">No comments yet</div>';
      return;
    }

    commentsContainer.innerHTML = "";

    snapshot.forEach((doc) => {
      const comment = doc.data();
      const commentId = doc.id;
      const commentTime = comment.createdAt?.toDate
        ? comment.createdAt.toDate()
        : new Date();
      const timeString = formatTime(commentTime);

      const commentElement = document.createElement("div");
      commentElement.className = "comment";
      commentElement.innerHTML = `
        <div class="comment-avatar">${comment.user.name
          .charAt(0)
          .toUpperCase()}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${comment.user.name}</span>
            <span class="comment-time">${timeString}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
        </div>
        ${
          comment.user.uid === currentUser.uid
            ? `<div class="comment-delete" onclick="deleteComment('${commentId}')">
            <i class="fas fa-trash"></i>
          </div>`
            : ""
        }
      `;

      commentsContainer.appendChild(commentElement);
    });

    // Update comment count in post
    const postElement = commentsContainer.closest(".post");
    const commentsCountEl = postElement.querySelector(".comments-count");
    commentsCountEl.textContent = `${snapshot.size} ${
      snapshot.size === 1 ? "comment" : "comments"
    }`;
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
  const storiesContainer = document.querySelector(".stories");
  const now = new Date();

  // Clear existing stories except the "create story" button
  while (storiesContainer.children.length > 1) {
    storiesContainer.removeChild(storiesContainer.lastChild);
  }

  // Query stories that haven't expired yet
  const q = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("expiresAt", "asc")
  );

  onSnapshot(q, (snapshot) => {
    // Clear existing stories except the "create story" button
    while (storiesContainer.children.length > 1) {
      storiesContainer.removeChild(storiesContainer.lastChild);
    }

    snapshot.forEach((doc) => {
      const story = doc.data();
      const storyElement = document.createElement("div");
      storyElement.className = "story";
      storyElement.innerHTML = `
    <div class="story-avatar">${story.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()}</div>
    <span>${story.user.name}</span>
  `;

      storyElement.addEventListener("click", () => viewStory(story));
      storiesContainer.appendChild(storyElement);
    });
  });
}

// 🧱 Render post with live like updates
async function renderPost(docSnap) {
  const post = docSnap.data();
  const postId = docSnap.id;

  const div = document.createElement("div");
  div.classList.add("post", "fade-in");

  // Format timestamp
  const postTime = post.createdAt?.toDate
    ? post.createdAt.toDate()
    : new Date();
  const timeString = formatTime(postTime);

  // Create initial display text
  const displayText = post.text
    ? post.text.length > 200
      ? post.text.substring(0, 200) + "..."
      : post.text
    : "";

  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${
        post.user.name?.charAt(0) || post.user.email.charAt(0)
      }</div>
      <div class="post-user">
        <div class="post-user-name">${
          post.user.name || post.user.email.split("@")[0]
        }</div>
        <div class="post-time">${timeString}</div>
      </div>
      <div class="post-more">
        <i class="fas fa-ellipsis-h"></i>
        <div class="post-options" style="display: none;">
          ${
            post.user.uid === currentUser.uid
              ? `
              <div class="post-option" onclick="openEditPostModal('${postId}', '${post.text.replace(
                  /'/g,
                  "\\'"
                )}', '${post.imageUrl || ""}')">
                <i class="fas fa-edit"></i> Edit
              </div>
              <div class="post-option delete-option" onclick="deletePost('${postId}')">
                <i class="fas fa-trash"></i> Delete
              </div>
              `
              : `
              <div class="post-option" onclick="reportPost('${postId}')">
                <i class="fas fa-flag"></i> Report
              </div>
              `
          }
        </div>
      </div>
    </div>
    <div class="post-content">
      ${
        post.text
          ? `
        <div class="post-text">
          <span class="post-text-content">${displayText}</span>
          ${
            post.text.length > 200
              ? `<button class="text-toggle-btn">Show more</button>`
              : ""
          }
        </div>
      `
          : ""
      }
      ${
        post.imageUrl
          ? `<img src="${post.imageUrl}" class="post-image" loading="lazy">`
          : ""
      }
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
        <div class="comment-avatar">${currentUser.email
          .charAt(0)
          .toUpperCase()}</div>
        <input type="text" class="comment-input" placeholder="Write a comment...">
        <button class="comment-submit">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  // Add toggle functionality for post options dropdown
  const postMoreBtn = div.querySelector(".post-more");
  const postOptions = div.querySelector(".post-options");

  postMoreBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent event bubbling
    const isVisible = postOptions.style.display === "block";
    postOptions.style.display = isVisible ? "none" : "block";
  });

  // Close dropdown when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!postMoreBtn.contains(e.target)) {
      postOptions.style.display = "none";
    }
  });

  // Add toggle functionality for long text
  if (post.text && post.text.length > 200) {
    const textToggleBtn = div.querySelector(".text-toggle-btn");
    const postTextContent = div.querySelector(".post-text-content");
    const fullText = post.text;

    textToggleBtn.addEventListener("click", function () {
      if (this.textContent === "Show more") {
        // Expand to show full text
        postTextContent.textContent = fullText;
        this.textContent = "Show less";
      } else {
        // Collapse to show truncated text
        postTextContent.textContent = fullText.substring(0, 200) + "...";
        this.textContent = "Show more";
      }
    });
  }

  // 🔁 Real-time like listener
  const likeQuery = query(
    collection(db, "likes"),
    where("postId", "==", postId)
  );
  onSnapshot(likeQuery, (likeSnap) => {
    const likeCount = likeSnap.size;
    const liked = likeSnap.docs.some(
      (doc) => doc.data().userId === currentUser.uid
    );

    const likesCountEl = div.querySelector(".likes-count");
    const likeBtn = div.querySelector(".like-btn");

    likesCountEl.textContent = `${likeCount} ${
      likeCount === 1 ? "like" : "likes"
    }`;

    if (liked) {
      likeBtn.innerHTML = '<i class="fas fa-heart"></i><span>Like</span>';
      likeBtn.classList.add("liked");
    } else {
      likeBtn.innerHTML = '<i class="far fa-heart"></i><span>Like</span>';
      likeBtn.classList.remove("liked");
    }

    // Add click handler
    likeBtn.onclick = () => (liked ? unlikePost(postId) : likePost(postId));
  });

  // 🔁 Real-time comment count listener
  const commentCountQuery = query(
    collection(db, "comments"),
    where("postId", "==", postId)
  );
  onSnapshot(commentCountQuery, (commentSnap) => {
    const commentCount = commentSnap.size;
    const commentsCountEl = div.querySelector(".comments-count");
    commentsCountEl.textContent = `${commentCount} ${
      commentCount === 1 ? "comment" : "comments"
    }`;
  });

  // Comment submission handler
  const commentInput = div.querySelector(".comment-input");
  const commentSubmitBtn = div.querySelector(".comment-submit");

  commentSubmitBtn.addEventListener("click", () => {
    submitComment(postId, commentInput);
  });

  // Allow submitting comments with Enter key
  commentInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitComment(postId, commentInput);
    }
  });

  // Comment button handler
  div.querySelector(".comment-btn").addEventListener("click", function () {
    const commentsSection = div.querySelector(".post-comments");
    const displayState =
      commentsSection.style.display === "none" ? "block" : "none";
    commentsSection.style.display = displayState;

    // Attach comment listeners when opening the comments section
    if (displayState === "block") {
      const commentsListContainer = div.querySelector(".comments-list");
      // Only create the listener if not already listening
      if (!div.dataset.listeningToComments) {
        div.dataset.commentListener = listenToComments(
          postId,
          commentsListContainer
        );
        div.dataset.listeningToComments = "true";
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

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    Swal.fire({
      icon: "error",
      title: "Empty Comment",
      text: "Please enter a comment",
    });
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
        name: currentUser.email.split("@")[0],
      },
    });

    // Clear the comment input
    commentInputElement.value = "";
  } catch (error) {
    console.error("Error adding comment:", error);
    Swal.fire({
      icon: "error",
      title: "Comment Failed",
      text: "Failed to post comment. Please try again.",
    });
  }
};

// Add story submission function
window.submitStory = async () => {
  const imageFile = document.getElementById("story-image").files[0];

  if (!imageFile) {
    Swal.fire({
      icon: "error",
      title: "No Image Selected",
      text: "Please select an image for your story",
    });
    return;
  }

  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    // Show loading state
    const storyBtn = document.querySelector(".story-btn");
    storyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    storyBtn.disabled = true;

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await res.json();

    if (data.secure_url) {
      // Add story with 24-hour expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await addDoc(collection(db, "stories"), {
        imageUrl: data.secure_url,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        user: {
          uid: currentUser.uid,
          name: currentUser.email.split("@")[0],
          email: currentUser.email,
        },
      });

      closeStoryModal();
      loadStories();
      Swal.fire({
        icon: "success",
        title: "Story Posted!",
        text: "Your story will be visible for 24 hours",
        timer: 2500,
        showConfirmButton: false,
      });
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Story upload failed:", error);
    Swal.fire({
      icon: "error",
      title: "Upload Failed",
      text: "Story upload failed. Please try again.",
    });
  } finally {
    // Reset button state
    const storyBtn = document.querySelector(".story-btn");
    storyBtn.innerHTML = "Post Story";
    storyBtn.disabled = false;
  }
};

// 🗑️ Delete comment
window.deleteComment = async (commentId) => {
  Swal.fire({
    title: "Delete Comment?",
    text: "Are you sure you want to delete this comment?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "comments", commentId));
        Swal.fire({
          icon: "success",
          title: "Comment Deleted!",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting comment:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete comment. Please try again.",
        });
      }
    }
  });
};

// Expose functions for HTML onclick
window.likePost = likePost;
window.unlikePost = unlikePost;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
document
  .querySelector(".create-story")
  .addEventListener("click", openStoryModal);
