import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyHouseStylePatch,
  defaultProject,
  newVentLine,
  type Project,
  type RoofType,
  type TargetMode,
  type VentLine,
} from "@/lib/ventilation";

interface ProjectState {
  project: Project;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  patch: (partial: Partial<Project>) => void;
  setVent: (id: string, partial: Partial<VentLine>) => void;
  addVent: (productId: string, quantity?: number) => void;
  removeVent: (id: string) => void;
  applyAdd: (productId: string, quantity: number) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: defaultProject(),
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      patch: (partial) =>
        set({ project: applyHouseStylePatch(get().project, partial) }),
      setVent: (id, partial) =>
        set({
          project: {
            ...get().project,
            vents: get().project.vents.map((v) =>
              v.id === id ? { ...v, ...partial } : v,
            ),
          },
        }),
      addVent: (productId, quantity = 1) =>
        set({
          project: {
            ...get().project,
            vents: [...get().project.vents, newVentLine(productId, quantity)],
          },
        }),
      removeVent: (id) =>
        set({
          project: {
            ...get().project,
            vents: get().project.vents.filter((v) => v.id !== id),
          },
        }),
      applyAdd: (productId, quantity) => {
        const existing = get().project.vents.find((v) => v.productId === productId);
        if (existing) {
          get().setVent(existing.id, { quantity: existing.quantity + quantity });
          return;
        }
        get().addVent(productId, quantity);
      },
      reset: () => set({ project: defaultProject() }),
    }),
    {
      name: "atticflow-project-v1",
      skipHydration: true,
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { project?: Project };
        const project = { ...defaultProject(), ...(state.project ?? {}) };
        if (!project.houseStyle) project.houseStyle = "ranch";
        if (project.geometryCustom == null) project.geometryCustom = false;
        return { project };
      },
      partialize: (state) => ({ project: state.project }),
    },
  ),
);

export type { RoofType, TargetMode };
