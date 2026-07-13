export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

export const normalizeHeader = (header: string): string => {
  return header
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/_/g, ' ');
};
