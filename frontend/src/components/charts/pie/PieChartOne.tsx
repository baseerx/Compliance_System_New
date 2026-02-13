import Chart from "react-apexcharts";

export default function PieChartOne({ draft, inProgress, forwarded, completed }: any) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: ["Draft", "In-Progress", "Forwarded", "Completed"],
    legend: { position: "bottom" },
    colors: ["#F59E0B", "#3B82F6", "#10B981", "#8B5CF6"],
    dataLabels: { enabled: true, style: { fontSize: '14px', colors: ['#fff'] } },
    tooltip: { y: { formatter: (val) => `${val} letters` } },
    plotOptions: {
      pie: { donut: { size: "65%" } }
    }
  };

  const series = [draft, inProgress, forwarded, completed];

  return <Chart options={options} series={series} type="donut" width="100%" height={350} />;
}
