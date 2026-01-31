"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

export default function SpendLineChart({ data }: { data: number[] }) {
  return (
    <Line
      data={{
        labels: ["月", "火", "水", "木", "金", "土", "日"],
        datasets: [
          {
            label: "支出",
            data,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(148, 163, 184, 0.2)" }, ticks: { display: false } },
        },
      }}
    />
  );
}
