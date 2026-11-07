export const isOwnRecordingShare = (recipient: string): boolean =>
  recipient.trim().toLocaleLowerCase("sv-SE") === "music super circus";