export interface FileDiffLine {
  type: 'unchanged' | 'added' | 'removed';
  lineNumber?: number;
  text: string;
}

export interface FileDiffResult {
  lines: FileDiffLine[];
  addedCount: number;
  removedCount: number;
}

export async function readServerFile(serverId: string, filePath: string): Promise<string> {
  const cleanPath = filePath.trim();
  const url = `/api/client/servers/${serverId}/files/contents?file=${encodeURIComponent(cleanPath)}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`File '${cleanPath}' does not exist on server.`);
    }
    const errText = await res.text();
    throw new Error(`Failed to read file (${res.status}): ${errText}`);
  }

  return await res.text();
}

export async function writeServerFile(serverId: string, filePath: string, content: string): Promise<void> {
  const cleanPath = filePath.trim();
  const url = `/api/client/servers/${serverId}/files/write?file=${encodeURIComponent(cleanPath)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: content,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to write file (${res.status}): ${errText}`);
  }
}

export async function listServerFiles(serverId: string, directory = '/'): Promise<Array<{ name: string; isFile: boolean; size: number }>> {
  const cleanDir = directory.trim() || '/';
  const url = `/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(cleanDir)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to list files in '${cleanDir}' (${res.status})`);
  }

  const data = await res.json();
  const items = Array.isArray(data) ? data : data.data || [];

  return items.map((item: any) => ({
    name: item.name || item.attributes?.name || 'unknown',
    isFile: item.is_file ?? item.isFile ?? !item.attributes?.is_dir,
    size: item.size || item.attributes?.size || 0,
  }));
}

/**
 * Computes a unified diff between oldContent and newContent
 */
export function computeDiff(oldContent: string, newContent: string): FileDiffResult {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  const result: FileDiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({
        type: 'unchanged',
        lineNumber: j + 1,
        text: newLines[j],
      });
      i++;
      j++;
    } else {
      // Check if old line was modified or deleted
      if (i < oldLines.length && (j >= newLines.length || !newLines.includes(oldLines[i]))) {
        result.push({
          type: 'removed',
          text: oldLines[i],
        });
        removedCount++;
        i++;
      } else if (j < newLines.length) {
        result.push({
          type: 'added',
          lineNumber: j + 1,
          text: newLines[j],
        });
        addedCount++;
        j++;
      }
    }
  }

  return {
    lines: result,
    addedCount,
    removedCount,
  };
}
