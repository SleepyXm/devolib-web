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