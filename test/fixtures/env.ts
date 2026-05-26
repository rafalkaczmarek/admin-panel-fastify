export function snapshotEnv (keys: string[]): () => void {
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

  return () => {
    for (const key of keys) {
      if (saved[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = saved[key]
      }
    }
  }
}
