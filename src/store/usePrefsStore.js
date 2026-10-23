import { create } from "zustand";
import { persist } from "zustand/middleware";

// Per-browser dashboard preferences. Hydration is manual (usePrefsStore.persist.rehydrate)
// so the server render and the first client render match.
const usePrefsStore = create(
  persist(
    (set) => ({
      group: "",
      sort: "custom",

      setGroup: (group) => set({ group }),
      setSort: (sort) => set({ sort }),
    }),
    { name: "moon.prefs", skipHydration: true },
  ),
);

export default usePrefsStore;
