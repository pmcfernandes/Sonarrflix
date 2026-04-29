export function plural(count, singular, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

export function episodeCode(episode) {
  return `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
}

export function joinMeta(parts) {
  return parts.filter(Boolean).join(' / ');
}
