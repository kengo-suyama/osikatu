"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip);

export default function SpendLineChart({ data }: { data: number[] }) {
  return (
    <Line
      data={{
        labels: ["ŒŽ", "‰Î", "…", "–Ø", "‹à", "“y", "“ú"],
        datasets: [
          {
            label: "Žxo",
            data,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            tension: 0.35,
          },
        ],
      }}
      options={{ responsive: true, plugins: { legend: { display: false } } }}
    />
  );
}
