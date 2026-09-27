import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedVendors } from "../data/seed";
import type {
  DocumentState,
  SecurityResult,
  Vendor,
  VendorDraft,
} from "../domain/model";
import {
  addVendorNote,
  approveVendor,
  createVendor,
  rejectVendor,
  updateDocument as transitionDocument,
  updateSecurityCheck,
} from "../domain/workflow";
import { browserStorage, loadVendors, saveVendors } from "./persistence";

interface VendorStoreValue {
  vendors: Vendor[];
  recoveryNotice: boolean;
  storageUnavailable: boolean;
  addVendor(draft: VendorDraft): Vendor;
  updateDocument(vendorId: string, documentId: string, state: DocumentState): void;
  updateSecurity(vendorId: string, checkId: string, result: SecurityResult, note: string): void;
  addNote(vendorId: string, note: string): void;
  approve(vendorId: string): void;
  reject(vendorId: string, reason: string): void;
  resetDemo(): void;
}

const VendorStoreContext = createContext<VendorStoreValue | null>(null);

function now() {
  return new Date().toISOString();
}

export function VendorStoreProvider({
  children,
  storage: providedStorage,
}: {
  children: ReactNode;
  storage?: Storage;
}) {
  const storage = useMemo(() => providedStorage ?? browserStorage(), [providedStorage]);
  const initial = useMemo(() => loadVendors(storage), [storage]);
  const [vendors, setVendors] = useState(initial.vendors);
  const [recoveryNotice, setRecoveryNotice] = useState(initial.recovered);
  const [storageUnavailable, setStorageUnavailable] = useState(initial.storageUnavailable);

  useEffect(() => {
    // A failed read must not overwrite an existing portfolio we could not load.
    if (initial.storageUnavailable) return;
    setStorageUnavailable(!saveVendors(storage, vendors));
  }, [initial.storageUnavailable, storage, vendors]);

  const updateVendor = useCallback((vendorId: string, updater: (vendor: Vendor) => Vendor) => {
    setVendors((current) => {
      if (!current.some((vendor) => vendor.id === vendorId)) throw new Error("Vendor not found");
      return current.map((vendor) => vendor.id === vendorId ? updater(vendor) : vendor);
    });
  }, []);

  const value = useMemo<VendorStoreValue>(() => ({
    vendors,
    recoveryNotice,
    storageUnavailable,
    addVendor(draft) {
      const vendor = createVendor(draft, now());
      setVendors((current) => [vendor, ...current]);
      return vendor;
    },
    updateDocument(vendorId, documentId, state) {
      updateVendor(vendorId, (vendor) => transitionDocument(vendor, documentId, state, now()));
    },
    updateSecurity(vendorId, checkId, result, note) {
      updateVendor(vendorId, (vendor) => updateSecurityCheck(vendor, checkId, result, note, now()));
    },
    addNote(vendorId, note) {
      updateVendor(vendorId, (vendor) => addVendorNote(vendor, note, now()));
    },
    approve(vendorId) {
      updateVendor(vendorId, (vendor) => approveVendor(vendor, now()));
    },
    reject(vendorId, reason) {
      updateVendor(vendorId, (vendor) => rejectVendor(vendor, reason, now()));
    },
    resetDemo() {
      setVendors(createSeedVendors());
      setRecoveryNotice(false);
    },
  }), [recoveryNotice, storageUnavailable, updateVendor, vendors]);

  return <VendorStoreContext.Provider value={value}>{children}</VendorStoreContext.Provider>;
}

export function useVendorStore() {
  const value = useContext(VendorStoreContext);
  if (!value) throw new Error("useVendorStore must be used within VendorStoreProvider");
  return value;
}
