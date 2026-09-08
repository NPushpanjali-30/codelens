export interface ParsedDependency {
  name: string;
  version: string;
  dependencyType: "production" | "development";
  sourceFile: string;
}

/** Parses one package.json's dependencies/devDependencies into flat rows. */
export function parsePackageJson(content: string, sourceFile: string): ParsedDependency[] {
  let pkg: any;
  try {
    pkg = JSON.parse(content);
  } catch {
    return [];
  }

  const deps: ParsedDependency[] = [];
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    deps.push({ name, version: String(version), dependencyType: "production", sourceFile });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
    deps.push({ name, version: String(version), dependencyType: "development", sourceFile });
  }
  return deps;
}

/** Finds every package.json in the file list (supports monorepos) and parses each. */
export function collectDependencies(
  files: { filePath: string; content: string | null }[]
): ParsedDependency[] {
  const results: ParsedDependency[] = [];
  for (const file of files) {
    if (file.filePath.split("/").pop() !== "package.json" || !file.content) continue;
    results.push(...parsePackageJson(file.content, file.filePath));
  }
  return results;
}
