// modules/store/analysis-store.ts

const analysisStore = new Map<string, any>()

export function saveAnalysis(id: string, data: any) {
  analysisStore.set(id, data)
}

export function getAnalysis(id: string) {
  return analysisStore.get(id)
}