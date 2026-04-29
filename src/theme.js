const THEME_STORAGE_KEY = "kinetic-archive-theme";
const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function readStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
  } catch (error) {
    console.error("Failed to read theme from storage.", error);
    return null;
  }
}

function getPreferredTheme() {
  return readStoredTheme() || (themeMediaQuery.matches ? "dark" : "light");
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(normalizedTheme);
  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;

  return normalizedTheme;
}

function updateThemeToggles(theme) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const nextLabel = nextTheme === "dark" ? "Dark mode" : "Light mode";
  const nextIcon = nextTheme === "dark" ? "dark_mode" : "light_mode";

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const icon = button.querySelector("[data-theme-icon]");
    const label = button.querySelector("[data-theme-label]");

    button.setAttribute("aria-label", `Switch to ${nextLabel.toLowerCase()}`);
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");

    if (icon) {
      icon.textContent = nextIcon;
    }

    if (label) {
      label.textContent = nextLabel;
    }
  });
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to storage.", error);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  persistTheme(nextTheme);
  const appliedTheme = applyTheme(nextTheme);
  updateThemeToggles(appliedTheme);
}

applyTheme(getPreferredTheme());

document.addEventListener("DOMContentLoaded", () => {
  const appliedTheme = applyTheme(getPreferredTheme());
  updateThemeToggles(appliedTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });
});

if (typeof themeMediaQuery.addEventListener === "function") {
  themeMediaQuery.addEventListener("change", (event) => {
    if (readStoredTheme()) {
      return;
    }

    const appliedTheme = applyTheme(event.matches ? "dark" : "light");
    updateThemeToggles(appliedTheme);
  });
}
