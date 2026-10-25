"use client";

import PageContainer from "@/components/layout/page-container";
import AdsScheduleGrid from "@/components/sponsors/ads-schedule-grid";

/** Administrative route that visualizes the deterministic display schedule. */
export default function GradeAdsPage() {
  return (
    <PageContainer>
      <AdsScheduleGrid />
    </PageContainer>
  );
}
