import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { appCatalog } from "./catalog";
import { createCatalogApp } from "./domain";
import { patterns, ledger } from "./data";
import { getDiscovery } from "./discovery";
import { STORAGE_KEY } from "./storage";

vi.mock("./discovery", () => ({
  discoveryRequest: vi.fn(async () => ({ configured: true })),
  startDiscovery: vi.fn(),
  getDiscovery: vi.fn(),
}));
vi.mock("./registry", async (importOriginal) => {
  const original = await importOriginal<typeof import("./registry")>();
  return {
    ...original,
    discoverApp: vi.fn(async (kind: "clash" | "vendor") => ({
      ...createCatalogApp(kind, appCatalog[kind].request),
      url: `https://appstract.example/apps/${kind}/`,
    })),
  };
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("location", {
    hash: "#history",
    origin: "https://appstract.example",
    pathname: "/",
    hostname: "appstract.example",
    assign: vi.fn(),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("parent discovery integration", () => {
  it("keeps simultaneously expanded prepared apps and their launch histories independent", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "View prepared examples" }));
    const clashRow = ledger.find((row) => row.id === "clash")!;
    const vendorRow = ledger.find((row) => row.id === "vendor")!;
    fireEvent.click(screen.getByRole("button", { name: `Expand plan: ${clashRow.title}` }));
    fireEvent.click(screen.getByRole("button", { name: `Expand plan: ${vendorRow.title}` }));
    const clashPlan = screen.getByRole("region", { name: `Plan for ${clashRow.title}` });
    const vendorPlan = screen.getByRole("region", { name: `Plan for ${vendorRow.title}` });
    await within(clashPlan).findByText("Clash detection");
    await within(vendorPlan).findByText("Vendor approval");

    fireEvent.click(within(vendorPlan).getByRole("button", { name: "Open app" }));
    let state = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(state.activeKind).toBe("vendor");
    expect(state.events.at(-1)).toMatchObject({
      appId: appCatalog.vendor.appId,
      versionId: "vendor-v1",
      person: "Dana Whitfield",
    });
    expect(new URL(vi.mocked(location.assign).mock.calls[0][0].toString()).searchParams.get("appId")).toBe(appCatalog.vendor.appId);

    // Changing the active app must not change the other expanded row's binding.
    fireEvent.click(within(screen.getByRole("region", { name: `Plan for ${clashRow.title}` })).getByRole("button", { name: "Open app" }));
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(state.activeKind).toBe("clash");
    expect(state.events.at(-1)).toMatchObject({
      appId: appCatalog.clash.appId,
      versionId: "clash-v1",
      person: "Priya Raghunathan",
    });
    expect(state.events).toHaveLength(2);
    expect(state.apps.vendor.id).toBe(appCatalog.vendor.appId);
    expect(state.apps.clash.id).toBe(appCatalog.clash.appId);
  });

  it("renders verified QM evidence for generated IDs without substituting prepared metrics", async () => {
    const vendor = { ...patterns.find((pattern) => pattern.id === "vendor")!, id: "qm-vendor-review-9", title: "Recurring vendor approval review" };
    sessionStorage.setItem("appstract-qm-discovery-job", "saved-qm-run");
    location.hash = "#patterns";
    vi.mocked(getDiscovery).mockResolvedValue({
      id: "saved-qm-run", status: "complete", sourceIds: [vendor.sourceId],
      completedSources: 1, totalSources: 1, patterns: [vendor], runs: [],
      startedAt: "2026-09-27T00:00:00Z",
    });
    render(<App />);
    await screen.findByRole("heading", { name: "1 recurring workflows" });
    expect(screen.getByRole("heading", { name: vendor.title })).toBeInTheDocument();
    expect(screen.getByText(`“${vendor.evidence[0].quote}”`)).toBeInTheDocument();
    await screen.findByText("Vendor approval");
    expect(screen.queryByText("Chat time")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open app" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).events.at(-1)).toMatchObject({ appId: appCatalog.vendor.appId, person: "Dana Whitfield" }));
  });
});
