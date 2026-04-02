import { airportFacility, type FacilitySystem, type TelemetryPoint } from "../data/facilityData";

export type OverviewMetric = {
  label: string;
  value: string;
  detail: string;
};

export type SystemInsight = {
  title: string;
  description: string;
  impact: string;
  priority: "high" | "medium" | "watch";
  reasoning?: string;
};

export type OverviewSnapshot = {
  metrics: OverviewMetric[];
  systemsByStatus: Record<FacilitySystem["status"], number>;
  powerSeries: Array<{ time: string; totalPower: number; avgEfficiency: number; occupancy: number }>;
  topInsights: Array<{ systemId: string; systemName: string; insight: SystemInsight }>;
};

export type SystemSnapshot = {
  system: FacilitySystem;
  latest: TelemetryPoint;
  previous: TelemetryPoint;
  insights: SystemInsight[];
  summaryCards: OverviewMetric[];
  sensorCards: OverviewMetric[];
  trendData: Array<{
    time: string;
    powerKw: number;
    efficiencyPct: number;
    loadPct: number;
    healthScore: number;
    setpoint: number;
    actual: number;
    flow: number;
    occupancy: number;
    supplyAirTemp?: number;
    returnAirTemp?: number;
    chilledWaterSupplyTemp?: number;
    chilledWaterReturnTemp?: number;
    zoneTemp?: number;
    valvePosition?: number;
  }>;
};

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatPct = (value: number) => `${value.toFixed(0)}%`;
const formatTemp = (value: number) => `${value.toFixed(1)}°C`;
const safeDelta = (a?: number, b?: number) =>
  a !== undefined && b !== undefined ? a - b : undefined;
const calcCoolingLoadKw = (supplyAirTemp?: number, returnAirTemp?: number, flow?: number) =>
  supplyAirTemp !== undefined && returnAirTemp !== undefined && flow !== undefined
    ? (1.08 * flow * (returnAirTemp - supplyAirTemp)) / 12000 * 3.517
    : undefined;

function buildSystemInsights(system: FacilitySystem): SystemInsight[] {
  const latest = system.telemetry.at(-1)!;
  const avgLoad = average(system.telemetry.map((point) => point.loadPct));
  const avgEfficiency = average(system.telemetry.map((point) => point.efficiency));
  const avgActualVsSetpoint = average(system.telemetry.map((point) => point.actual - point.setpoint));

  const insights: SystemInsight[] = [];

  if (system.kind === "AHU" && avgActualVsSetpoint < -0.6 && latest.occupancy < 85) {
    insights.push({
      title: "Supply-air reset opportunity",
      description:
        "The AHU is running colder than target while occupancy and zone demand are tapering off.",
      impact: "Increase SAT by 0.5-1.0°C to reduce coil and central plant energy.",
      priority: "high",
      reasoning:
        "GenAI reasoning: supply air is colder than required while zone comfort stays close to setpoint, so the twin recommends a warmer SAT reset.",
    });
  }

  if (system.kind === "AHU" && latest.chilledWaterSupplyTemp !== undefined && latest.chilledWaterSupplyTemp < 6.1) {
    insights.push({
      title: "Raise chilled-water supply temperature",
      description:
        "The AHU coil still has control authority, which means slightly warmer chilled water should still satisfy the zone.",
      impact: "Lift CHW supply temperature by about 0.5°C to reduce plant energy.",
      priority: "medium",
      reasoning:
        "GenAI reasoning: low CHW supply temperature with non-saturated valve behavior suggests the coil is over-served for the current load.",
    });
  }

  if (system.kind === "Chiller" && avgActualVsSetpoint < -0.1 && avgEfficiency < 0.7) {
    insights.push({
      title: "Raise chilled-water supply temperature",
      description:
        "The chiller is producing colder water than the current load profile appears to need.",
      impact: "A 0.5°C reset can improve plant kW/ton while maintaining coil authority.",
      priority: "high",
      reasoning:
        "GenAI reasoning: plant efficiency drops when leaving water is colder than the downstream coils currently require.",
    });
  }

  if (system.kind === "Pump" && avgActualVsSetpoint > 1.5) {
    insights.push({
      title: "Pump speed or DP reset",
      description:
        "Actual pump output is consistently above the pressure target for this loop.",
      impact: "Reset VFD speed to trim pumping energy during lower demand periods.",
      priority: "medium",
    });
  }

  if (system.kind === "Cooling Tower" && latest.healthScore < 70) {
    insights.push({
      title: "Tower thermal approach degradation",
      description:
        "Cooling tower leaving temperature remains elevated and the health score is degrading.",
      impact: "Inspect fan staging, fill fouling, and condenser water flow to recover efficiency.",
      priority: "high",
    });
  }

  if (insights.length === 0 && avgLoad < 70) {
    insights.push({
      title: "Stable operation",
      description: "This system is tracking its targets with acceptable efficiency and health.",
      impact: "Maintain current sequence and keep monitoring for occupancy-driven reset opportunities.",
      priority: "watch",
    });
  }

  return insights;
}

export function buildOverviewSnapshot(): OverviewSnapshot {
  const statusBuckets = airportFacility.systems.reduce<Record<FacilitySystem["status"], number>>(
    (acc, system) => {
      acc[system.status] += 1;
      return acc;
    },
    { optimal: 0, watch: 0, alert: 0 }
  );

  const points = airportFacility.systems[0].telemetry.length;
  const powerSeries = Array.from({ length: points }, (_, index) => {
    const row = airportFacility.systems.map((system) => system.telemetry[index]);
    return {
      time: formatTime(row[0].timestamp),
      totalPower: row.reduce((sum, item) => sum + item.powerKw, 0),
      avgEfficiency: average(row.map((item) => item.efficiency * 100)),
      occupancy: average(row.map((item) => item.occupancy)),
    };
  });

  const totalPowerNow = powerSeries.at(-1)?.totalPower ?? 0;
  const averageEfficiency = powerSeries.at(-1)?.avgEfficiency ?? 0;
  const totalDesign = airportFacility.systems.reduce((sum, system) => sum + system.designKw, 0);

  const metrics: OverviewMetric[] = [
    {
      label: "Connected systems",
      value: `${airportFacility.systems.length}`,
      detail: "AHUs, chiller plant, pumps, and cooling tower on one twin.",
    },
    {
      label: "Real-time HVAC power",
      value: `${totalPowerNow.toFixed(0)} kW`,
      detail: "Aggregated electrical demand across the facility network.",
    },
    {
      label: "Average efficiency",
      value: `${averageEfficiency.toFixed(0)}%`,
      detail: "Derived efficiency score across all tracked assets.",
    },
    {
      label: "Installed design capacity",
      value: `${totalDesign.toFixed(0)} kW`,
      detail: "Approximate connected HVAC capacity for the airport zones in view.",
    },
  ];

  const topInsights = airportFacility.systems
    .flatMap((system) =>
      buildSystemInsights(system).map((insight) => ({
        systemId: system.id,
        systemName: system.name,
        insight,
      }))
    )
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, watch: 2 };
      return rank[a.insight.priority] - rank[b.insight.priority];
    })
    .slice(0, 4);

  return {
    metrics,
    systemsByStatus: statusBuckets,
    powerSeries,
    topInsights,
  };
}

export function buildSystemSnapshot(systemId: string): SystemSnapshot | undefined {
  const system = airportFacility.systems.find((entry) => entry.id === systemId);
  if (!system) return undefined;

  const latest = system.telemetry.at(-1)!;
  const previous = system.telemetry.at(-2) ?? latest;
  const insights = buildSystemInsights(system);
  const trendData = system.telemetry.map((point) => ({
    time: formatTime(point.timestamp),
    powerKw: point.powerKw,
    efficiencyPct: point.efficiency * 100,
    loadPct: point.loadPct,
    healthScore: point.healthScore,
    setpoint: point.setpoint,
    actual: point.actual,
    flow: point.flow,
    occupancy: point.occupancy,
    supplyAirTemp: point.supplyAirTemp,
    returnAirTemp: point.returnAirTemp,
    chilledWaterSupplyTemp: point.chilledWaterSupplyTemp,
    chilledWaterReturnTemp: point.chilledWaterReturnTemp,
    zoneTemp: point.zoneTemp,
    valvePosition: point.valvePosition,
  }));

  const summaryCards: OverviewMetric[] = [
    {
      label: "Current power",
      value: `${latest.powerKw.toFixed(1)} kW`,
      detail: `Change vs previous interval ${(latest.powerKw - previous.powerKw).toFixed(1)} kW`,
    },
    {
      label: "Efficiency",
      value: formatPct(latest.efficiency * 100),
      detail: `Average for window ${formatPct(average(system.telemetry.map((point) => point.efficiency * 100)))}`,
    },
    {
      label: "Load",
      value: formatPct(latest.loadPct),
      detail: `${system.zone}, ${system.terminal}`,
    },
    {
      label: "Health score",
      value: `${latest.healthScore.toFixed(0)}`,
      detail: `AI confidence anchored on sensor consistency and control stability`,
    },
  ];

  const coolingLoad = calcCoolingLoadKw(latest.supplyAirTemp, latest.returnAirTemp, latest.flow);
  const satDelta = safeDelta(latest.returnAirTemp, latest.supplyAirTemp);
  const chwDelta = safeDelta(latest.chilledWaterReturnTemp, latest.chilledWaterSupplyTemp);

  const sensorCards: OverviewMetric[] = [
    {
      label: "Supply air temperature",
      value: latest.supplyAirTemp !== undefined ? formatTemp(latest.supplyAirTemp) : "N/A",
      detail: "Critical AHU discharge-air sensor for cooling control.",
    },
    {
      label: "Return air temperature",
      value: latest.returnAirTemp !== undefined ? formatTemp(latest.returnAirTemp) : "N/A",
      detail: "Shows entering load back from the occupied zone.",
    },
    {
      label: "CHW supply temperature",
      value: latest.chilledWaterSupplyTemp !== undefined ? formatTemp(latest.chilledWaterSupplyTemp) : "N/A",
      detail: "Water temperature delivered to the AHU cooling coil.",
    },
    {
      label: "Estimated cooling load",
      value: coolingLoad !== undefined ? `${coolingLoad.toFixed(1)} kW` : "N/A",
      detail:
        satDelta !== undefined
          ? `Computed from airflow and supply/return delta-T of ${satDelta.toFixed(1)}°C.`
          : "Derived KPI when supply/return temperatures are available.",
    },
    {
      label: "Zone comfort gap",
      value:
        latest.zoneTemp !== undefined && latest.zoneSetpoint !== undefined
          ? `${(latest.zoneTemp - latest.zoneSetpoint).toFixed(1)}°C`
          : "N/A",
      detail: "Difference between actual zone condition and comfort target.",
    },
    {
      label: "Coil / valve signal",
      value: latest.valvePosition !== undefined ? `${latest.valvePosition.toFixed(0)}%` : "N/A",
      detail:
        chwDelta !== undefined
          ? `CHW delta-T is ${chwDelta.toFixed(1)}°C across the coil.`
          : "Useful for checking whether the coil is saturated or has reset headroom.",
    },
  ];

  return {
    system,
    latest,
    previous,
    insights,
    summaryCards,
    sensorCards,
    trendData,
  };
}
