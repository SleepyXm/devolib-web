export const content = {
  brand: { name: "Devolib", product: "LIDE runtime" },
  nav: [
    { label: "Product", href: "/" },
    { label: "Architecture", href: "/architecture" },
    { label: "Plans", href: "/products" },
  ],
  landing: {
    eyebrow: "Container-native development environment",
    title: ["Devolib LIDE — your repository,", "running as a system."],
    description:
      "Import a full-stack project. LIDE discovers how it is built, starts it inside an isolated runtime, and exposes the working parts in one interface.",
    facts: ["Per-project container", "Automatic stack detection", "Live source model"],
    capabilities: [
      ["Understands the repository", "Pages, endpoints, roots, and schema come from source."],
      ["Runs the actual stack", "Services run inside an isolated project runtime."],
      ["Keeps it operable", "Terminal output and service state stream back live."],
    ],
  },
  preview: {
    project: "commerce-platform",
    files: ["app", "  api", "    projects.py", "    models.py", "frontend", "schema.sql"],
    services: ["Frontend :3000", "API :8000", "PostgreSQL :5432"],
    routes: [["POST", "/projects/import"], ["GET", "/projects/:id"], ["WS", "/terminal/:id"]],
    terminal: [
      "✓ stack detected  Next.js · FastAPI · PostgreSQL",
      "✓ routes mapped   12 pages · 28 endpoints",
      "✓ proxy attached  commerce-platform.localhost",
    ],
  },
  architecture: {
    eyebrow: "Under the interface",
    title: "A repository becomes an operable runtime.",
    description:
      "Import, scan, isolate, then control. These are implemented boundaries, not a simulated editor workflow.",
    stages: [
      ["01", "Import", "Repository URL, ownership, environment values, and project state."],
      ["02", "Discover", "Frameworks, pages, endpoints, service roots, and database choice."],
      ["03", "Run", "Project container, generated domain, and private service boundary."],
      ["04", "Control", "WebSocket terminal, service state, schema, and structured events."],
    ],
  },
  dashboard: {
    eyebrow: "Workspace overview",
    title: "Project runtimes",
    description: "Projects, detected services, and live container state.",
    nav: [
      ["Overview", "/dashboard"],
      ["Projects", "/dashboard/projects"],
      ["Interface", "/dashboard/designs"],
      ["Account", "/dashboard/profile"],
    ],
  },
  auth: {
    eyebrow: "Workspace access",
    title: "Continue to Devolib",
    description: "Open your projects, live services, and source model.",
  },
  products: {
    eyebrow: "Runtime plans",
    title: "Choose the capacity, not a different product.",
    description: "Every plan uses the same LIDE workspace and project model.",
  },
  projects: {
    eyebrow: "Project registry",
    title: "Repositories and runtimes",
    description: "Import an existing codebase or scaffold a new full-stack project.",
  },
  profile: {
    eyebrow: "Identity and integrations",
    title: "Account",
    description: "Manage project ownership, GitHub access, and active sessions.",
  },
  interface: {
    eyebrow: "UI registry",
    title: "One editable interface layer",
    description: "Copy, tokens, and callable compositions live in app/UI and are reused by every route.",
  },
} as const;
