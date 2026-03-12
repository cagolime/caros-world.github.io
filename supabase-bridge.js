(function () {
  const SUPABASE_URL = "https://itedssjogaktidqmwcny.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZWRzc2pvZ2FrdGlkcW13Y255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjQ5NDYsImV4cCI6MjA4Njk0MDk0Nn0.e4m1Lvzk6I8sr3sYRLCyn7_wfLl0fWEhuhTVVQeLFVc";
  const STORAGE_BUCKET = "caros-world-bucket";
  const CAROLINE_USER_ID = "65550070-0da6-44b4-8b53-7634aa3509eb";
  const CAROLINE_EMAIL = "caroline.wilson.hk@gmail.com";

  let client = null;
  let sessionUser = null;
  let lastProfileError = "";
  let hasLoginEmailColumn = true;
  let updatesFilter = "world";
  let openReplyPostId = null;
  let hasRepliesTable = true;

  function htmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractUrls(text) {
    return String(text || "").match(/https?:\/\/[^\s<]+/g) || [];
  }

  function cleanUrlText(url) {
    return String(url || "").replace(/[),.!?]+$/, "");
  }

  function getYouTubeId(rawUrl) {
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "youtu.be") {
        return url.pathname.replace(/\//g, "") || "";
      }
      if (host === "youtube.com" || host === "m.youtube.com") {
        if (url.pathname === "/watch") return url.searchParams.get("v") || "";
        if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || "";
        if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || "";
      }
    } catch (_error) {
      return "";
    }
    return "";
  }

  function getLinkPreviewHtml(rawUrl) {
    const safeUrl = cleanUrlText(rawUrl);
    if (!safeUrl) return "";

    try {
      const url = new URL(safeUrl);
      const host = url.hostname.replace(/^www\./, "");
      const youtubeId = getYouTubeId(safeUrl);
      const title = youtubeId
        ? "YouTube video"
        : (url.pathname && url.pathname !== "/" ? decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || host) : host)
            .replace(/[-_]+/g, " ")
            .slice(0, 80);
      const thumbHtml = youtubeId
        ? `<img src="https://img.youtube.com/vi/${htmlEscape(youtubeId)}/hqdefault.jpg" alt="Link preview image" class="link-preview-thumb">`
        : "";

      return `
        <a class="link-preview" href="${htmlEscape(safeUrl)}" target="_blank" rel="noopener noreferrer">
          ${thumbHtml}
          <span class="link-preview-site">${htmlEscape(host)}</span>
          <span class="link-preview-title">${htmlEscape(title || host)}</span>
          <span class="link-preview-url">${htmlEscape(safeUrl)}</span>
        </a>
      `;
    } catch (_error) {
      return "";
    }
  }

  function formatPostText(text) {
    const safeText = htmlEscape(text || "");
    const linkified = safeText.replace(/(https?:\/\/[^\s<]+)/g, function (match) {
      const cleanMatch = cleanUrlText(match);
      return `<a href="${htmlEscape(cleanMatch)}" target="_blank" rel="noopener noreferrer">${htmlEscape(cleanMatch)}</a>`;
    });
    const previews = [...new Set(extractUrls(text).map(cleanUrlText))]
      .map(getLinkPreviewHtml)
      .filter(Boolean)
      .join("");
    return `${linkified.replace(/\n/g, "<br>")}${previews}`;
  }

  function setMessage(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatTimestamp(value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch (_error) {
      return "";
    }
  }

  function isMissingRepliesTable(error) {
    const msg = String(error?.message || "").toLowerCase();
    return msg.includes("replies") && (msg.includes("does not exist") || msg.includes("could not find") || msg.includes("relation"));
  }

  function renderUpdatesFilter() {
    const worldBtn = document.getElementById("updates-filter-world");
    const carosBtn = document.getElementById("updates-filter-caros");
    if (!worldBtn || !carosBtn) return;
    worldBtn.classList.toggle("is-active", updatesFilter === "world");
    carosBtn.classList.toggle("is-active", updatesFilter === "caros");
  }

  async function setUpdatesFilter(mode) {
    updatesFilter = mode === "caros" ? "caros" : "world";
    renderUpdatesFilter();
    await loadUpdatesFromSupabase();
  }

  function usernameFromEmail(email) {
    const base = String(email || "member").split("@")[0];
    const normalized = base.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);
    return normalized.length >= 3 ? normalized : `user_${Date.now()}`;
  }

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 24);
  }

  function isCarolineUser() {
    if (!sessionUser) return false;
    const email = String(sessionUser.email || "").toLowerCase();
    return sessionUser.id === CAROLINE_USER_ID || email === CAROLINE_EMAIL;
  }

  function canDeletePost(postUserId) {
    if (!sessionUser) return false;
    return sessionUser.id === postUserId || isCarolineUser();
  }

  function renderRepliesHtml(postId, replies, nameMap) {
    const items = (replies || [])
      .map(function (reply) {
        const replyName = htmlEscape(nameMap[reply.user_id] || "member");
        return `
          <div class="reply-entry" data-reply-id="${reply.id}">
            <div class="reply-meta">${replyName} - ${htmlEscape(formatTimestamp(reply.created_at))}</div>
            <div>${formatPostText(reply.content)}</div>
          </div>
        `;
      })
      .join("");

    const showForm = openReplyPostId === String(postId);
    const formHtml = showForm
      ? `
        <div class="reply-form">
          <textarea id="reply-text-${postId}" placeholder="Write a reply..."></textarea>
          <button type="button" onclick="submitReply('${postId}', this)">Post Reply</button>
        </div>
      `
      : "";
    const actionLabel = showForm ? "Close" : "Reply";
    const hasContent = Boolean(items || formHtml);
    const listHtml = hasContent
      ? `
        <div class="reply-list">
          ${items}
          ${formHtml}
        </div>
      `
      : "";

    return `
      <div class="reply-tools">
        <button type="button" class="reply-toggle" onclick="toggleReplyForm('${postId}')">${actionLabel}</button>
      </div>
      ${listHtml}
    `;
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

  function pendingUsernameKey(email) {
    return `pending_username_${String(email || "").toLowerCase()}`;
  }

  function savePendingUsername(email, username) {
    if (!email || !username) return;
    localStorage.setItem(pendingUsernameKey(email), username);
  }

  function getPendingUsername(email) {
    if (!email) return "";
    return localStorage.getItem(pendingUsernameKey(email)) || "";
  }

  function clearPendingUsername(email) {
    if (!email) return;
    localStorage.removeItem(pendingUsernameKey(email));
  }

  function isMissingLoginEmailColumn(error) {
    const msg = String(error?.message || "").toLowerCase();
    return msg.includes("login_email") && (msg.includes("could not find") || msg.includes("column"));
  }

  async function upsertProfileRow(id, username, emailLower) {
    if (hasLoginEmailColumn) {
      const firstTry = await client
        .from("profiles")
        .upsert({ id, username, login_email: emailLower }, { onConflict: "id" });
      if (!firstTry.error) return firstTry;
      if (!isMissingLoginEmailColumn(firstTry.error)) return firstTry;
      hasLoginEmailColumn = false;
    }

    return client
      .from("profiles")
      .upsert({ id, username }, { onConflict: "id" });
  }

  async function ensureProfile(preferredUsername) {
    if (!sessionUser) return false;
    lastProfileError = "";

    const { data: existing, error: existingError } = await client
      .from("profiles")
      .select("id, username")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (existingError) {
      lastProfileError = existingError.message || "Could not read profile.";
      return false;
    }

    if (existing && existing.username) {
      const preferredClean = normalizeUsername(preferredUsername);
      const existingName = String(existing.username || "");
      const fallbackName = usernameFromEmail(sessionUser.email);
      const shouldReplaceFallback =
        preferredClean &&
        preferredClean.length >= 3 &&
        preferredClean !== existingName &&
        (existingName === "member" || existingName === fallbackName);

      if (!shouldReplaceFallback) return true;

      const replaceAttempts = [
        preferredClean,
        uniqueUsernameSeed(preferredClean),
        uniqueUsernameSeed(fallbackName)
      ];

      for (const candidate of replaceAttempts) {
        if (!candidate || candidate.length < 3) continue;
        const { error } = await upsertProfileRow(
          sessionUser.id,
          candidate,
          String(sessionUser.email || "").toLowerCase()
        );
        if (!error) {
          clearPendingUsername(sessionUser.email);
          return true;
        }
        lastProfileError = error.message || "Could not update profile username.";
      }

      return false;
    }

    const resolvedPreferred =
      preferredUsername || getPendingUsername(sessionUser.email) || usernameFromEmail(sessionUser.email);

    const firstChoice = normalizeUsername(resolvedPreferred);

    const attempts = [firstChoice, uniqueUsernameSeed(firstChoice), uniqueUsernameSeed(usernameFromEmail(sessionUser.email))];

    for (const candidate of attempts) {
      if (!candidate || candidate.length < 3) continue;
      const { error } = await upsertProfileRow(
        sessionUser.id,
        candidate,
        String(sessionUser.email || "").toLowerCase()
      );
      if (!error) {
        clearPendingUsername(sessionUser.email);
        return true;
      }
      lastProfileError = error.message || "Could not create profile.";
    }

    return false;
  }

  async function refreshSession() {
    const { data } = await client.auth.getSession();
    sessionUser = data.session ? data.session.user : null;

    if (sessionUser) {
      await ensureProfile();
      setMessage("login-message", `Signed in as ${sessionUser.email}`);
    }
    renderPostComposerState();
    await renderAccountPanel();
    await renderSessionBar();
  }

  function renderPostComposerState() {
    const adminPanel = document.getElementById("admin-panel");
    if (!adminPanel) return;

    const title = adminPanel.querySelector(".admin-title");
    const prompt = document.getElementById("post-auth-prompt");
    const composer = document.getElementById("post-composer-form");

    if (sessionUser) {
      if (title) title.textContent = "Post Update (Signed-in Members Only)";
      if (prompt) prompt.style.display = "none";
      if (composer) composer.style.display = "block";
      return;
    }

    if (title) title.textContent = "Login Required to Post";
    if (prompt) prompt.style.display = "block";
    if (composer) composer.style.display = "none";
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
    const displayName = username !== "member" ? username : usernameFromEmail(sessionUser.email);
    text.textContent = `Logged in as: ${displayName}`;
    bar.style.display = "block";
    logoutBtn.onclick = signOut;
  }

  async function renderAccountPanel() {
    const currentEl = document.getElementById("account-current-username");
    const usernameInput = document.getElementById("account-username");
    if (!currentEl || !usernameInput) return;

    if (!sessionUser) {
      currentEl.textContent = "Current username: not logged in";
      usernameInput.value = "";
      return;
    }

    const username = await getUsername(sessionUser.id);
    const displayName = username !== "member" ? username : usernameFromEmail(sessionUser.email);
    currentEl.textContent = `Current username: ${displayName}`;
    usernameInput.value = displayName;
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

    // Save before auth call so onAuthStateChange handlers can use it immediately.
    savePendingUsername(email, username);

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      clearPendingUsername(email);
      setMessage("join-message", error.message);
      return;
    }

    await refreshSession();

    // If no active session after signup, ask user to log in (email confirmation may be off or delayed).
    if (!sessionUser) {
      const createdEmail = data?.user?.email || email;
      setMessage(
        "join-message",
        `Account created for ${createdEmail}. Please log in now.`
      );
      return;
    }

    const profileOk = await ensureProfile(username);
    if (!profileOk) {
      setMessage(
        "join-message",
        `Account created, but profile setup failed: ${lastProfileError || "unknown error"}`
      );
      return;
    }

    await loadMembersList();
    await loadUpdatesFromSupabase();

    setMessage("join-message", "Signup complete. You are signed in.");
    setMessage("login-message", "Signed in.");
    if (typeof window.showPage === "function") {
      window.showPage("home");
    }
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
    const profileOk = await ensureProfile();
    if (!profileOk) {
      setMessage("login-message", `Signed in, but profile setup failed: ${lastProfileError || "unknown error"}`);
    }
    await loadMembersList();
    await loadUpdatesFromSupabase();
    if (profileOk) {
      setMessage("login-message", "Signed in.");
    }
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
    setMessage("account-message", "");
    await refreshSession();
    await loadMembersList();
    await loadUpdatesFromSupabase();
    if (typeof window.showPage === "function") {
      window.showPage("home");
    }
  }

  async function updateAccount(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    setMessage("account-message", "");
    const submitBtn = document.getElementById("account-submit-btn");
    if (submitBtn) submitBtn.disabled = true;
    setMessage("account-message", "Updating...");

    try {
      if (!sessionUser) {
        setMessage("account-message", "Please log in first.");
        return;
      }

      const username = (document.getElementById("account-username")?.value || "").trim();
      const password = document.getElementById("account-password")?.value || "";

      if (!username || !password) {
        setMessage("account-message", "Fill in username and current password.");
        return;
      }

      if (username.length < 3 || username.length > 24) {
        setMessage("account-message", "Username must be 3-24 characters.");
        return;
      }

      const currentUsername = await getUsername(sessionUser.id);
      if (username === currentUsername) {
        setMessage("account-message", "That is already your username.");
        return;
      }

      const { data: takenBy, error: takenError } = await client
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (takenError) {
        setMessage("account-message", `Could not validate username availability: ${takenError.message}`);
        return;
      }

      if (takenBy && takenBy.id !== sessionUser.id) {
        setMessage("account-message", "That username is already taken.");
        return;
      }

      const email = String(sessionUser.email || "").toLowerCase();
      const { error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) {
        setMessage("account-message", "Password is incorrect.");
        return;
      }

      const { error: updateError } = await upsertProfileRow(sessionUser.id, username, email);

      if (updateError) {
        if (String(updateError.message || "").toLowerCase().includes("duplicate")) {
          setMessage("account-message", "That username is already taken.");
          return;
        }
        setMessage("account-message", `Could not update username: ${updateError.message}`);
        return;
      }

      const passwordEl = document.getElementById("account-password");
      if (passwordEl) passwordEl.value = "";
      setMessage("account-message", "Username updated.");
      await refreshSession();
      await loadMembersList();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function updateAccountPassword(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    setMessage("account-password-message", "");

    const submitBtn = document.getElementById("account-password-submit-btn");
    if (submitBtn) submitBtn.disabled = true;
    setMessage("account-password-message", "Updating password...");

    try {
      if (!sessionUser) {
        setMessage("account-password-message", "Please log in first.");
        return;
      }

      const newPassword = document.getElementById("account-new-password")?.value || "";
      const confirmPassword = document.getElementById("account-confirm-password")?.value || "";

      if (!newPassword || !confirmPassword) {
        setMessage("account-password-message", "Fill in both password fields.");
        return;
      }

      if (newPassword.length < 8) {
        setMessage("account-password-message", "Password must be at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage("account-password-message", "Passwords do not match.");
        return;
      }

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage("account-password-message", `Could not update password: ${error.message}`);
        return;
      }

      const newEl = document.getElementById("account-new-password");
      const confirmEl = document.getElementById("account-confirm-password");
      if (newEl) newEl.value = "";
      if (confirmEl) confirmEl.value = "";
      setMessage("account-password-message", "Password updated.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
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

    if (error) {
      if (isMissingLoginEmailColumn(error)) {
        hasLoginEmailColumn = false;
        setMessage("login-message", "Username login is unavailable right now. Please log in with email.");
      }
      return null;
    }
    if (!data || !data.login_email) return null;
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

    const visiblePosts = (posts || []).filter((post) => {
      if (updatesFilter !== "caros") return true;
      return post.user_id === CAROLINE_USER_ID;
    });

    if (!visiblePosts.length) {
      updatesList.innerHTML = '<div class="empty-state">No updates yet.</div>';
      return;
    }

    const userIds = [...new Set(visiblePosts.map((p) => p.user_id))];
    const nameMap = {};
    for (const id of userIds) {
      nameMap[id] = await getUsername(id);
    }

    const postIds = visiblePosts.map((post) => post.id);
    let replies = [];
    if (postIds.length) {
      if (hasRepliesTable) {
        const { data: repliesData, error: repliesError } = await client
          .from("replies")
          .select("id, post_id, user_id, content, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });
        if (repliesError) {
          if (isMissingRepliesTable(repliesError)) {
            hasRepliesTable = false;
          }
        } else {
          replies = repliesData || [];
        }
      }
    }

    const replyUserIds = [...new Set(replies.map((reply) => reply.user_id).filter(Boolean))];
    for (const id of replyUserIds) {
      if (!nameMap[id]) nameMap[id] = await getUsername(id);
    }

    const repliesByPostId = {};
    for (const reply of replies) {
      const key = String(reply.post_id);
      if (!repliesByPostId[key]) repliesByPostId[key] = [];
      repliesByPostId[key].push(reply);
    }

    updatesList.innerHTML = visiblePosts
      .map((post) => {
        const parsed = parsePostContent(post.content, post.created_at);
        const displayName = htmlEscape(nameMap[post.user_id] || parsed.username);
        const adminBadge = post.user_id === CAROLINE_USER_ID
          ? ' <span style="display:inline-block;margin-left:6px;font-size:8px;line-height:1;padding:2px 4px;border:1px solid #0a44a3;background:rgba(10,68,163,0.08);letter-spacing:0.4px;vertical-align:baseline;position:relative;top:-1px;">ADMIN</span>'
          : "";
        const imageSrc = parsed.imageUrl || parsed.imageData || null;
        const imageHtml = imageSrc
          ? `<img src="${imageSrc}" class="update-image" alt="Update image">`
          : "";
        const deleteHtml = canDeletePost(post.user_id)
          ? `<button class="delete-update" onclick="deleteSupabasePost('${post.id}','${post.user_id}', this)">Delete</button>`
          : "";
        return `
          <div class="update-entry" data-id="${post.id}">
            <span class="update-date">${htmlEscape(parsed.date)} - ${displayName}${adminBadge}</span>
            ${deleteHtml}
            <br>
            ${formatPostText(parsed.text)}
            ${imageHtml}
            ${hasRepliesTable ? renderRepliesHtml(post.id, repliesByPostId[String(post.id)] || [], nameMap) : ""}
          </div>
        `;
      })
      .join("");
  }

  async function submitReply(postId, buttonEl) {
    if (!sessionUser) {
      alert("Please sign in first.");
      return;
    }

    const textEl = document.getElementById(`reply-text-${postId}`);
    const replyText = textEl ? textEl.value.trim() : "";
    if (!replyText) {
      alert("Please enter a reply.");
      return;
    }

    const btn = buttonEl || null;
    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent || "Post Reply";
      btn.textContent = "Posting...";
    }

    try {
      if (!hasRepliesTable) {
        alert("Replies are not enabled yet. Run the new Supabase SQL first.");
        return;
      }

      const ok = await ensureProfile();
      if (!ok) {
        alert(`Could not create your member profile: ${lastProfileError || "unknown error"}`);
        return;
      }

      const { error } = await client
        .from("replies")
        .insert({ post_id: postId, user_id: sessionUser.id, content: replyText });

      if (error) {
        if (isMissingRepliesTable(error)) {
          hasRepliesTable = false;
          alert("Replies are not enabled yet. Run the new Supabase SQL first.");
          return;
        }
        alert(`Failed to post reply: ${error.message}`);
        return;
      }

      openReplyPostId = String(postId);
      await loadUpdatesFromSupabase();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || "Post Reply";
      }
    }
  }

  async function toggleReplyForm(postId) {
    if (!sessionUser) {
      if (typeof window.showPage === "function") window.showPage("login");
      return;
    }

    openReplyPostId = openReplyPostId === String(postId) ? null : String(postId);
    await loadUpdatesFromSupabase();
  }

  async function deletePostSupabase(postId, postUserId, buttonEl) {
    if (!sessionUser) {
      alert("Please sign in first.");
      return;
    }
    if (!canDeletePost(postUserId)) {
      alert("You can only delete your own posts.");
      return;
    }
    if (!confirm("Delete this post?")) return;

    const btn = buttonEl || null;
    const entry = btn ? btn.closest(".update-entry") : null;
    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent || "Delete";
      btn.textContent = "Deleting...";
    }
    if (entry) entry.style.opacity = "0.6";

    try {
      // Refresh auth state before destructive action in case token is stale.
      await refreshSession();

      let result = await client
        .from("posts")
        .delete()
        .eq("id", postId)
        .select("id");

      if (result.error && String(result.error.message || "").toLowerCase().includes("jwt")) {
        await refreshSession();
        result = await client
          .from("posts")
          .delete()
          .eq("id", postId)
          .select("id");
      }

      if (result.error) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || "Delete";
        }
        if (entry) entry.style.opacity = "1";
        alert(`Could not delete post: ${result.error.message}`);
        return;
      }

      const deletedCount = Array.isArray(result.data) ? result.data.length : 0;
      if (deletedCount === 0) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || "Delete";
        }
        if (entry) entry.style.opacity = "1";
        alert("Could not delete post: blocked by permissions (RLS) or post not found.");
        return;
      }

      if (entry) entry.remove();
      await loadUpdatesFromSupabase();
    } catch (error) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || "Delete";
      }
      if (entry) entry.style.opacity = "1";
      const message = String(error?.message || error || "");
      alert(`Could not delete post: ${message || "Network request failed. Check connection and try again."}`);
    }
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

    const providedDate = dateInput ? dateInput.value.trim() : "";
    const date = providedDate || new Date().toLocaleDateString();
    const text = textInput ? textInput.value.trim() : "";
    if (!text) {
      alert("Please enter update text.");
      return;
    }

    const ok = await ensureProfile();
    if (!ok) {
      alert(`Could not create your member profile: ${lastProfileError || "unknown error"}`);
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
    renderPostComposerState();
  }

  async function initBridge() {
    if (!window.supabase) return;

    if (SUPABASE_ANON_KEY === "YOUR-ANON-KEY") {
      setMessage("join-message", "Set SUPABASE_ANON_KEY in supabase-bridge.js");
      return;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    window.addUpdate = addUpdateSupabase;
    window.deleteSupabasePost = deletePostSupabase;
    window.submitReply = submitReply;
    window.toggleReplyForm = toggleReplyForm;
    window.loadUpdates = loadUpdatesFromSupabase;
    window.saveUpdates = function () {};
    window.updateAccount = updateAccount;
    window.updateAccountPassword = updateAccountPassword;
    window.logout = signOut;

    disableLegacyAdmin();

    const signupForm = document.getElementById("signup-form");
    const signinForm = document.getElementById("signin-form");
    const signoutBtn = document.getElementById("signout-btn");
    const accountForm = document.getElementById("account-form");
    const accountPasswordForm = document.getElementById("account-password-form");
    const worldFilterBtn = document.getElementById("updates-filter-world");
    const carosFilterBtn = document.getElementById("updates-filter-caros");

    if (signupForm) signupForm.addEventListener("submit", signUp);
    if (signinForm) signinForm.addEventListener("submit", signIn);
    if (signoutBtn) signoutBtn.addEventListener("click", signOut);
    if (accountForm) accountForm.addEventListener("submit", updateAccount);
    if (accountPasswordForm) accountPasswordForm.addEventListener("submit", updateAccountPassword);
    if (worldFilterBtn) worldFilterBtn.addEventListener("click", () => setUpdatesFilter("world"));
    if (carosFilterBtn) carosFilterBtn.addEventListener("click", () => setUpdatesFilter("caros"));
    renderUpdatesFilter();

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
