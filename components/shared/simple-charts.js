"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

function resolveColor(item, fallback = "var(--chart-1)") {
  if (item.color) return item.color;
  if (item.className?.includes("chart-2")) return "var(--chart-2)";
  if (item.className?.includes("chart-3")) return "var(--chart-3)";
  if (item.className?.includes("chart-4")) return "var(--chart-4)";
  if (item.className?.includes("chart-5")) return "var(--chart-5)";
  if (item.className?.includes("muted-foreground"))
    return "var(--muted-foreground)";
  return fallback;
}

function normalizeChartData(data, fallbackColor = "var(--chart-1)") {
  return data.map((item, index) => ({
    name: item.label,
    value: Number(item.value) || 0,
    fill:
      resolveColor(item, `var(--chart-${(index % 5) + 1})`) || fallbackColor,
  }));
}

export function HorizontalBarChart({
  data,
  valueFormatter = (value) => value,
  emptyMessage = "Nenhum dado para exibir.",
}) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const chartData = normalizeChartData(data);

  return (
    <ChartContainer
      config={{ value: { label: "Valor", color: "var(--chart-1)" } }}
      className="h-[220px] w-full"
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={92}
          tickMargin={8}
        />
        <XAxis type="number" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => valueFormatter(Number(value) || 0)}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {chartData.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            formatter={(value) => valueFormatter(Number(value) || 0)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DonutChart({
  data,
  valueFormatter = (value) => value,
  emptyMessage = "Nenhum dado para exibir.",
}) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const chartData = normalizeChartData(data);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      <ChartContainer
        config={{ value: { label: "Valor", color: "var(--chart-1)" } }}
        className="mx-auto h-[210px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) => valueFormatter(Number(value) || 0)}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={78}
            strokeWidth={4}
          >
            {chartData.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox))
                  return null;

                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {valueFormatter(total)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-2">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-medium tabular-nums">
              {valueFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimeSeriesAreaChart({
  data,
  valueFormatter = (value) => value,
  axisFormatter = (value) => value,
  emptyMessage = "Nenhum dado para exibir.",
}) {
  const gradientId = useId().replace(/:/g, "");

  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const chartData = normalizeChartData(data);
  const strokeColor = chartData[0]?.fill || "var(--chart-1)";

  return (
    <ChartContainer
      config={{ value: { label: "Valor", color: strokeColor } }}
      className="h-[260px] w-full"
    >
      <AreaChart
        data={chartData}
        margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={18}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={58}
          tickFormatter={(value) => axisFormatter(Number(value) || 0)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => valueFormatter(Number(value) || 0)}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function TimeSeriesBarChart({
  data,
  valueFormatter = (value) => value,
  axisFormatter = (value) => value,
  emptyMessage = "Nenhum dado para exibir.",
}) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const chartData = normalizeChartData(data);
  const barColor = chartData[0]?.fill || "var(--chart-1)";

  return (
    <ChartContainer
      config={{ value: { label: "Valor", color: barColor } }}
      className="h-[260px] w-full"
    >
      <BarChart
        data={chartData}
        margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={18}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={58}
          tickFormatter={(value) => axisFormatter(Number(value) || 0)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => valueFormatter(Number(value) || 0)}
            />
          }
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function TimeSeriesLineChart({
  data,
  valueFormatter = (value) => value,
  axisFormatter = (value) => value,
  emptyMessage = "Nenhum dado para exibir.",
}) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const chartData = normalizeChartData(data);
  const strokeColor = chartData[0]?.fill || "var(--chart-1)";

  return (
    <ChartContainer
      config={{ value: { label: "Valor", color: strokeColor } }}
      className="h-[220px] min-w-0 w-full sm:h-[260px]"
    >
      <LineChart
        data={chartData}
        margin={{ left: -12, right: 4, top: 12, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={10}
          interval="preserveEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={48}
          tickFormatter={(value) => axisFormatter(Number(value) || 0)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => valueFormatter(Number(value) || 0)}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          dot={{
            r: 4,
            strokeWidth: 2,
            fill: "var(--background)",
            stroke: strokeColor,
          }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
            fill: strokeColor,
            stroke: "var(--background)",
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}
