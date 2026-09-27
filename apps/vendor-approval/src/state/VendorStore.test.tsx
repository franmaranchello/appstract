import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { VendorStoreProvider, useVendorStore } from "./VendorStore";

afterEach(() => vi.restoreAllMocks());

function SessionControls() {
  const store = useVendorStore();
  return <>
    <button onClick={() => store.addNote(store.vendors[0].id, "Unsaved reviewer note")}>Add session note</button>
    <button onClick={store.resetDemo}>Reset session</button>
    <output data-testid="note">{store.vendors[0].notes}</output>
  </>;
}

function renderSession(storage?: Storage) {
  render(
    <MemoryRouter initialEntries={["/vendors"]}>
      <VendorStoreProvider storage={storage}>
        <App />
        <SessionControls />
      </VendorStoreProvider>
    </MemoryRouter>,
  );
}

async function expectUsableUnsavedSession() {
  expect(screen.getByRole("heading", { name: "Vendor approvals" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Changes stay in this tab");
  expect(screen.getByText(/Sample data/)).toHaveTextContent("Unsaved session");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add session note" }));
  expect(screen.getByTestId("note")).toHaveTextContent("Unsaved reviewer note");
  await user.click(screen.getByRole("button", { name: "Reset session" }));
  expect(screen.getByTestId("note")).not.toHaveTextContent("Unsaved reviewer note");
}

it("keeps the vendor UI usable when the localStorage getter is denied", async () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  renderSession();
  await expectUsableUnsavedSession();
});

it("does not overwrite an unreadable saved portfolio", async () => {
  const storage = {
    getItem: vi.fn(() => { throw new DOMException("Blocked", "SecurityError"); }),
    setItem: vi.fn(),
  } as unknown as Storage;
  renderSession(storage);
  await expectUsableUnsavedSession();
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("retains edits in memory and warns when writes exceed the storage quota", async () => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => { throw new DOMException("Full", "QuotaExceededError"); }),
  } as unknown as Storage;
  renderSession(storage);
  await expectUsableUnsavedSession();
  expect(storage.setItem).toHaveBeenCalled();
});
