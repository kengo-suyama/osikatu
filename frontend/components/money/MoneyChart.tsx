"use client";

import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

import type { MoneyCategory } from "@/lib/uiTypes";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MoneyChart({ categories }: { categories: MoneyCategory[] }) {
  const labels = categories.map((item) => item.label);
  const values = categories.map((item) => item.amount);

  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              "rgba(244, 114, 182, 0.6)",
              "rgba(56, 189, 248, 0.6)",
              "rgba(251, 191, 36, 0.6)",
              "rgba(74, 222, 128, 0.6)",
            ],
            borderWidth: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, boxHeight: 10, color: "#94a3b8" },
          },
        },
      }}
    />
  );
}
