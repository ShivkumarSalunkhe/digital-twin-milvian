# AHU Digital Twin Prototype

This project is a front-end-only React + TypeScript prototype for an interview assignment. It is framed as a GenAI-assisted digital twin focused on AHU energy optimization using mock sensor telemetry and AI-style recommendations.

## What the prototype shows

- A facility overview page for an airport terminal plant
- A map-style view showing where AHUs, pumps, chiller plant, and cooling tower are installed
- A dedicated system screen for AHUs and chillers with tabs and dropdown selection
- Analytics built with `Recharts`
- Mock telemetry for supply air temperature, return air temperature, chilled-water supply temperature, airflow, power, occupancy, valve position, and zone conditions
- Derived KPIs such as estimated cooling load, comfort gap, coil delta-T, and efficiency
- GenAI-style reasoning text that explains why a recommendation is being made
- Optimization opportunities across multiple systems, including:
  - supply-air temperature reset
  - chilled-water supply temperature reset
  - pump differential pressure reset
  - cooling tower performance investigation

## Why this qualifies as a digital twin

The interface does more than show raw sensor values. It creates a digital representation of the AHU and connected HVAC systems, computes behavior from telemetry, maps those systems to their physical location, and translates that behavior into AI-generated operator actions that could reduce energy use while preserving comfort.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, typically `http://localhost:5173`.

## Build for production

```bash
npm run build
npm run preview
```

## Assignment framing

The prototype keeps the optimization logic practical and close to the assignment:

1. Monitor AHU supply air temperature, return air temperature, and chilled-water supply temperature from mock sensors.
2. Compute KPIs such as cooling load, comfort gap, valve position, and efficiency.
3. Recommend one or two simple optimizations:
   - raise the AHU supply-air temperature setpoint slightly
   - increase chilled-water supply temperature slightly when the coil still has control headroom
4. Show GenAI-style reasoning for why each recommendation was produced.

This makes the project look more like a real digital twin product while staying within the interviewer’s request for a front-end-only prototype with mock data.
