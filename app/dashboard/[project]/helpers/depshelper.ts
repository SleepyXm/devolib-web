export type PackageManager = 'npm' | 'pip' | 'yarn' | 'cargo';

export interface PackageInstallRequest {
  type: 'PACKAGE';
  operation: 'INSTALL_PACKAGES';
  pm: PackageManager;
  packages: string[];
  dev: boolean;
}

export function buildInstallPayload(
  pm: PackageManager,
  packages: { name: string; dev: boolean }[]
): PackageInstallRequest[] {
  const deps = packages.filter(p => !p.dev).map(p => p.name);
  const devs = packages.filter(p => p.dev).map(p => p.name);
  const payloads: PackageInstallRequest[] = [];
  if (deps.length) payloads.push({ type: 'PACKAGE', operation: 'INSTALL_PACKAGES', pm, packages: deps, dev: false });
  if (devs.length) payloads.push({ type: 'PACKAGE', operation: 'INSTALL_PACKAGES', pm, packages: devs, dev: true });
  return payloads;
}

export function validatePackageName(name: string): boolean {
  return /^[a-zA-Z0-9\-_@/.^~]+$/.test(name);
}

export interface QueuedPackage {
  name: string;
  dev: boolean;
}

export const PM_COMMANDS: Record<PackageManager, { install: string; dev: string | null }> = {
  npm:   { install: "npm install",  dev: "--save-dev" },
  pip:   { install: "pip install",  dev: null },
  yarn:  { install: "yarn add",     dev: "--dev" },
  cargo: { install: "cargo add",    dev: "--dev" },
};


export function buildPreview(pm: PackageManager, queue: QueuedPackage[]): string | null {
  if (!queue.length) return null;
  const c = PM_COMMANDS[pm];
  const deps = queue.filter(p => !p.dev).map(p => p.name);
  const devs = queue.filter(p => p.dev).map(p => p.name);
  const parts: string[] = [];
  if (deps.length) parts.push(`${c.install} ${deps.join(" ")}`);
  if (devs.length) parts.push(c.dev ? `${c.install} ${c.dev} ${devs.join(" ")}` : `${c.install} ${devs.join(" ")}`);
  return parts.join(" && ");
}