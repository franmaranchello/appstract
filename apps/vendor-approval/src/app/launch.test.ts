import { expect, it } from "vitest";
import { vendorLaunchContext } from "./launch";

const root = "https://appstract.example/apps/vendor-approval/";
const params = new URLSearchParams({
  appId: "appstract.vendor-approval",
  appVersionId: "vendor-v1",
  fixtureId: "sample-vendors",
  mode: "sample",
  presentation: "baseline",
  returnTo: "https://appstract.example/#request",
});
it("keeps a validated parent return URL across vendor routes and refresh", () => {
  for (const route of [
    "/vendors",
    "/vendors/new",
    "/vendors/threshold-doors",
  ]) {
    expect(vendorLaunchContext(`${root}?${params}#${route}`)).toEqual({
      returnTo: "https://appstract.example/#request",
      invalid: false,
    });
  }
});
it("blocks unsafe and foreign return targets", () => {
  for (const target of [
    "javascript:alert(1)",
    "https://attacker.example/",
    "https://appstract.example/foreign",
    "https://user:password@appstract.example/",
    "https://appstract.example/#foreign",
  ]) {
    const query = new URLSearchParams(params);
    query.set("returnTo", target);
    expect(vendorLaunchContext(`${root}?${query}`).returnTo).toBe(
      "https://appstract.example/#apps",
    );
  }
});
it("unsupported app contracts show an invalid launch and use a safe catalog return", () => {
  const query = new URLSearchParams(params);
  query.set("appVersionId", "clash-v2");
  expect(vendorLaunchContext(`${root}?${query}`)).toEqual({
    returnTo: "https://appstract.example/#apps",
    invalid: true,
  });
  expect(vendorLaunchContext(root)).toEqual({
    returnTo: "https://appstract.example/#apps",
    invalid: false,
  });
});
