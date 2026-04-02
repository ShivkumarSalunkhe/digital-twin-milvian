import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { Background, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { airportFacility } from "./data/facilityData";
import { buildOverviewSnapshot, buildSystemSnapshot } from "./lib/facilityAnalytics";

const statusColor = {
  optimal: "#7cb518",
  watch: "#ff9f1c",
  alert: "#ef476f",
};

const statusMixColor = {
  optimal: "#a8c686",
  watch: "#d8c29b",
  alert: "#d7a6b1",
};

const chartColors = {
  blue: "#8fb7d9",
  blueFill: "#8fb7d9",
  amber: "#d8c29b",
  mint: "#8ec8bf",
  sage: "#a8c686",
  coral: "#d9a38f",
  violet: "#b7acd9",
  cyan: "#8fbfca",
};

const tooltipStyle = {
  contentStyle: {
    background: "rgba(7, 18, 31, 0.96)",
    border: "1px solid rgba(143, 211, 232, 0.24)",
    borderRadius: "16px",
    color: "#edf4f2",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.32)",
  },
  labelStyle: {
    color: "#edf4f2",
    fontWeight: 600,
    marginBottom: 8,
  },
  itemStyle: {
    color: "#dbe7ea",
    paddingTop: 2,
    paddingBottom: 2,
  },
};

function formatTooltipValue(value: number | string, name?: string) {
  if (typeof value !== "number") {
    return [value, name ?? ""];
  }

  const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  return [rounded, name ?? ""];
}

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const suggestedQueries = [
  "Summarize the current AHU optimization opportunities",
  "What is the latest supply air and return air temperature for AHU-07?",
  "Which KPI shows the highest energy concern right now?",
  "Give me a quick summary of the overall HVAC system",
];

function buildAssistantReply(query: string) {
  const normalized = query.toLowerCase();
  const overview = buildOverviewSnapshot();
  const ahu07 = buildSystemSnapshot("ahu-07");
  const chiller = buildSystemSnapshot("chw-1");

  if (normalized.includes("supply air") || normalized.includes("return air") || normalized.includes("ahu-07")) {
    if (!ahu07) {
      return "AHU-07 data is not available in the mock twin right now.";
    }

    return `AHU-07 latest readings: supply air ${ahu07.latest.supplyAirTemp?.toFixed(1)}°C, return air ${ahu07.latest.returnAirTemp?.toFixed(1)}°C, chilled-water supply ${ahu07.latest.chilledWaterSupplyTemp?.toFixed(1)}°C, zone temperature ${ahu07.latest.zoneTemp?.toFixed(1)}°C, and valve position ${ahu07.latest.valvePosition?.toFixed(0)}%.`;
  }

  if (normalized.includes("optimization") || normalized.includes("temperature reset") || normalized.includes("setpoint")) {
    const topAhuInsight = ahu07?.insights[0];
    const topChillerInsight = chiller?.insights[0];
    return `Recommended optimizations: 1. ${topAhuInsight?.title ?? "Raise AHU supply-air temperature slightly"} to reduce overcooling while keeping comfort stable. 2. ${topChillerInsight?.title ?? "Raise chilled-water supply temperature slightly"} to reduce plant energy when coil demand is lower.`;
  }

  if (normalized.includes("kpi") || normalized.includes("energy concern") || normalized.includes("highest")) {
    return `The highest current energy concern is total HVAC demand at ${overview.metrics[1]?.value}. On the asset side, Chiller Plant 1 is the biggest electrical load, while AHU-07 shows the clearest reset opportunity from its temperature and valve behavior.`;
  }

  if (normalized.includes("summary") || normalized.includes("overall")) {
    return `System summary: the digital twin is monitoring ${overview.metrics[0]?.value} connected HVAC assets. Current total power is ${overview.metrics[1]?.value}, average efficiency is ${overview.metrics[2]?.value}, and the top priority is reducing unnecessary cooling by resetting AHU supply air and chilled-water temperatures.`;
  }

  return "This mock AI assistant can answer questions about AHU temperatures, KPI values, optimization opportunities, and overall HVAC system summaries. Try one of the suggested prompts.";
}

function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Ask me about AHU temperatures, KPI readings, system summary, or optimization opportunities. Click a suggested prompt to load it into the input, then send it.",
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: buildAssistantReply(trimmed) },
    ]);
    setDraft("");
    setOpen(true);
    setShowSuggestions(false);
  };

  return (
    <>
      <button
        type="button"
        className="ai-chat-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        <span className="ai-chat-toggle-icon">◎</span>
        <span>AI Chat</span>
      </button>
      {open ? (
        <section className="ai-chat-panel">
          <div className="ai-chat-header">
            <div>
              <p className="eyebrow">GenAI Assistant</p>
              <h3>Digital twin copilot</h3>
            </div>
            <button type="button" className="ai-chat-close" onClick={() => setOpen(false)} aria-label="Close AI chat">
              ×
            </button>
          </div>
          {showSuggestions ? (
            <>
              <div className="ai-chat-suggestions">
                {suggestedQueries.map((query) => (
                  <button key={query} type="button" className="ai-suggestion-chip" onClick={() => setDraft(query)}>
                    {query}
                  </button>
                ))}
              </div>
              <p className="ai-chat-note">
                Click a prompt to load it into the input, then press Ask AI to show the user and assistant exchange.
              </p>
            </>
          ) : null}
          <div className="ai-chat-messages">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`ai-message ${message.role}`}>
                <span className="ai-message-role">{message.role === "assistant" ? "AI" : "You"}</span>
                <p>{message.text}</p>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form
            className="ai-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
          >
            <div className="ai-chat-form-top">
              <button
                type="button"
                className="ai-chat-toggle-suggestions compact"
                onClick={() => setShowSuggestions((value) => !value)}
                aria-label={showSuggestions ? "Hide prompts" : "Show prompts"}
              >
                {showSuggestions ? "⌃" : "⌄"}
              </button>
            </div>
            <div className="ai-chat-composer">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about temperatures, KPIs, or optimization..."
              />
              <button type="submit" className="ai-send-button">
                ↑
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}

const pageNav = [
  { to: "/dashboard", label: "Dashboard", icon: "◫" },
  { to: "/systems", label: "Systems", icon: "◧" },
  { to: "/layout", label: "Layout", icon: "⌘" },
  { to: "/analytics", label: "Analytics", icon: "◔" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div>
          {sidebarOpen ? (
            <div>
              <p className="eyebrow">{airportFacility.facilityType} Twin</p>
              <h1>HVAC Digital Twin</h1>
            </div>
          ) : (
            <div className="sidebar-mini-title">HVAC</div>
          )}
          <div className="sidebar-toggle-row">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>
          {sidebarOpen ? (
            <p className="sidebar-copy">
              Page-based navigation for dashboard, layout, systems, analytics, and configuration.
            </p>
          ) : null}
        </div>
        <nav className="nav-list">
          {pageNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {sidebarOpen ? item.label : <span className="nav-icon-only">{item.icon}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className="panel metric-card">
          <p className="eyebrow">{metric.label}</p>
          <h3>{metric.value}</h3>
          <p>{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}

function Hero({
  eyebrow,
  title,
  copy,
  badges,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  badges: string[];
}) {
  return (
    <section className="hero panel">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="hero-copy">{copy}</p>
      </div>
      <div className="hero-badges">
        {badges.map((badge) => (
          <span key={badge}>{badge}</span>
        ))}
      </div>
    </section>
  );
}

function DashboardPage() {
  const snapshot = buildOverviewSnapshot();
  const pieData = [
    { name: "Optimal", value: snapshot.systemsByStatus.optimal, color: statusMixColor.optimal },
    { name: "Watch", value: snapshot.systemsByStatus.watch, color: statusMixColor.watch },
    { name: "Alert", value: snapshot.systemsByStatus.alert, color: statusMixColor.alert },
  ];

  return (
    <>
      <Hero
        eyebrow="Operations Dashboard"
        title={airportFacility.name}
        copy="GenAI-assisted digital twin for HVAC optimization. The prototype uses mock facility telemetry, derives KPIs from AHU and plant sensors, and surfaces simple energy-saving actions an operator could test."
        badges={["Front-end only", "Mock sensor data", "AI-generated optimization insights"]}
      />

      <MetricGrid metrics={snapshot.metrics} />

      <section className="chart-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Portfolio Load</p>
              <h2>Total HVAC demand vs occupancy</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={snapshot.powerSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis yAxisId="left" stroke="#c6d1cb" />
              <YAxis yAxisId="right" orientation="right" stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalPower"
                stroke={chartColors.blue}
                fill={chartColors.blueFill}
                fillOpacity={0.18}
                name="Total power (kW)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancy"
                stroke={chartColors.amber}
                strokeWidth={3}
                dot={false}
                name="Average occupancy (%)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </article>

        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Status Mix</p>
              <h2>Operational health distribution</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={106} paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="panel insights-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">GenAI Insight Feed</p>
            <h2>Immediate attention items</h2>
          </div>
        </div>
        <div className="insight-stack">
          {snapshot.topInsights.map((entry) => (
            <article key={`${entry.systemId}-${entry.insight.title}`} className="insight-card">
              <div className="insight-heading">
                <span className={`priority ${entry.insight.priority}`}>{entry.insight.priority}</span>
                <h3>{entry.systemName}</h3>
              </div>
              <p className="insight-title">{entry.insight.title}</p>
              <p>{entry.insight.description}</p>
              <p>
                <strong>Impact:</strong> {entry.insight.impact}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function SystemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "AHU";
  const systems = airportFacility.systems.filter((system) => ["AHU", "Chiller"].includes(system.kind));
  const visibleSystems = systems.filter((system) => system.kind === type);
  const selectedId = searchParams.get("system") ?? visibleSystems[0]?.id ?? systems[0]?.id ?? "";
  const snapshot = buildSystemSnapshot(selectedId);

  if (!snapshot) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Hero
        eyebrow="System Explorer"
        title="AHU and Chiller Screens"
        copy="This is the core assignment screen. It shows the digital twin of one AHU or chiller using mock sensor data, computes KPIs from that data, and recommends one or two simple optimization opportunities."
        badges={["Sensor monitoring", "KPI analytics", "GenAI recommendations"]}
      />

      <section className="panel selector-panel">
        <div className="system-tabs">
          {["AHU", "Chiller"].map((kind) => (
            <button
              key={kind}
              className={kind === type ? "tab-button active" : "tab-button"}
              onClick={() => navigate(`/systems?type=${kind}&system=${airportFacility.systems.find((item) => item.kind === kind)?.id ?? ""}`)}
            >
              {kind}
            </button>
          ))}
        </div>
        <div className="selector-row">
          <label className="selector-label">
            Select {type}
            <select
              value={selectedId}
              onChange={(event) => navigate(`/systems?type=${type}&system=${event.target.value}`)}
            >
              {visibleSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name} • {system.zone}
                </option>
              ))}
            </select>
          </label>
          <div className="selector-summary">
            <span className={`status-badge ${snapshot.system.status}`}>{snapshot.system.status}</span>
            <span>{snapshot.system.terminal}</span>
            <span>{snapshot.system.zone}</span>
          </div>
        </div>
      </section>

      <MetricGrid metrics={snapshot.summaryCards} />
      <section className="panel insights-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sensor Layer</p>
            <h2>Digital twin telemetry and derived KPIs</h2>
          </div>
        </div>
        <MetricGrid metrics={snapshot.sensorCards} />
      </section>

      <section className="chart-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Trend</p>
              <h2>Power and load</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={snapshot.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="powerKw" stroke={chartColors.blue} strokeWidth={3} dot={false} name="Power (kW)" />
              <Line type="monotone" dataKey="loadPct" stroke={chartColors.amber} strokeWidth={3} dot={false} name="Load (%)" />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Control</p>
              <h2>{snapshot.system.kind === "AHU" ? "Core AHU sensor temperatures" : "Setpoint vs actual"}</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={snapshot.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              {snapshot.system.kind === "AHU" ? (
                <>
                  <Line type="monotone" dataKey="supplyAirTemp" stroke={chartColors.blue} strokeWidth={3} dot={false} name="Supply air temp" />
                  <Line type="monotone" dataKey="returnAirTemp" stroke={chartColors.amber} strokeWidth={3} dot={false} name="Return air temp" />
                  <Line
                    type="monotone"
                    dataKey="chilledWaterSupplyTemp"
                    stroke={chartColors.violet}
                    strokeWidth={3}
                    dot={false}
                    name="CHW supply temp"
                  />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="setpoint" stroke={chartColors.violet} strokeWidth={3} dot={false} name="Target" />
                  <Line type="monotone" dataKey="actual" stroke={chartColors.coral} strokeWidth={3} dot={false} name="Actual" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Reliability</p>
              <h2>Health and efficiency</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={snapshot.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              <Bar dataKey="healthScore" fill={chartColors.sage} name="Health score" />
              <Bar dataKey="efficiencyPct" fill={chartColors.mint} name="Efficiency (%)" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="chart-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Demand Context</p>
              <h2>Flow and occupancy</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={snapshot.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="flow" stroke={chartColors.cyan} fill={chartColors.cyan} fillOpacity={0.2} name="Flow" />
              <Area type="monotone" dataKey="occupancy" stroke={chartColors.amber} fill={chartColors.amber} fillOpacity={0.12} name="Occupancy" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel insights-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Optimization Logic</p>
              <h2>AI recommendations</h2>
            </div>
          </div>
          <div className="insight-stack">
            {snapshot.insights.map((insight) => (
              <article key={insight.title} className="insight-card">
                <div className="insight-heading">
                  <span className={`priority ${insight.priority}`}>{insight.priority}</span>
                  <h3>{insight.title}</h3>
                </div>
                <p>{insight.description}</p>
                <p>
                  <strong>Expected result:</strong> {insight.impact}
                </p>
                {insight.reasoning ? (
                  <p>
                    <strong>Why the AI suggested this:</strong> {insight.reasoning}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function LayoutPage() {
  const zoneNodes: Node[] = [
    {
      id: "zone-roof",
      position: { x: 180, y: 40 },
      data: { label: "Roof Deck\nHeat rejection equipment" },
      draggable: false,
      selectable: false,
      style: {
        width: 360,
        height: 120,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255, 159, 28, 0.12)",
        color: "#edf4f2",
        display: "grid",
        placeItems: "center",
        fontSize: "16px",
        fontWeight: 700,
        whiteSpace: "pre-line",
      },
    },
    {
      id: "zone-a",
      position: { x: 40, y: 230 },
      data: { label: "Terminal A\nPassenger processing" },
      draggable: false,
      selectable: false,
      style: {
        width: 260,
        height: 220,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(58, 134, 255, 0.12)",
        color: "#edf4f2",
        display: "grid",
        placeItems: "center",
        fontSize: "16px",
        fontWeight: 700,
        whiteSpace: "pre-line",
      },
    },
    {
      id: "zone-b",
      position: { x: 360, y: 330 },
      data: { label: "Terminal B\nRetail and circulation" },
      draggable: false,
      selectable: false,
      style: {
        width: 260,
        height: 180,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(32, 201, 151, 0.12)",
        color: "#edf4f2",
        display: "grid",
        placeItems: "center",
        fontSize: "16px",
        fontWeight: 700,
        whiteSpace: "pre-line",
      },
    },
    {
      id: "zone-utility",
      position: { x: 720, y: 150 },
      data: { label: "Utility Plant\nCentral cooling equipment" },
      draggable: false,
      selectable: false,
      style: {
        width: 280,
        height: 300,
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(131, 56, 236, 0.12)",
        color: "#edf4f2",
        display: "grid",
        placeItems: "center",
        fontSize: "16px",
        fontWeight: 700,
        whiteSpace: "pre-line",
      },
    },
  ];

  const systemNodes: Node[] = [
    {
      id: "ahu-07-card",
      position: { x: 70, y: 330 },
      data: { label: "AHU-07\nSecurity Hall" },
      draggable: false,
      selectable: false,
      style: {
        width: 180,
        borderRadius: 20,
        border: "2px solid #d8c29b",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
    {
      id: "ahu-12-card",
      position: { x: 470, y: 480 },
      data: { label: "AHU-12\nRetail Concourse" },
      draggable: false,
      selectable: false,
      style: {
        width: 180,
        borderRadius: 20,
        border: "2px solid #a8c686",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
    {
      id: "chw-1-card",
      position: { x: 790, y: 250 },
      data: { label: "Chiller Plant 1\nEnergy Center" },
      draggable: false,
      selectable: false,
      style: {
        width: 200,
        borderRadius: 20,
        border: "2px solid #d8c29b",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
    {
      id: "pump-1-card",
      position: { x: 670, y: 390 },
      data: { label: "CHW Pump 1\nEast Loop" },
      draggable: false,
      selectable: false,
      style: {
        width: 180,
        borderRadius: 20,
        border: "2px solid #a8c686",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
    {
      id: "pump-2-card",
      position: { x: 670, y: 530 },
      data: { label: "CHW Pump 2\nWest Loop" },
      draggable: false,
      selectable: false,
      style: {
        width: 180,
        borderRadius: 20,
        border: "2px solid #d8c29b",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
    {
      id: "ct-1-card",
      position: { x: 870, y: 90 },
      data: { label: "Cooling Tower 1\nNorth Tower Deck" },
      draggable: false,
      selectable: false,
      style: {
        width: 200,
        borderRadius: 20,
        border: "2px solid #d7a6b1",
        background: "rgba(7, 18, 31, 0.95)",
        color: "#edf4f2",
        textAlign: "center",
        padding: "18px 12px",
        whiteSpace: "pre-line",
      },
    },
  ];

  const nodes = [...zoneNodes, ...systemNodes];
  const edges: Edge[] = [
    {
      id: "ahu07-to-pump2",
      source: "ahu-07-card",
      target: "pump-2-card",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(143, 183, 217, 0.9)" },
      style: { stroke: "rgba(143, 183, 217, 0.9)", strokeWidth: 2 },
    },
    {
      id: "ahu12-to-pump1",
      source: "ahu-12-card",
      target: "pump-1-card",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(143, 183, 217, 0.9)" },
      style: { stroke: "rgba(143, 183, 217, 0.9)", strokeWidth: 2 },
    },
    {
      id: "pump1-to-chiller",
      source: "pump-1-card",
      target: "chw-1-card",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(168, 198, 134, 0.9)" },
      style: { stroke: "rgba(168, 198, 134, 0.9)", strokeWidth: 2 },
    },
    {
      id: "pump2-to-chiller",
      source: "pump-2-card",
      target: "chw-1-card",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(168, 198, 134, 0.9)" },
      style: { stroke: "rgba(168, 198, 134, 0.9)", strokeWidth: 2 },
    },
    {
      id: "chiller-to-tower",
      source: "chw-1-card",
      target: "ct-1-card",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(216, 194, 155, 0.9)" },
      style: { stroke: "rgba(216, 194, 155, 0.9)", strokeWidth: 2 },
    },
  ];

  return (
    <>
      <Hero
        eyebrow="Facility Layout"
        title={`${airportFacility.facilityType} system installation view`}
        copy="This page is only for spatial context. It shows where the systems are installed across the facility layout using a popular graph/layout component."
        badges={["Powered by React Flow", "Airport layout context", "System interconnections"]}
      />

      <section className="panel layout-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Installed Locations</p>
            <h2>Simple facility layout</h2>
          </div>
        </div>
        <div className="layout-legend">
          <span className="legend-chip airport">Air-side zones</span>
          <span className="legend-chip utility">Plant-side zones</span>
          <span className="legend-chip rooftop">Simple placement view</span>
        </div>
        <div className="reactflow-shell simple-layout-shell">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnDrag={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="rgba(255,255,255,0.08)" />
          </ReactFlow>
        </div>
      </section>
    </>
  );
}

function AnalyticsPage() {
  const snapshot = buildOverviewSnapshot();
  const systemPerf = airportFacility.systems.map((system) => {
    const latest = system.telemetry.at(-1)!;
    return {
      name: system.name,
      powerKw: latest.powerKw,
      efficiencyPct: latest.efficiency * 100,
      healthScore: latest.healthScore,
    };
  });

  const optimizationTechniques = [
    {
      name: "Supply-Air Temperature Reset",
      when: "AHU actual temperature runs colder than setpoint while occupancy drops.",
      outcome: "Reduces coil load and chiller energy without comfort impact.",
    },
    {
      name: "Chilled-Water Temperature Reset",
      when: "Chiller is maintaining colder water than coil demand requires.",
      outcome: "Improves plant efficiency and lowers compressor lift.",
    },
    {
      name: "Pump DP / VFD Reset",
      when: "Pumps are overshooting pressure targets during partial load.",
      outcome: "Trims pumping energy and reduces unnecessary flow.",
    },
    {
      name: "Cooling Tower Performance Recovery",
      when: "Tower health degrades and actual condenser temperature stays elevated.",
      outcome: "Restores heat rejection and improves overall plant COP.",
    },
  ];

  return (
    <>
      <Hero
        eyebrow="Fleet Analytics"
        title="Overall system analysis and optimization"
        copy="This page summarizes how the GenAI twin turns raw telemetry into cross-system analysis. It highlights where the system is using energy and which optimization techniques are worth testing first."
        badges={["Fleet view", "Optimization methods", "Cross-system comparison"]}
      />

      <section className="chart-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Efficiency Trend</p>
              <h2>Average efficiency across the plant</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={snapshot.powerSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" stroke="#c6d1cb" />
              <YAxis stroke="#c6d1cb" />
              <Tooltip formatter={formatTooltipValue} {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="avgEfficiency" stroke={chartColors.mint} strokeWidth={3} dot={false} name="Average efficiency (%)" />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Asset Comparison</p>
              <h2>Power vs health by asset</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={systemPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="#c6d1cb" interval={0} angle={-10} textAnchor="end" height={70} />
              <YAxis stroke="#c6d1cb" />
              <Tooltip />
              <Legend />
              <Bar dataKey="powerKw" fill={chartColors.blue} name="Power (kW)" />
              <Bar dataKey="healthScore" fill={chartColors.sage} name="Health score" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="panel insights-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Optimization Techniques</p>
            <h2>Recommended control strategies</h2>
          </div>
        </div>
        <div className="insight-stack">
          {optimizationTechniques.map((item) => (
            <article key={item.name} className="insight-card">
              <h3>{item.name}</h3>
              <p>
                <strong>Apply when:</strong> {item.when}
              </p>
              <p>
                <strong>Expected outcome:</strong> {item.outcome}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function SettingsPage() {
  const settings = [
    ["Facility template", `${airportFacility.facilityType} layout with terminal + utility zoning`],
    ["Data mode", "Mock telemetry replay at 15-minute intervals"],
    ["Alert threshold", "Health score below 75 creates watch, below 70 creates alert"],
    ["Optimization policy", "Conservative reset logic with comfort-first bias"],
    ["Digital twin scope", "AHUs, chiller plant, pumps, and cooling tower"],
  ];

  return (
    <>
      <Hero
        eyebrow="Configuration"
        title="Twin settings and assumptions"
        copy="This page explains the prototype assumptions: facility template, telemetry mode, threshold policy, and optimization rules used by the digital twin."
        badges={["Prototype settings", "Mock-data assumptions", "Control policy"]}
      />

      <section className="panel settings-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Current configuration</h2>
          </div>
        </div>
        <div className="settings-grid">
          {settings.map(([label, value]) => (
            <article key={label} className="setting-card">
              <p className="eyebrow">{label}</p>
              <h3>{value}</h3>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/layout" element={<LayoutPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <AiChatWidget />
    </>
  );
}
