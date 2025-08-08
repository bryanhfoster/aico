const online = new Set<string>();

export function addOnlineGuid(guid: string) {
  online.add(guid);
}

export function removeOnlineGuid(guid: string) {
  online.delete(guid);
}

export function listOnlineGuids(): string[] {
  return Array.from(online);
}


