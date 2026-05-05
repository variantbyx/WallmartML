import React, { useState } from "react";
import { FraudAlert } from "../types";

interface AnalystReviewProps {
  alert: FraudAlert;
  onSubmit: (flag: boolean, notes: string) => void;
  onCancel: () => void;
}

export const AnalystReview: React.FC<AnalystReviewProps> = ({
  alert,
  onSubmit,
  onCancel,
}) => {
  const [flag, setFlag] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (flag === null) {
      alert("Please select Fraud or False Positive");
      return;
    }
    onSubmit(flag, notes);
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded border border-blue-200">
      <h3 className="font-semibold">Analyst Review</h3>

      <div className="space-y-2">
        <p className="text-sm font-medium">Is this fraud?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setFlag(true)}
            className={`flex-1 py-2 px-3 rounded font-semibold transition ${
              flag === true
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ✓ Confirmed Fraud
          </button>
          <button
            onClick={() => setFlag(false)}
            className={`flex-1 py-2 px-3 rounded font-semibold transition ${
              flag === false
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ✗ False Positive
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional context..."
          className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
        >
          Submit Review
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
