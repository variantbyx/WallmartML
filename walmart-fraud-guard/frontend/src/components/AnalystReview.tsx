import { useState, type FC } from "react";
import type { RecentAlert } from "../types";

interface AnalystReviewProps {
  alert: RecentAlert;
  defaultReviewerId?: string;
  onSubmit: (flag: boolean, reviewerId: string) => void;
  onCancel: () => void;
}

export const AnalystReview: FC<AnalystReviewProps> = ({
  alert,
  defaultReviewerId,
  onSubmit,
  onCancel,
}) => {
  const [flag, setFlag] = useState<boolean | null>(null);
  const [reviewerId, setReviewerId] = useState(defaultReviewerId ?? "analyst1");

  const handleSubmit = () => {
    if (flag === null) {
      window.alert("Please select Fraud or False Positive");
      return;
    }
    if (!reviewerId.trim()) {
      window.alert("Please enter a reviewer id");
      return;
    }
    onSubmit(flag, reviewerId.trim());
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-900">Analyst Review</h3>
      <p className="text-sm text-slate-500">
        Transaction{" "}
        <span className="font-mono text-slate-700">{alert.transaction_id}</span>
      </p>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Is this fraud?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setFlag(true)}
            className={`flex-1 rounded-2xl px-3 py-2 font-semibold transition ${
              flag === true
                ? "bg-red-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            ✓ Confirmed Fraud
          </button>
          <button
            onClick={() => setFlag(false)}
            className={`flex-1 rounded-2xl px-3 py-2 font-semibold transition ${
              flag === false
                ? "bg-green-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            ✗ False Positive
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Reviewer ID
        </label>
        <input
          value={reviewerId}
          onChange={(event) => setReviewerId(event.target.value)}
          placeholder="analyst1"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-black"
        >
          Submit Review
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-slate-200 px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
