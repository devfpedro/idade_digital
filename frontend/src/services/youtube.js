export function idDoYoutube(link) {
  try {
    const u = new URL(link);
    const host = u.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) {
      id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean)[1] || "";
    }
    return /^[\w-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

export function miniaturaDoYoutube(link) {
  const id = idDoYoutube(link);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}
