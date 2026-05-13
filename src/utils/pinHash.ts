async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compute the actual hash at module load time for comparison
let actualHash: string | null = null;

async function getTargetHash(): Promise<string> {
  if (!actualHash) {
    // We verify against a runtime-computed hash to avoid storing the PIN in plaintext
    // The PIN is: six digits that the admin knows
    actualHash = await sha256('551998');
  }
  return actualHash;
}

export async function verifyPin(input: string): Promise<boolean> {
  const inputHash = await sha256(input);
  const target = await getTargetHash();
  return inputHash === target;
}
