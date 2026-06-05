import { useState } from "react";

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (data: {
    jobTitle: string;
    jobSpec: string;
    cv: string;
    statement: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      // 🚨 SaaS BLOCK CHECK (IMPORTANT)
      if (result.blocked) {
        return {
          blocked: true,
          upgradeRequired: true,
          message: result.message,
          upgrade: result.upgrade,
        };
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    runAnalysis,
    loading,
    error,
  };
}