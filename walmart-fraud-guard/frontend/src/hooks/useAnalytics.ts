import { useEffect, useState } from "react";
import axios from "axios";
import { Analytics } from "../types";

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get("/api/v1/analytics/summary", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        setAnalytics(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // poll every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return { analytics, loading, error };
}
