import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveFilterPills } from "@/components/filters/ActiveFilterPills";
import { SearchBar } from "@/components/search/SearchBar";
import { HealthSystemView } from "@/components/table/HealthSystemView";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { emptyFilterState, type FilterState } from "@/lib/filters/filter-types";
import { getActivePills } from "@/lib/filters/active-pills";

import { buildTableFixture } from "./fixtures/table-data";
import { ResizeObserverStub } from "./fixtures/virtualizer-stub";

const fixture = buildTableFixture();

/** Stub `fetch` so useTableData loads the fixture without a server. */
function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/hospitals")) {
        return {
          ok: true,
          json: async () => ({
            hospitals: fixture.hospitals,
            count: fixture.hospitals.length,
          }),
        };
      }
      if (url.startsWith("/api/health-systems")) {
        return {
          ok: true,
          json: async () => ({
            healthSystems: fixture.healthSystems,
            count: fixture.healthSystems.length,
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ─── useDebouncedValue hook ───

describe("useDebouncedValue", () => {
  function DebounceHarness({ value, delay }: { value: string; delay: number }) {
    const debounced = useDebouncedValue(value, delay);
    return <div data-testid="debounced">{debounced}</div>;
  }

  it("debounces the value by the specified delay", () => {
    vi.useFakeTimers();
    const { rerender } = render(<DebounceHarness value="abc" delay={200} />);
    expect(screen.getByTestId("debounced").textContent).toBe("abc");

    rerender(<DebounceHarness value="abcdef" delay={200} />);
    // Before the delay elapses, the debounced value should still be the old one.
    expect(screen.getByTestId("debounced").textContent).toBe("abc");

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(screen.getByTestId("debounced").textContent).toBe("abc");

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByTestId("debounced").textContent).toBe("abcdef");
  });
});

// ─── SearchBar unit tests ───

describe("SearchBar", () => {
  it("renders an input with an accessible label and placeholder", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByRole("searchbox", {
      name: /Search hospitals and health systems/i,
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      "placeholder",
      "Search by name, system, domain, city, state, or CCN…",
    );
  });

  it("updates the input immediately as the user types (VAL-FILTER-037)", async () => {
    const user = userEvent.setup();
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "Alpine");
    expect(input).toHaveValue("Alpine");
  });

  it("does not call onChange on every keystroke — debounces (VAL-FILTER-044)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole("searchbox");

    // Type three characters rapidly using fireEvent (synchronous, no delay).
    act(() => {
      fireEvent.change(input, { target: { value: "Alp" } });
    });
    act(() => {
      fireEvent.change(input, { target: { value: "Alpi" } });
    });
    act(() => {
      fireEvent.change(input, { target: { value: "Alpine" } });
    });

    // No onChange calls yet — debounce hasn't elapsed.
    expect(onChange).not.toHaveBeenCalled();

    // Advance past the debounce window.
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Exactly one onChange call with the final value.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Alpine");
  });

  it("clear button clears the input and calls onChange immediately (VAL-FILTER-061)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar value="Alpine" onChange={onChange} />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("Alpine");

    const clearBtn = screen.getByRole("button", { name: /Clear search/i });
    await user.click(clearBtn);
    expect(input).toHaveValue("");
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("syncs local input when external value is cleared (VAL-FILTER-046)", () => {
    const { rerender } = render(<SearchBar value="Alpine" onChange={() => {}} />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("Alpine");

    // Simulate pill removal clearing the search term externally.
    rerender(<SearchBar value="" onChange={() => {}} />);
    expect(input).toHaveValue("");
  });

  it("handles special characters safely (VAL-FILTER-060)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole("searchbox");

    act(() => {
      fireEvent.change(input, {
        target: { value: "St. Mary's & Clinic - test" },
      });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onChange).toHaveBeenCalledWith("St. Mary's & Clinic - test");
    expect(input).toHaveValue("St. Mary's & Clinic - test");
  });

  it("handles leading and trailing whitespace (VAL-FILTER-060)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole("searchbox");

    act(() => {
      fireEvent.change(input, { target: { value: "  Alpine  " } });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // The raw value (with whitespace) is passed to onChange; trimming happens
    // in the filter logic (matchesSearch trims internally).
    expect(onChange).toHaveBeenCalledWith("  Alpine  ");
  });
});

// ─── Active pills: search pill ───

describe("Search active pill", () => {
  it("search term produces a removable pill (VAL-FILTER-046)", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      searchTerm: "childrens",
    };
    const pills = getActivePills(state);
    const searchPill = pills.find((p) => p.id === "searchTerm");
    expect(searchPill).toBeDefined();
    expect(searchPill!.label).toContain("childrens");
    expect(searchPill!.removePatch).toEqual({ searchTerm: "" });
  });

  it("removing the search pill clears the search term (VAL-FILTER-046)", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      searchTerm: "alpine",
      states: ["CA"],
    };
    const pills = getActivePills(state);
    const searchPill = pills.find((p) => p.id === "searchTerm");
    const stateAfterRemoval = { ...state, ...searchPill!.removePatch };
    expect(stateAfterRemoval.searchTerm).toBe("");
    // Other filters remain.
    expect(stateAfterRemoval.states).toEqual(["CA"]);
  });

  it("ActiveFilterPills renders the search pill", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      searchTerm: "alpine",
    };
    render(<ActiveFilterPills state={state} onRemove={() => {}} />);
    expect(screen.getByText(/Search:/i)).toBeInTheDocument();
    expect(screen.getByText(/alpine/i)).toBeInTheDocument();
  });

  it("clicking the search pill calls onRemove with searchTerm: empty", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const state: FilterState = {
      ...emptyFilterState(),
      searchTerm: "alpine",
    };
    render(<ActiveFilterPills state={state} onRemove={onRemove} />);
    const pill = screen.getByText(/Search:/i).closest("button");
    expect(pill).not.toBeNull();
    await user.click(pill!);
    expect(onRemove).toHaveBeenCalledWith({ searchTerm: "" });
  });
});

// ─── Integration: SearchBar in HealthSystemView ───

describe("SearchBar integration in HealthSystemView", () => {
  it("search filters the table by hospital name (VAL-FILTER-037)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);

    // Wait for data to load (heading is specific to avoid ViewToggle text).
    await screen.findByRole("heading", { name: /Health System View/i });

    const input = screen.getByRole("searchbox");
    await user.type(input, "Riverside");

    // Wait for the debounced search to apply and filter the table.
    await waitFor(() => {
      expect(screen.getByText(/Riverside Community/i)).toBeInTheDocument();
      expect(screen.queryByText(/Alpine Summit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Beacon Central/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("search with no matches shows empty state (VAL-FILTER-045)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);

    await screen.findByRole("heading", { name: /Health System View/i });

    const input = screen.getByRole("searchbox");
    await user.type(input, "zzznonexistent");

    await screen.findByText(/No results match/i, undefined, { timeout: 2000 });
  });

  it("search pill appears and can be removed (VAL-FILTER-046)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);

    await screen.findByRole("heading", { name: /Health System View/i });

    const input = screen.getByRole("searchbox");
    await user.type(input, "Alpine");

    // Wait for debounce + pill to appear.
    await screen.findByText(/Search:/i, undefined, { timeout: 2000 });

    // Click the search pill to remove it.
    const pill = screen.getByText(/Search:/i).closest("button");
    expect(pill).not.toBeNull();
    await user.click(pill!);

    // Input should be cleared and full table restored.
    expect(screen.getByRole("searchbox")).toHaveValue("");
    // Wait for the table to restore — Beacon Regional Health was filtered out
    // by the "Alpine" search and should reappear when the search is cleared.
    await waitFor(() => {
      expect(screen.getByText(/Beacon Regional Health/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("clearing the search input restores the table (VAL-FILTER-061)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);

    await screen.findByRole("heading", { name: /Health System View/i });

    const input = screen.getByRole("searchbox");
    await user.type(input, "Riverside");

    // Wait for the search to filter the table.
    await waitFor(() => {
      expect(screen.getByText(/Riverside Community/i)).toBeInTheDocument();
      expect(screen.queryByText(/Alpine Summit/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Clear the input.
    await user.clear(input);

    // Full table restored after debounce.
    await waitFor(() => {
      expect(screen.getByText(/Alpine Summit/i)).toBeInTheDocument();
      expect(screen.getByText(/Riverside Community/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("search combined with filters uses AND logic (VAL-FILTER-049)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);

    await screen.findByRole("heading", { name: /Health System View/i });

    // Apply a state filter via quick chip (California).
    const caChip = screen.getByRole("button", { name: /California/i });
    await user.click(caChip);

    // Also type a search for "Alpine".
    const input = screen.getByRole("searchbox");
    await user.type(input, "Alpine");

    // Wait for debounce. Only Alpine hospitals in CA should appear.
    // Alpine Summit is in NV, so only Alpine Valley (CA) should be visible.
    // Riverside (CA) is filtered out by the search term.
    await waitFor(() => {
      expect(screen.getByText(/Alpine Valley/i)).toBeInTheDocument();
      expect(screen.queryByText(/Alpine Summit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Riverside Community/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
