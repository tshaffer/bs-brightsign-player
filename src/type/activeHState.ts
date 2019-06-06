export interface HStateMap {
  [hsmId: string]: string | null;
}
export interface ActiveHStatesByHsm {
  activeHStateIdByHSM: HStateMap;
}
