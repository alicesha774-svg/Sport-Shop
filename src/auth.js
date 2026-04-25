const USER_STORAGE_KEY = "kinetic-archive-users";
const SESSION_STORAGE_KEY = "kinetic-archive-session";

const defaultUsers = [
  {
    name: "Demo Member",
    email: "demo@kineticarchive.com",
    password: "Archive123",
    createdAt: "2026-04-25T00:00:00.000Z",
  },
];

function toSessionUser(user) {
  return {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function loadUsers() {
  try {
    const rawUsers = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUsers) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUsers));
      return [...defaultUsers];
    }

    const parsedUsers = JSON.parse(rawUsers);
    if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUsers));
      return [...defaultUsers];
    }

    return parsedUsers;
  } catch (error) {
    console.error("Failed to read users from storage.", error);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUsers));
    return [...defaultUsers];
  }
}

function saveUsers(users) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function setCurrentUser(user) {
  const sessionUser = toSessionUser(user);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

function getCurrentUser() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    console.error("Failed to read session from storage.", error);
    return null;
  }
}

function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function login(email, password) {
  const users = loadUsers();
  const normalizedEmail = normalizeEmail(email);
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (!existingUser || existingUser.password !== password) {
    return {
      ok: false,
      message: "We couldn't match that email and password.",
    };
  }

  const sessionUser = setCurrentUser(existingUser);
  return { ok: true, user: sessionUser };
}

function register(name, email, password) {
  const users = loadUsers();
  const normalizedEmail = normalizeEmail(email);
  const alreadyExists = users.some((user) => user.email === normalizedEmail);

  if (alreadyExists) {
    return {
      ok: false,
      message: "That email is already registered. Try signing in instead.",
    };
  }

  const newUser = {
    name: name.trim(),
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, newUser]);
  const sessionUser = setCurrentUser(newUser);
  return { ok: true, user: sessionUser };
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect) {
    return "./menu.html";
  }

  const normalizedRedirect = redirect.replace(/^(\.\/|\/|html\/)+/i, "");
  if (/^[a-z0-9-]+\.html$/i.test(normalizedRedirect)) {
    return `./${normalizedRedirect}`;
  }

  return "./menu.html";
}

function redirectTo(url) {
  window.location.href = url;
}

function updateAuthDisplay() {
  const currentUser = getCurrentUser();
  const authNames = document.querySelectorAll("[data-auth-name]");
  const authLinks = document.querySelectorAll("[data-auth-link]");
  const authOnly = document.querySelectorAll("[data-auth-only]");
  const guestOnly = document.querySelectorAll("[data-guest-only]");

  authNames.forEach((node) => {
    node.textContent = currentUser ? currentUser.name : "Guest";
  });

  authLinks.forEach((node) => {
    const isIconLink = node.dataset.authIcon === "true";
    node.textContent = isIconLink ? "person" : currentUser ? "ACCOUNT" : "LOGIN";
    node.setAttribute("href", currentUser ? "./menu.html" : "./login.html");
    node.setAttribute("aria-label", currentUser ? "Open account menu" : "Open login page");
  });

  authOnly.forEach((node) => {
    node.classList.toggle("hidden", !currentUser);
  });

  guestOnly.forEach((node) => {
    node.classList.toggle("hidden", Boolean(currentUser));
  });
}

function attachLogoutHandlers() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      logout();
      updateAuthDisplay();
      redirectTo("./login.html");
    });
  });
}

function guardProtectedPage() {
  if (document.body.dataset.requiresAuth !== "true") {
    return;
  }

  const currentUser = getCurrentUser();
  if (currentUser) {
    return;
  }

  const currentPage = window.location.pathname.split("/").pop() || "menu.html";
  redirectTo(`./login.html?redirect=${encodeURIComponent(currentPage)}`);
}

function wireLoginPage() {
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");
  const status = document.querySelector("[data-auth-status]");
  const tabButtons = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");

  if (!loginForm || !registerForm || !status) {
    return;
  }

  const setStatus = (message, tone = "neutral") => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.authTab;

      tabButtons.forEach((tabButton) => {
        tabButton.dataset.active = tabButton.dataset.authTab === selectedTab ? "true" : "false";
      });

      panels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.authPanel !== selectedTab);
      });

      setStatus("Use the demo account or your saved profile to continue.");
    });
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!email.trim() || !password.trim()) {
      setStatus("Enter both your email and password.", "error");
      return;
    }

    const result = login(email, password);
    if (!result.ok) {
      setStatus(result.message, "error");
      return;
    }

    setStatus(`Welcome back, ${result.user.name}. Redirecting now...`, "success");
    updateAuthDisplay();
    window.setTimeout(() => redirectTo(getRedirectTarget()), 500);
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setStatus("Fill in your name, email, and password to create an account.", "error");
      return;
    }

    if (password.length < 8) {
      setStatus("Choose a password with at least 8 characters.", "error");
      return;
    }

    const result = register(name, email, password);
    if (!result.ok) {
      setStatus(result.message, "error");
      return;
    }

    setStatus(`Account ready, ${result.user.name}. Redirecting to your menu...`, "success");
    updateAuthDisplay();
    window.setTimeout(() => redirectTo("./menu.html"), 500);
  });
}

function hydrateMenuPage() {
  const menuGreeting = document.querySelector("[data-menu-greeting]");
  const joinedAt = document.querySelector("[data-menu-joined]");
  const emailNode = document.querySelector("[data-menu-email]");
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return;
  }

  if (menuGreeting) {
    menuGreeting.textContent = `Welcome back, ${currentUser.name}.`;
  }

  if (joinedAt) {
    joinedAt.textContent = new Date(currentUser.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (emailNode) {
    emailNode.textContent = currentUser.email;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  guardProtectedPage();
  updateAuthDisplay();
  attachLogoutHandlers();
  wireLoginPage();
  hydrateMenuPage();
});
