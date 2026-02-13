import Chart from "react-apexcharts";

export default function BarChartOne({ monthlyData }: { monthlyData: number[] }) {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: "50%",
        distributed: true,
      },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      labels: { rotate: -45 },
    },
    colors: [
      "#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", 
      "#E0E7FF", "#4338CA", "#312E81", "#3730A3", "#4338CA", "#4F46E5", "#6366F1"
    ],
    tooltip: { y: { formatter: (val) => `${val} letters` } },
    grid: { borderColor: "#E5E7EB" },
  };

  const series = [{ name: "Letters Created", data: monthlyData }];

  return <Chart options={options} series={series} type="bar" height={350} />;
}
