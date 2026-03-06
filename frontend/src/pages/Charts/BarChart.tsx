import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import BarChartOne from "../../components/charts/bar/BarChartOne";
import PageMeta from "../../components/common/PageMeta";

import { useEffect, useState } from "react";
import { fetchLetters } from "../../api/letterApi";

export default function BarChart() {

  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));

  useEffect(() => {
    const loadData = async () => {
      const letters = await fetchLetters();

      const counts = Array(12).fill(0);

      letters.forEach(letter => {
        const date = new Date(letter.created_at);
        const month = date.getMonth(); // 0-11
        counts[month]++;
      });

      setMonthlyData(counts);
    };

    loadData();
  }, []);

   return (
    <div>
      <PageMeta
        title="React.js Chart Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Chart Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Bar Chart" />
      <div className="space-y-6">
        <ComponentCard title="Bar Chart 1">
          <BarChartOne monthlyData={monthlyData} />
        </ComponentCard>
      </div>
    </div>
  );
}