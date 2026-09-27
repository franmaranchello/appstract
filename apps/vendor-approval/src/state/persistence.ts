import type { Vendor } from "../domain/model";
import { createSeedVendors } from "../data/seed";

export const STORAGE_KEY = "bauhaus.vendor-demo.v1";

export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadVendors(storage?: Storage) {
  let raw: string | null;
  try {
    if (!storage) throw new Error("Browser storage unavailable");
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { vendors: createSeedVendors(), recovered: false, storageUnavailable: true };
  }
  if (!raw) return { vendors: createSeedVendors(), recovered: false, storageUnavailable: false };
  try {
    const vendors = JSON.parse(raw) as Vendor[];
    if (!Array.isArray(vendors)) throw new Error("Saved vendors must be an array");
    return { vendors, recovered: false, storageUnavailable: false };
  } catch {
    return { vendors: createSeedVendors(), recovered: true, storageUnavailable: false };
  }
}

export function saveVendors(storage: Storage | undefined, vendors: Vendor[]) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(vendors));
    return true;
  } catch {
    return false;
  }
}
