import { openUrl } from '@tauri-apps/plugin-opener'

export function isWebLink(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()))
}

export async function openWebLink(value?: string) {
  if (!isWebLink(value)) return
  await openUrl(value!.trim())
}
