(function () {
  const SUPABASE_URL = "https://itedssjogaktidqmwcny.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZWRzc2pvZ2FrdGlkcW13Y255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjQ5NDYsImV4cCI6MjA4Njk0MDk0Nn0.e4m1Lvzk6I8sr3sYRLCyn7_wfLl0fWEhuhTVVQeLFVc";
  const STORAGE_BUCKET = "post-images";

  let client = null;
  let sessionUser = null;

  function htmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setMessage(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function usernameFromEmail(email) {
    const base = String(email || "member").split("@")[0];
    const normalized = base.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);
    return normalized.length >= 3 ? normalized : `user_${Date.now()}`;
  }

  function uniqueUsernameSeed(base) {
    const clean = (base || "member")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 18);
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${clean || "member"}_${suffix}`.slice(0, 24);
  }

  async function ensureProfile(preferredUsername) {
    if (!sessionUser) return false;

    const { data: existing } = await client
      .from("profiles")
      .select("id, username")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (existing && existing.username) return true;

    const firstChoice = (preferredUsername || usernameFromEmail(sessionUser.email))
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 24);

    const attempts = [firstChoice, uniqueUsernameSeed(firstChoice), uniqueUsernameSeed(usernameFromEmail(sessionUser.email))];

    for (const candidate of attempts) {
      if (!candidate || candidate.length < 3) continue;
      const { error } = await client
        .from("profiles")
        .upsert(
          { id: sessionUser.id, username: candidate, login_email: String(sessionUser.email || "").toLowerCase() },
          { onConflict: "id" }
        );
      if (!error) return true;
    }

    return false;
  }

  async function refreshSession() {
    const { data } = await client.auth.getSession();
    sessionUser = data.session ? data.session.user : null;

    if (sessionUser) {
      setMessage("login-message", `Signed in as ${sessionUser.email}`);
    }
    await renderSessionBar();
  }

  async function renderSessionBar() {
    const bar = document.getElementById("session-bar");
    const text = document.getElementById("session-user-text");
    const logoutBtn = document.getElementById("session-logout-btn");

    if (!bar || !text || !logoutBtn) return;

    if (!sessionUser) {
      bar.style.display = "none";
      text.textContent = "Not logged in.";
      return;
    }

    const username = await getUsername(sessionUser.id);
    text.textContent = `Logged in as: ${username}`;
    bar.style.display = "block";
    logoutBtn.onclick = signOut;
  }

  async function loadMembersList() {
    const target = document.getElementById("members-list");
    if (!target) return;

    const { data, error } = await client
      .from("profiles")
      .select("username, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      target.innerHTML = '<div class="empty-state">Could not load members.</div>';
      return;
    }

    if (!data || !data.length) {
      target.innerHTML = '<div class="empty-state">No active members yet.</div>';
      return;
    }

    target.innerHTML = data.map((row) => `<div>• ${htmlEscape(row.username)}</div>`).join("");
  }

  async function signUp(event) {
    event.preventDefault();

    const email = (document.getElementById("signup-email")?.value || "").trim();
    const password = document.getElementById("signup-password")?.value || "";
    const username = (document.getElementById("signup-username")?.value || "").trim();

    if (!email || !password || !username) {
      setMessage("join-message", "Fill all signup fields.");
      return;
    }

    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      setMessage("join-message", error.message);
      return;
    }

    await refreshSession();
    const ok = await ensureProfile(username);
    if (!ok) {
      setMessage("join-message", "Signup worked, but profile creation failed. Try a different username.");
      return;
    }
    await loadMembersList();

    setMessage("join-message", "Signup complete. Now use login page to sign in.");
  }

  async function signIn(event) {
    event.preventDefault();

    const identifier = (document.getElementById("signin-email")?.value || "").trim();
    const password = document.getElementById("signin-password")?.value || "";

    if (!identifier || !password) {
      setMessage("login-message", "Enter email/username and password.");
      return;
    }

    const email = await resolveLoginEmail(identifier);
    if (!email) {
      setMessage("login-message", "Username not found.");
      return;
    }

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("login-message", error.message);
      return;
    }

    await refreshSession();
    await ensureProfile();
    await loadMembersList();
    await loadUpdatesFromSupabase();
    setMessage("login-message", "Signed in.");
    if (typeof window.showPage === "function") {
      window.showPage("home");
    }
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) {
      setMessage("login-message", error.message);
      return;
    }
    sessionUser = null;
    setMessage("login-message", "Signed out.");
    await refreshSession();
    await loadMembersList();
  }

  async function resolveLoginEmail(identifier) {
    const value = String(identifier || "").trim();
    if (!value) return null;
    if (value.includes("@")) return value.toLowerCase();

    const { data, error } = await client
      .from("profiles")
      .select("login_email")
      .eq("username", value)
      .maybeSingle();

    if (error || !data || !data.login_email) return null;
    return String(data.login_email).toLowerCase();
  }

  function parsePostContent(content, createdAt) {
    try {
      const parsed = JSON.parse(content);
      return {
        date: parsed.date || new Date(createdAt).toLocaleDateString(),
        text: parsed.text || "",
        imageUrl: parsed.imageUrl || null,
        imageData: parsed.imageData || null,
        username: parsed.username || "member"
      };
    } catch (_error) {
      return {
        date: new Date(createdAt).toLocaleDateString(),
        text: content || "",
        imageUrl: null,
        imageData: null,
        username: "member"
      };
    }
  }

  function fileExt(fileName) {
    const name = String(fileName || "");
    const idx = name.lastIndexOf(".");
    if (idx < 0) return "jpg";
    return name.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  }

  async function uploadPostImage(file) {
    if (!file || !sessionUser) return null;

    const ext = fileExt(file.name);
    const randomPart = Math.random().toString(36).slice(2, 8);
    const filePath = `${sessionUser.id}/${Date.now()}-${randomPart}.${ext}`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { upsert: false, cacheControl: "3600" });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data && data.publicUrl ? data.publicUrl : null;
  }
  async function getUsername(userId) {
    const { data } = await client
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    return data && data.username ? data.username : "member";
  }

  async function loadUpdatesFromSupabase() {
    const updatesList = document.getElementById("updates-list");
    if (!updatesList) return;

    const { data: posts, error } = await client
      .from("posts")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      updatesList.innerHTML = '<div class="empty-state">Could not load updates from Supabase.</div>';
      return;
    }

    if (!posts || !posts.length) {
      updatesList.innerHTML = '<div class="empty-state">No updates yet.</div>';
      return;
    }

    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const nameMap = {};
    for (const id of userIds) {
      nameMap[id] = await getUsername(id);
    }

    updatesList.innerHTML = posts
      .map((post) => {
        const parsed = parsePostContent(post.content, post.created_at);
        const imageSrc = parsed.imageUrl || parsed.imageData || null;
        const imageHtml = imageSrc
          ? `<img src="${imageSrc}" class="update-image" alt="Update image">`
          : "";
        return `
          <div class="update-entry" data-id="${post.id}">
            <span class="update-date">${htmlEscape(parsed.date)} - ${htmlEscape(nameMap[post.user_id] || parsed.username)}</span>
            <br>
            ${htmlEscape(parsed.text).replace(/\n/g, "<br>")}
            ${imageHtml}
          </div>
        `;
      })
      .join("");
  }

  async function addUpdateSupabase() {
    if (!sessionUser) {
      alert("Please sign in on the login page first.");
      return;
    }

    const dateInput = document.getElementById("update-date");
    const textInput = document.getElementById("update-text");
    const imageInput = document.getElementById("update-image");
    const preview = document.getElementById("image-preview-container");

    const date = dateInput ? dateInput.value.trim() : "";
    const text = textInput ? textInput.value.trim() : "";
    if (!date || !text) {
      alert("Please fill in both date and update text!");
      return;
    }

    const ok = await ensureProfile();
    if (!ok) {
      alert("Could not create your member profile yet. Please try logging out and back in.");
      return;
    }

    const username = await getUsername(sessionUser.id);
    const selectedFile = imageInput && imageInput.files ? imageInput.files[0] : null;
    let imageUrl = null;

    if (selectedFile) {
      try {
        imageUrl = await uploadPostImage(selectedFile);
      } catch (error) {
        alert(`Image upload failed: ${error.message}`);
        return;
      }
    }

    const payload = {
      date,
      text,
      imageUrl: imageUrl,
      imageData: null,
      username
    };

    const { error } = await client
      .from("posts")
      .insert({ user_id: sessionUser.id, content: JSON.stringify(payload) });

    if (error) {
      alert("Failed to post update: " + error.message);
      return;
    }

    if (dateInput) dateInput.value = "";
    if (textInput) textInput.value = "";
    if (imageInput) imageInput.value = "";
    if (preview) preview.innerHTML = "";
    window.currentImageData = null;

    await loadUpdatesFromSupabase();
    alert("Update posted!");
  }

  function disableLegacyAdmin() {
    const loginPanel = document.getElementById("login-panel");
    const adminPanel = document.getElementById("admin-panel");
    const adminControls = document.getElementById("admin-controls");

    if (loginPanel) loginPanel.style.display = "none";
    if (adminPanel) adminPanel.style.display = "block";
    if (adminControls) adminControls.style.display = "none";

    const title = adminPanel ? adminPanel.querySelector(".admin-title") : null;
    if (title) title.textContent = "Post Update (Signed-in Members Only)";
  }

  async function initBridge() {
    if (!window.supabase) return;

    if (SUPABASE_ANON_KEY === "YOUR-ANON-KEY") {
      setMessage("join-message", "Set SUPABASE_ANON_KEY in supabase-bridge.js");
      return;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    window.addUpdate = addUpdateSupabase;
    window.loadUpdates = loadUpdatesFromSupabase;
    window.saveUpdates = function () {};

    disableLegacyAdmin();

    const signupForm = document.getElementById("signup-form");
    const signinForm = document.getElementById("signin-form");
    const signoutBtn = document.getElementById("signout-btn");

    if (signupForm) signupForm.addEventListener("submit", signUp);
    if (signinForm) signinForm.addEventListener("submit", signIn);
    if (signoutBtn) signoutBtn.addEventListener("click", signOut);

    await refreshSession();
    await loadMembersList();
    await loadUpdatesFromSupabase();

    client.auth.onAuthStateChange(async function () {
      await refreshSession();
      await loadMembersList();
    });
  }

  window.addEventListener("load", function () {
    initBridge();
  });
})();

