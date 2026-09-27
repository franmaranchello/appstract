export function vendorLaunchContext(href: string) {
  const url = new URL(href);
  const params = url.searchParams;
  const expected = {
    appId: "appstract.vendor-approval",
    appVersionId: "vendor-v1",
    fixtureId: "sample-vendors",
    mode: "sample",
    presentation: "baseline",
  };
  const hasLaunch = Object.keys(expected).some((key) => params.has(key));
  const invalid =
    hasLaunch &&
    Object.entries(expected).some(([key, value]) => params.get(key) !== value);
  let returnTo = new URL("/#apps", url.origin).href;
  if (!invalid && params.has("returnTo")) {
    try {
      const target = new URL(params.get("returnTo")!);
      // This bundled app only returns to its own Appstract origin and root.
      if (
        target.origin === url.origin &&
        target.pathname === "/" &&
        !target.username &&
        !target.password &&
        ["#apps", "#request", "#patterns", "#history", ""].includes(target.hash)
      ) {
        returnTo = target.href;
      }
    } catch {
      /* Keep the local catalog link. */
    }
  }
  return { returnTo, invalid };
}
