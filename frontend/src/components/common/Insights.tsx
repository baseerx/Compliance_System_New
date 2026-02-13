// src/components/common/Insights.tsx
import { useNavigate } from "react-router-dom";

interface InsightsProps {
  title: string;
  value: number;
  color: string;
  filterType?: string;
}

export default function Insights({ title, value, color, filterType }: InsightsProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (filterType) {
      navigate(`/letters/filtered/${filterType}`);
    }
  };

  const getIcon = () => {
    switch (filterType) {
      case "upcoming":
        return (
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 8 8">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "overdue":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "recurring":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case "total":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
  <div
    onClick={handleClick}
    className={`${color} text-white p-4 h-24 rounded-lg shadow-md ${
      filterType
        ? "cursor-pointer hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
        : ""
    } relative overflow-hidden`}
  >
    <div className="absolute top-0 right-0 -mt-6 -mr-6 h-16 w-16 rounded-full bg-white opacity-10"></div>
    <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-14 w-14 rounded-full bg-white opacity-10"></div>

    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-90">
          {title}
        </h3>
        <div className="opacity-80">
          {filterType && (
            <div className="w-4 h-4">{getIcon()}</div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold leading-none">{value}</p>

        {filterType && (
          <div className="text-[10px] opacity-75 flex items-center">
            <span>View</span>
            <svg
              className="w-3 h-3 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  </div>
);
}