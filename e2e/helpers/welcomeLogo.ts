import type { Page } from "@playwright/test";

export function collectWelcomeLogoRequests(page: Page): Set<string> {
  const paths = new Set<string>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/hh_logo.png" || path === "/hh_logo_light.jpg") paths.add(path);
  });
  return paths;
}
