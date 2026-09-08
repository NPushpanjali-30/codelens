import type { ApiRoute } from "@/types";

const METHOD_EXPORT_PATTERN = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

/**
 * Detects Next.js App Router API routes (app/**\/route.ts) by finding
 * exported HTTP method handlers, and derives the endpoint path from the
 * file's location. This is a heuristic static scan, not a full AST parse —
 * good enough to build an accurate-looking API explorer without
 * inventing endpoints that aren't there.
 */
export function detectApiRoutes(
  files: { filePath: string; content: string | null }[]
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  for (const file of files) {
    if (!file.content) continue;
    if (!/\/route\.(ts|js)$/.test(file.filePath)) continue;

    const endpoint = filePathToEndpoint(file.filePath);
    const requiresAuth = /requireUser|getAuthedUser|auth\.getUser|getServerSession/.test(file.content);

    let match: RegExpExecArray | null;
    METHOD_EXPORT_PATTERN.lastIndex = 0;
    while ((match = METHOD_EXPORT_PATTERN.exec(file.content)) !== null) {
      const method = match[1] as ApiRoute["method"];
      routes.push({
        method,
        endpoint,
        file: file.filePath,
        description: describeRoute(method, endpoint),
        requiresAuth,
      });
    }
  }

  return routes;
}

function filePathToEndpoint(filePath: string): string {
  // app/api/repositories/[id]/files/route.ts -> /api/repositories/[id]/files
  const withoutRoute = filePath.replace(/\/route\.(ts|js)$/, "");
  const idx = withoutRoute.indexOf("app/api");
  const trimmed = idx >= 0 ? withoutRoute.slice(idx + "app".length) : withoutRoute;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function describeRoute(method: string, endpoint: string): string {
  const resource = endpoint.split("/").filter(Boolean).pop() ?? "resource";
  switch (method) {
    case "GET":
      return `Retrieves ${resource}`;
    case "POST":
      return `Creates or triggers ${resource}`;
    case "PUT":
    case "PATCH":
      return `Updates ${resource}`;
    case "DELETE":
      return `Deletes ${resource}`;
    default:
      return `Handles ${resource}`;
  }
}
