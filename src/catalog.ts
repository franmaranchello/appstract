export const appCatalog = {
  clash: {
    appId: "appstract.clash-check",
    name: "Clash detection",
    fixtureId: "sample-building",
    baselineVersionId: "clash-v1",
    presentations: ["baseline", "non-color"],
    summary: "Sample model checks",
    description: "Check structural and mechanical elements for clashes.",
    detail: "3D model, clash list and element details",
    request: "Run clash detection on the sample model.",
    person: "Priya Raghunathan",
  },
  vendor: {
    appId: "appstract.vendor-approval",
    name: "Vendor approval",
    fixtureId: "sample-vendors",
    baselineVersionId: "vendor-v1",
    presentations: ["baseline"],
    summary: "Vendor review workflow",
    description:
      "Review vendor intake, required documents and security checks before approval.",
    detail: "Vendor portfolio, evidence checklist and approval history",
    request: "Review vendor documents and security checks for approval.",
    person: "Dana Whitfield",
  },
} as const;

export type AppKind = keyof typeof appCatalog;

export function appKindForId(id: string): AppKind | undefined {
  return (Object.keys(appCatalog) as AppKind[]).find(
    (kind) => appCatalog[kind].appId === id,
  );
}

export function requestAppKind(request: string, current: AppKind): AppKind {
  if (/\bvendors?\b/i.test(request)) return "vendor";
  if (
    /\bclash(?:es)?\b|\bsample\s+(?:building|model|geometry)\b/i.test(request)
  )
    return "clash";
  return current;
}
