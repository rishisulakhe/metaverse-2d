export function openURL(url: string) {
  const canOpenNewTab = window.open(url, '_blank')
  if (!canOpenNewTab) {
    window.location.href = url
  }
}
