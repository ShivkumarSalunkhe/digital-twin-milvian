export type SystemKind = "AHU" | "Chiller" | "Boiler" | "Cooling Tower" | "Pump";

export type TelemetryPoint = {
  timestamp: string;
  powerKw: number;
  efficiency: number;
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
  zoneSetpoint?: number;
  valvePosition?: number;
};

export type FacilitySystem = {
  id: string;
  name: string;
  kind: SystemKind;
  terminal: string;
  zone: string;
  x: number;
  y: number;
  status: "optimal" | "watch" | "alert";
  designKw: number;
  connectedTo: string[];
  telemetry: TelemetryPoint[];
};

export type AirportFacility = {
  name: string;
  city: string;
  facilityType: "Airport" | "Mall";
  areaSqFt: string;
  systems: FacilitySystem[];
};

const start = new Date("2026-04-01T06:00:00Z").getTime();

const buildSeries = (
  points: number,
  seed: {
    basePower: number;
    baseEfficiency: number;
    baseLoad: number;
    baseHealth: number;
    baseSetpoint: number;
    baseActual: number;
    baseFlow: number;
    occupancy: number;
    baseSupplyAirTemp?: number;
    baseReturnAirTemp?: number;
    baseChilledWaterSupplyTemp?: number;
    baseChilledWaterReturnTemp?: number;
    baseZoneTemp?: number;
    baseZoneSetpoint?: number;
    baseValvePosition?: number;
  },
  deltas: Partial<Record<keyof Omit<TelemetryPoint, "timestamp">, number[]>>
): TelemetryPoint[] =>
  Array.from({ length: points }, (_, index) => ({
    timestamp: new Date(start + index * 15 * 60 * 1000).toISOString(),
    powerKw: seed.basePower + (deltas.powerKw?.[index] ?? 0),
    efficiency: seed.baseEfficiency + (deltas.efficiency?.[index] ?? 0),
    loadPct: seed.baseLoad + (deltas.loadPct?.[index] ?? 0),
    healthScore: seed.baseHealth + (deltas.healthScore?.[index] ?? 0),
    setpoint: seed.baseSetpoint + (deltas.setpoint?.[index] ?? 0),
    actual: seed.baseActual + (deltas.actual?.[index] ?? 0),
    flow: seed.baseFlow + (deltas.flow?.[index] ?? 0),
    occupancy: seed.occupancy + (deltas.occupancy?.[index] ?? 0),
    supplyAirTemp: seed.baseSupplyAirTemp !== undefined ? seed.baseSupplyAirTemp + (deltas.supplyAirTemp?.[index] ?? 0) : undefined,
    returnAirTemp: seed.baseReturnAirTemp !== undefined ? seed.baseReturnAirTemp + (deltas.returnAirTemp?.[index] ?? 0) : undefined,
    chilledWaterSupplyTemp:
      seed.baseChilledWaterSupplyTemp !== undefined
        ? seed.baseChilledWaterSupplyTemp + (deltas.chilledWaterSupplyTemp?.[index] ?? 0)
        : undefined,
    chilledWaterReturnTemp:
      seed.baseChilledWaterReturnTemp !== undefined
        ? seed.baseChilledWaterReturnTemp + (deltas.chilledWaterReturnTemp?.[index] ?? 0)
        : undefined,
    zoneTemp: seed.baseZoneTemp !== undefined ? seed.baseZoneTemp + (deltas.zoneTemp?.[index] ?? 0) : undefined,
    zoneSetpoint: seed.baseZoneSetpoint !== undefined ? seed.baseZoneSetpoint + (deltas.zoneSetpoint?.[index] ?? 0) : undefined,
    valvePosition:
      seed.baseValvePosition !== undefined ? seed.baseValvePosition + (deltas.valvePosition?.[index] ?? 0) : undefined,
  }));

export const airportFacility: AirportFacility = {
  name: "North Gateway International Airport",
  city: "Bengaluru",
  facilityType: "Airport",
  areaSqFt: "4.2M",
  systems: [
    {
      id: "ahu-07",
      name: "AHU-07",
      kind: "AHU",
      terminal: "Terminal A",
      zone: "Security Hall",
      x: 22,
      y: 38,
      status: "watch",
      designKw: 285,
      connectedTo: ["chw-1", "pump-2"],
      telemetry: buildSeries(
        16,
        {
          basePower: 83,
          baseEfficiency: 0.79,
          baseLoad: 71,
          baseHealth: 84,
          baseSetpoint: 12,
          baseActual: 11.7,
          baseFlow: 16900,
          occupancy: 88,
          baseSupplyAirTemp: 12.2,
          baseReturnAirTemp: 24.9,
          baseChilledWaterSupplyTemp: 5.9,
          baseChilledWaterReturnTemp: 11.8,
          baseZoneTemp: 23.4,
          baseZoneSetpoint: 22.5,
          baseValvePosition: 78,
        },
        {
          powerKw: [8, 7, 6, 6, 5, 4, 3, 2, 2, 1, 0, -1, -2, -2, -3, -4],
          efficiency: [-0.05, -0.04, -0.04, -0.03, -0.03, -0.03, -0.02, -0.02, -0.01, -0.01, 0, 0, 0.01, 0.01, 0.01, 0.02],
          loadPct: [14, 13, 13, 11, 10, 9, 8, 7, 6, 5, 3, 2, 1, 0, -2, -3],
          healthScore: [0, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2, -2, -2, -2, -3],
          actual: [1.2, 1.1, 1, 0.9, 0.9, 0.8, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0, -0.1, -0.1],
          flow: [700, 650, 620, 580, 520, 480, 430, 380, 310, 260, 210, 170, 130, 80, 0, -60],
          occupancy: [8, 8, 8, 7, 6, 6, 5, 4, 4, 2, 1, 0, -2, -4, -6, -8],
          supplyAirTemp: [0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0, -0.1, -0.2, -0.2, -0.3, -0.3, -0.4, -0.4, -0.5],
          returnAirTemp: [0.8, 0.7, 0.7, 0.6, 0.5, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1, 0, -0.1, -0.2, -0.3, -0.4],
          chilledWaterSupplyTemp: [0.1, 0.1, 0.1, 0.1, 0, 0, 0, -0.1, -0.1, -0.1, -0.1, -0.1, -0.2, -0.2, -0.2, -0.2],
          chilledWaterReturnTemp: [1.1, 1, 0.9, 0.8, 0.8, 0.7, 0.6, 0.5, 0.5, 0.4, 0.4, 0.3, 0.2, 0.2, 0.1, 0],
          zoneTemp: [0.7, 0.7, 0.6, 0.6, 0.5, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0, -0.1, -0.1],
          valvePosition: [8, 7, 7, 6, 6, 5, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4],
        }
      ),
    },
    {
      id: "ahu-12",
      name: "AHU-12",
      kind: "AHU",
      terminal: "Terminal B",
      zone: "Retail Concourse",
      x: 58,
      y: 54,
      status: "optimal",
      designKw: 245,
      connectedTo: ["chw-1", "pump-1"],
      telemetry: buildSeries(
        16,
        {
          basePower: 68,
          baseEfficiency: 0.86,
          baseLoad: 62,
          baseHealth: 92,
          baseSetpoint: 12.5,
          baseActual: 12.4,
          baseFlow: 14100,
          occupancy: 73,
          baseSupplyAirTemp: 12.6,
          baseReturnAirTemp: 24.1,
          baseChilledWaterSupplyTemp: 6.1,
          baseChilledWaterReturnTemp: 11.1,
          baseZoneTemp: 22.8,
          baseZoneSetpoint: 22.5,
          baseValvePosition: 62,
        },
        {
          powerKw: [4, 4, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -2, -2, -3, -3],
          efficiency: [0, 0, 0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03],
          loadPct: [6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0],
          actual: [0.1, 0.1, 0, 0, 0, -0.1, -0.1, -0.1, -0.2, -0.2, -0.2, -0.2, -0.3, -0.3, -0.3, -0.3],
          flow: [400, 400, 350, 320, 300, 260, 220, 180, 120, 80, 50, 20, -40, -70, -110, -130],
          occupancy: [4, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -2, -2, -3],
          supplyAirTemp: [0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0, 0, -0.1, -0.1, -0.2, -0.2, -0.3, -0.3, -0.3, -0.4],
          returnAirTemp: [0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0, 0, -0.1, -0.1, -0.2, -0.2, -0.3, -0.3],
          chilledWaterSupplyTemp: [0.2, 0.2, 0.1, 0.1, 0.1, 0, 0, 0, -0.1, -0.1, -0.1, -0.1, -0.2, -0.2, -0.2, -0.2],
          chilledWaterReturnTemp: [0.8, 0.8, 0.7, 0.7, 0.6, 0.6, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0],
          zoneTemp: [0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0, 0, 0, -0.1, -0.1, -0.1, -0.2, -0.2],
          valvePosition: [5, 5, 4, 4, 4, 3, 3, 2, 2, 1, 0, 0, -1, -1, -2, -2],
        }
      ),
    },
    {
      id: "chw-1",
      name: "Chiller Plant 1",
      kind: "Chiller",
      terminal: "Central Utility",
      zone: "Energy Center",
      x: 82,
      y: 26,
      status: "watch",
      designKw: 1120,
      connectedTo: ["ahu-07", "ahu-12", "pump-1", "pump-2", "ct-1"],
      telemetry: buildSeries(
        16,
        {
          basePower: 406,
          baseEfficiency: 0.68,
          baseLoad: 74,
          baseHealth: 81,
          baseSetpoint: 6,
          baseActual: 5.8,
          baseFlow: 2520,
          occupancy: 82,
          baseChilledWaterSupplyTemp: 5.8,
          baseChilledWaterReturnTemp: 11.9,
        },
        {
          powerKw: [36, 34, 32, 30, 26, 22, 18, 14, 10, 7, 4, 2, -1, -4, -8, -12],
          efficiency: [-0.08, -0.08, -0.07, -0.07, -0.06, -0.05, -0.05, -0.04, -0.04, -0.03, -0.02, -0.01, -0.01, 0, 0.01, 0.02],
          loadPct: [14, 14, 13, 13, 12, 11, 10, 8, 7, 6, 4, 3, 1, 0, -2, -4],
          healthScore: [0, -1, -1, -1, -1, -1, -2, -2, -2, -2, -3, -3, -3, -3, -4, -4],
          actual: [0.4, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0, 0, 0, 0, -0.1, -0.1],
          flow: [140, 140, 130, 120, 110, 100, 90, 80, 60, 50, 40, 30, 20, 0, -20, -40],
          chilledWaterSupplyTemp: [0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0, 0, 0, -0.1, -0.1, -0.1, -0.2, -0.2],
          chilledWaterReturnTemp: [1.3, 1.2, 1.2, 1.1, 1.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0],
        }
      ),
    },
    {
      id: "pump-1",
      name: "CHW Pump 1",
      kind: "Pump",
      terminal: "Central Utility",
      zone: "East Loop",
      x: 72,
      y: 42,
      status: "optimal",
      designKw: 190,
      connectedTo: ["chw-1", "ahu-12"],
      telemetry: buildSeries(
        16,
        {
          basePower: 52,
          baseEfficiency: 0.88,
          baseLoad: 58,
          baseHealth: 93,
          baseSetpoint: 72,
          baseActual: 70,
          baseFlow: 1310,
          occupancy: 80,
        },
        {
          powerKw: [4, 4, 3, 3, 3, 2, 2, 1, 1, 0, 0, -1, -1, -2, -2, -3],
          efficiency: [0, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04],
          loadPct: [6, 6, 5, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, -1],
          actual: [2, 2, 2, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1, -2, -2, -2],
          flow: [90, 90, 80, 80, 70, 60, 50, 40, 40, 20, 10, 0, -20, -30, -40, -50],
        }
      ),
    },
    {
      id: "pump-2",
      name: "CHW Pump 2",
      kind: "Pump",
      terminal: "Central Utility",
      zone: "West Loop",
      x: 72,
      y: 58,
      status: "watch",
      designKw: 190,
      connectedTo: ["chw-1", "ahu-07"],
      telemetry: buildSeries(
        16,
        {
          basePower: 61,
          baseEfficiency: 0.77,
          baseLoad: 63,
          baseHealth: 82,
          baseSetpoint: 72,
          baseActual: 76,
          baseFlow: 1380,
          occupancy: 83,
        },
        {
          powerKw: [6, 6, 5, 5, 4, 4, 3, 3, 2, 1, 1, 0, -1, -1, -2, -3],
          efficiency: [-0.04, -0.04, -0.04, -0.03, -0.03, -0.03, -0.03, -0.02, -0.02, -0.02, -0.01, -0.01, 0, 0, 0.01, 0.01],
          loadPct: [7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 2, 2, 1, 0, -1, -2],
          healthScore: [0, 0, -1, -1, -1, -1, -1, -2, -2, -2, -2, -2, -2, -3, -3, -3],
          actual: [5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 0],
          flow: [120, 120, 110, 110, 100, 90, 80, 70, 60, 40, 30, 10, -10, -30, -40, -50],
        }
      ),
    },
    {
      id: "ct-1",
      name: "Cooling Tower 1",
      kind: "Cooling Tower",
      terminal: "Roof Utility",
      zone: "North Tower Deck",
      x: 88,
      y: 10,
      status: "alert",
      designKw: 340,
      connectedTo: ["chw-1"],
      telemetry: buildSeries(
        16,
        {
          basePower: 118,
          baseEfficiency: 0.61,
          baseLoad: 79,
          baseHealth: 68,
          baseSetpoint: 28,
          baseActual: 30.2,
          baseFlow: 980,
          occupancy: 82,
        },
        {
          powerKw: [10, 10, 9, 9, 8, 8, 6, 6, 5, 4, 4, 3, 2, 1, 0, -1],
          efficiency: [-0.06, -0.06, -0.06, -0.05, -0.05, -0.04, -0.04, -0.03, -0.03, -0.02, -0.02, -0.01, -0.01, 0, 0.01, 0.01],
          loadPct: [12, 12, 11, 11, 10, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
          healthScore: [0, -1, -1, -1, -2, -2, -2, -3, -3, -3, -4, -4, -4, -5, -5, -5],
          actual: [1.8, 1.8, 1.7, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1, 1, 0.9, 0.8, 0.8, 0.8],
          flow: [80, 80, 70, 70, 60, 60, 50, 40, 30, 20, 20, 10, 0, -10, -20, -20],
        }
      ),
    },
  ],
};
