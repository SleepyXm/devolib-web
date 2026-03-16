export function parsePlaceholders(snippet: string) {
  const regex = /\$\{(\d+)\|([^}]+)\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(snippet)) !== null) {
    matches.push({
      index: match.index,
      tabStop: parseInt(match[1]),
      options: match[2].split(","),
      raw: match[0],
    });
  }

  return matches.sort((a, b) => a.tabStop - b.tabStop);
}