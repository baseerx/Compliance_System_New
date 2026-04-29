import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Letter {
  department?: string;
  status: string;
}

interface Props {
  letters: Letter[];
}

export default function SplitBarChart({ letters }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);
  const navigate  = useNavigate();

  const deptMap: Record<string, { draft: number; inProgress: number; completed: number}> = {};

  letters.forEach((l) => {
    const dept = l.department?.trim() || "Unassigned";
    if (!deptMap[dept]) deptMap[dept] = { draft: 0, inProgress: 0, completed: 0};
    if (l.status === "draft")       deptMap[dept].draft++;
    else if (l.status === "in-progress") deptMap[dept].inProgress++;
    else if (l.status === "completed")   deptMap[dept].completed++;
  });

  const depts  = Object.keys(deptMap);
  const totals = depts.map((d) => Object.values(deptMap[d]).reduce((a, b) => a + b, 0));

  useEffect(() => {
    if (!canvasRef.current || depts.length === 0) return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: depts.map((d, i) => `${d} (${totals[i]})`),
        datasets: [
          {
            label: "Draft",
            data: depts.map((d) => deptMap[d].draft),
            backgroundColor: "#7F77DD",
          },
          {
            label: "In Progress",
            data: depts.map((d) => deptMap[d].inProgress),
            backgroundColor: "#EF9F27",
          },
          
          {
            label: "Completed",
            data: depts.map((d) => deptMap[d].completed),
            backgroundColor: "#1D9E75",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_evt, elements) => {
          if (!elements.length) return;
          const deptName = depts[elements[0].index];
          navigate(`/dashboard/department/${encodeURIComponent(deptName)}`);
        },
        onHover: (_evt, els, chart) => {
          (chart.canvas.style.cursor = els.length ? "pointer" : "default");
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x} tasks`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { stepSize: 1, color: "#6b7280", font: { size: 12 } },
            grid: { color: "rgba(0,0,0,0.06)" },
            border: { display: false },
          },
          y: {
            stacked: true,
            ticks: { color: "#374151", font: { size: 13 } },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [letters]);  

  if (depts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <p className="text-sm font-medium">No department data available</p>
      </div>
    );
  }

  const legendItems = [
    { label: "Draft",       color: "#7F77DD" },
    { label: "In Progress", color: "#EF9F27" },
    { label: "Completed",   color: "#1D9E75" },
  ];

  const barHeight = Math.max(depts.length * 52 + 60, 180);

  return (
    <div>
  
      <div className="flex flex-wrap gap-4 mb-4">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>


      <div style={{ position: "relative", width: "100%", height: barHeight }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Horizontal stacked bar chart of tasks by department and status"
        />
      </div>

      <p className="text-xs text-center text-gray-400 mt-3">
        Click any bar to view that department's tasks
      </p>
    </div>
  );
}