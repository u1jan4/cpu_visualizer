let processes = [];

const COLOR_PALETTE = [
  "#1976D2", "#388E3C", "#F57C00", "#7B1FA2", "#C62828",
  "#00897B", "#5D4037", "#FBC02D", "#455A64"
];

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("processes");
  if (saved) {
    processes = JSON.parse(saved);
    assignColors();
    renderAll();
  }
  showAlgorithmInfo();
});

function saveProcesses() {
  localStorage.setItem("processes", JSON.stringify(processes));
}

function assignColors() {
  processes.forEach((p, i) => p.color = COLOR_PALETTE[i % COLOR_PALETTE.length]);
}

function addProcess() {
  const pid = document.getElementById("pid").value.trim();
  const arrival = parseInt(document.getElementById("arrival").value);
  const burst = parseInt(document.getElementById("burst").value);
  const priority = parseInt(document.getElementById("priority").value) || 0;

  if (!pid || isNaN(arrival) || isNaN(burst)) {
    alert("Please fill all required fields!");
    return;
  }

  processes.push({ pid, arrival, burst, priority, remaining: burst });
  assignColors();
  saveProcesses();
  clearInputs("pid", "arrival", "burst", "priority");
  renderAll();
}

function clearInputs(...ids) {
  ids.forEach(id => document.getElementById(id).value = "");
}

function renderAll() {
  renderTaskList();
  buildLegend();
  renderProcessTable();
}

function renderTaskList() {
  const taskList = document.getElementById("task-list");
  taskList.innerHTML = "";

  processes.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<strong style="color:${p.color}">${p.pid}</strong> — Arrival: ${p.arrival}, Burst: ${p.burst}, Priority: ${p.priority}`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      processes = processes.filter(proc => proc !== p);
      saveProcesses();
      renderAll();
    };

    li.appendChild(removeBtn);
    taskList.appendChild(li);
  });
}

function showAlgorithmInfo() {
  const algo = document.getElementById("algorithm").value;
  const infoDiv = document.getElementById("algorithm-info");
  const infoTexts = {
    fcfs: "First Come First Serve: Executes the process that arrived first.",
    sjf: "Shortest Job First: Chooses the process with the smallest burst time.",
    srtf: "Shortest Remaining Time First: Like SJF but preemptive.",
    priority: "Priority Scheduling: Chooses the process with highest priority (smallest number).",
    rr: "Round Robin: Each process gets a time slice for fairness."
  };
  infoDiv.textContent = infoTexts[algo] || "";
}

document.getElementById("algorithm").addEventListener("change", showAlgorithmInfo);

function simulate() {
  const algo = document.getElementById("algorithm").value;
  const quantum = parseInt(document.getElementById("quantum").value) || 1;

  processes.forEach(p => p.remaining = p.burst);

  let gantt;
  switch(algo) {
    case "fcfs": gantt = fcfs(processes); break;
    case "sjf": gantt = sjf(processes); break;
    case "srtf": gantt = srtf(processes); break;
    case "priority": gantt = priorityScheduling(processes); break;
    case "rr": gantt = roundRobin(processes, quantum); break;
    default: gantt = [];
  }

  const metrics = calculateMetrics(gantt);
  renderMetrics(metrics);
  renderGanttAnimated(gantt);
}

function calculateMetrics(gantt) {
  const finishTimes = {};
  gantt.forEach(b => { if (b.pid !== "Idle") finishTimes[b.pid] = b.end; });

  const metrics = {};
  let totalBurst = 0;

  processes.forEach(p => {
    const tat = finishTimes[p.pid] - p.arrival;
    const wt = tat - p.burst;
    metrics[p.pid] = { waitingTime: wt, turnaroundTime: tat };
    totalBurst += p.burst;
  });

  const totalTime = gantt[gantt.length - 1]?.end || 0;
  metrics.cpuUtilization = ((totalBurst / totalTime) * 100).toFixed(2);
  metrics.totalTime = totalTime;
  return metrics;
}

function renderMetrics(metrics) {
  const tbody = document.querySelector("#metrics-table tbody");
  tbody.innerHTML = "";

  const maxWT = Math.max(...processes.map(p => metrics[p.pid].waitingTime));
  const minTAT = Math.min(...processes.map(p => metrics[p.pid].turnaroundTime));

  processes.forEach(p => {
    const tr = document.createElement("tr");
    if (metrics[p.pid].waitingTime === maxWT) tr.style.background = "#ffd6d6";
    if (metrics[p.pid].turnaroundTime === minTAT) tr.style.background = "#d6ffd6";

    tr.innerHTML = `
      <td><span style="background:${p.color};display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:5px;"></span>${p.pid}</td>
      <td>${metrics[p.pid].waitingTime}</td>
      <td>${metrics[p.pid].turnaroundTime}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("cpu-utilization").textContent =
    `CPU Utilization: ${metrics.cpuUtilization}% | Total Time: ${metrics.totalTime}`;
}

function fcfs(procs) {
  let time = 0, gantt = [];
  [...procs].sort((a, b) => a.arrival - b.arrival).forEach(p => {
    if (time < p.arrival) gantt.push({ pid: "Idle", start: time, end: p.arrival }), time = p.arrival;
    gantt.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
  });
  return gantt;
}

function sjf(procList) {
  const procs = procList.map(p => ({ ...p }));
  const gantt = [];
  const completed = [];
  let time = 0;

  while (completed.length < procs.length) {
    const available = procs.filter(p => p.arrival <= time && !completed.includes(p));
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }
    const next = available.reduce((a, b) => a.burst < b.burst ? a : b);
    gantt.push({ pid: next.pid, start: time, end: time + next.burst });
    completed.push(next);
    time += next.burst;
  }

  return gantt;
}

function srtf(procList) {
  const procs = procList.map(p => ({ ...p, remaining: p.burst }));
  const gantt = [];
  let time = 0, completed = 0;

  while (completed < procs.length) {
    const available = procs.filter(p => p.arrival <= time && p.remaining > 0);
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }
    const next = available.reduce((a, b) => a.remaining < b.remaining ? a : b);
    gantt.push({ pid: next.pid, start: time, end: time + 1 });
    next.remaining--;
    if (next.remaining === 0) completed++;
    time++;
  }

  return gantt.reduce((acc, curr) => {
    const last = acc[acc.length - 1];
    if (last && last.pid === curr.pid) last.end++;
    else acc.push({ ...curr });
    return acc;
  }, []);
}

function priorityScheduling(procList) {
  const procs = [...procList].sort((a, b) => a.arrival - b.arrival);
  const gantt = [];
  const completed = [];
  let time = 0;

  while (completed.length < procs.length) {
    const available = procs.filter(p => p.arrival <= time && !completed.includes(p));
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }
    const next = available.sort((a, b) => a.priority - b.priority)[0];
    gantt.push({ pid: next.pid, start: time, end: time + next.burst });
    completed.push(next);
    time += next.burst;
  }

  return gantt;
}

function roundRobin(procList, quantum) {
  const procs = procList.map(p => ({ ...p, remaining: p.burst }));
  const gantt = [];
  let time = 0, completed = 0;

  while (completed < procs.length) {
    let executed = false;
    for (const p of procs) {
      if (p.arrival <= time && p.remaining > 0) {
        const exec = Math.min(quantum, p.remaining);
        gantt.push({ pid: p.pid, start: time, end: time + exec });
        p.remaining -= exec;
        time += exec;
        executed = true;
        if (p.remaining === 0) completed++;
      }
    }
    if (!executed) {
      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      if (time < nextArrival) gantt.push({ pid: "Idle", start: time, end: nextArrival }), time = nextArrival;
      else time++;
    }
  }

  return gantt;
}

async function renderGanttAnimated(gantt, speed = 1) {
  const chart = document.getElementById("gantt-chart");
  const currentTimeDiv = document.getElementById("current-time");
  chart.innerHTML = "";
  currentTimeDiv.textContent = "Time: 0";

  const widthPerUnit = 40;

  for (const block of gantt) {
    const div = document.createElement("div");
    div.className = "process-block";
    Object.assign(div.style, {
      width: "0px",
      height: "40px",
      border: "2px solid #333",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "16px",
      borderRadius: "6px",
      background: block.pid === "Idle" ? "#bfbfbf" : (processes.find(p => p.pid === block.pid)?.color || "#999"),
      color: block.pid === "Idle" ? "#000" : "#fff",
    });
    div.textContent = block.pid;
    chart.appendChild(div);

    const totalUnits = block.end - block.start;
    const durationPerUnit = Math.max(400 / speed, 50);

    for (let i = 1; i <= totalUnits; i++) {
      await new Promise(res => setTimeout(res, durationPerUnit));
      div.style.width = widthPerUnit * i + "px";
      if (block.pid !== "Idle") {
        const p = processes.find(x => x.pid === block.pid);
        if (p) p.remaining = Math.max(p.remaining - 1, 0);
      }
      renderProcessTable();
      currentTimeDiv.textContent = `Time: ${block.start + i}`;
    }
  }
  currentTimeDiv.textContent = `Time: ${gantt[gantt.length - 1]?.end || 0}`;
}

function renderProcessTable() {
  const tbody = document.getElementById("process-table-body");
  tbody.innerHTML = "";
  processes.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span style="background:${p.color};display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:5px;"></span>${p.pid}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${Math.max(p.remaining, 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function buildLegend() {
  const legendContainer = document.getElementById("legend-items");
  if (!legendContainer) return;
  legendContainer.innerHTML = "";

  const items = [
    ...processes.map(p => ({ color: p.color, label: p.pid })),
    { color: "#bfbfbf", label: "Idle (CPU not working)" },
    { color: "#ffd6d6", label: "Highest waiting time", border: "#c00" },
    { color: "#d6ffd6", label: "Lowest turnaround time", border: "#0a0" },
  ];

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "legend-item";
    div.innerHTML = `<span class="legend-color" style="background:${item.color};${item.border ? "border:1px solid " + item.border : ""}"></span><span>${item.label}</span>`;
    legendContainer.appendChild(div);
  });
}
