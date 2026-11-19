export type CollabCatalogFilter = "collabs" | "video" | "complete";
export const COLLAB_CATALOG_FILTERS: readonly CollabCatalogFilter[];
export function filterCollabCatalog<T extends { audioStatus?: string; isReleased?: boolean; readyForCollab?: boolean; collaborationOpportunities?: string[] }>(songs: T[], filter: CollabCatalogFilter): T[];
