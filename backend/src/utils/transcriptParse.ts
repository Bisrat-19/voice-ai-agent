/**
 * Pulls only what the caller said — assistant lines repeat business data from the
 * system prompt and cause false intent/service/emergency matches.
 */
export function extractCallerText(transcript: string): string {
  if (!transcript.trim()) return "";

  const lineCallerParts: string[] = [];

  for (const line of transcript.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const roleMatch = trimmed.match(/^(user|caller|human)\s*:\s*(.*)$/i);
    if (roleMatch?.[2]) {
      lineCallerParts.push(roleMatch[2].trim());
    }
  }

  if (lineCallerParts.length > 0) {
    return lineCallerParts.join(" ").trim();
  }

  // Vapi single-line format: "AI: ... User: ... Assistant: ..."
  const blockPattern =
    /\b(?:User|Caller|Human)\s*:\s*([\s\S]*?)(?=\s*(?:AI|Assistant|Bot)\s*:|$)/gi;
  const blockParts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(transcript)) !== null) {
    const chunk = match[1].trim();
    if (chunk) blockParts.push(chunk);
  }

  if (blockParts.length > 0) {
    return blockParts.join(" ").trim();
  }

  // Flat test payloads: "Caller: ..." on one line without role-per-line
  const singleCaller = transcript.match(/^(?:Caller|User|Human)\s*:\s*(.+)$/is);
  if (singleCaller?.[1]) {
    return singleCaller[1].trim();
  }

  return "";
}
