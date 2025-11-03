let processes = [];

// 🎨 Unified dark, clear color palette
const COLOR_PALETTE = [
  "#1976D2", // blue
  "#388E3C", // green
  "#F57C00", // orange
  "#7B1FA2", // purple
  "#C62828", // red
  "#00897B", // teal
  "#5D4037", // brown
  "#FBC02D", // yellow
  "#455A64"  // gray-blue
];

// -------------------- INITIALIZATION --------------------
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("processes");
  if (saved) {
    processes = JSON.parse(saved);
    assignColors();
    renderTaskList();
    buildLegend();
  }
  showAlgorithmInfo();
});

function saveProcesses() {
  localStorage.setItem("processes", JSON.stringify(processes));
}

function assignColors() {
  processes.forEach((p, i) => p.color = COLOR_PALETTE[i % COLOR_PALETTE.length]);
}

// -------------------- PROCESS MANAGEMENT --------------------
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
  renderTaskList();
  buildLegend();

  ["pid","arrival","burst","priority"].forEach(id => document.getElementById(id).value = "");
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
      renderTaskList();
      buildLegend();
    };
    li.appendChild(removeBtn);
    taskList.appendChild(li);
  });
  buildLegend();
}

// -------------------- ALGORITHM INFO --------------------
function showAlgorithmInfo() {
  const algo = document.getElementById("algorithm").value;
  const infoDiv = document.getElementById("algorithm-info");
  const infoTexts = {
    fcfs: "First Come First Serve: The CPU executes the process that arrived first. Simple but can cause long waits.",
    sjf: "Shortest Job First: Chooses the process with the smallest burst time. Efficient but can cause starvation.",
    srtf: "Shortest Remaining Time First: Like SJF, but can interrupt if a shorter process arrives.",
    priority: "Priority Scheduling: Chooses the process with the highest priority (smallest number).",
    rr: "Round Robin: Gives each process a small slice of CPU time in turns — great for fairness."
  };
  infoDiv.textContent = infoTexts[algo];
}

document.getElementById("algorithm").addEventListener("change", showAlgorithmInfo);

// -------------------- SIMULATION --------------------
function simulate() {
  const algo = document.getElementById("algorithm").value;
  const quantum = parseInt(document.getElementById("quantum").value) || 1;

  processes.forEach(p => p.remaining = p.burst);

  let gantt = [];
  if (algo === "fcfs") gantt = fcfs(processes);
  else if (algo === "sjf") gantt = sjf(processes);
  else if (algo === "srtf") gantt = srtf(processes);
  else if (algo === "priority") gantt = priorityScheduling(processes);
  else if (algo === "rr") gantt = roundRobin(processes, quantum);

  const metrics = calculateMetrics(gantt, processes);
  renderMetrics(metrics);
  renderGanttAnimated(gantt);
}

// -------------------- METRICS --------------------
function calculateMetrics(gantt, procs) {
  const metrics = {};
  const finishTimes = {};

  gantt.forEach(block => {
    if (block.pid !== "Idle") finishTimes[block.pid] = block.end;
  });

  let totalBurst = 0;
  procs.forEach(p => {
    const tat = finishTimes[p.pid] - p.arrival;
    const wt = tat - p.burst;
    metrics[p.pid] = { waitingTime: wt, turnaroundTime: tat };
    totalBurst += p.burst;
  });

  const totalTime = gantt[gantt.length-1].end;
  const cpuUtil = ((totalBurst / totalTime) * 100).toFixed(2);

  metrics.cpuUtilization = cpuUtil;
  metrics.totalTime = totalTime;
  return metrics;
}

function renderMetrics(metrics) {
  const tbody = document.querySelector("#metrics-table tbody");
  tbody.innerHTML = "";

  // find highest waiting and lowest turnaround
  const wtValues = processes.map(p => metrics[p.pid].waitingTime);
  const tatValues = processes.map(p => metrics[p.pid].turnaroundTime);
  const maxWT = Math.max(...wtValues);
  const minTAT = Math.min(...tatValues);

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

// -------------------- ALGORITHMS --------------------
function fcfs(procList) {
  let sorted = [...procList].sort((a,b)=>a.arrival-b.arrival);
  let time = 0, gantt = [];
  for (let p of sorted) {
    if (time < p.arrival) {
      gantt.push({ pid: "Idle", start: time, end: p.arrival });
      time = p.arrival;
    }
    gantt.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
  }
  return gantt;
}

function sjf(procList) {
  let procs = [...procList].map(p => ({ ...p }));
  let time = 0, completed = [], gantt = [];
  while (completed.length < procs.length) {
    let available = procs.filter(p => p.arrival <= time && !completed.includes(p));
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }
    let next = available.reduce((prev, curr) => curr.burst < prev.burst ? curr : prev);
    gantt.push({ pid: next.pid, start: time, end: time + next.burst });
    completed.push(next);
    time += next.burst;
  }
  return gantt;
}

function srtf(procList) {
  let procs = procList.map(p => ({ ...p, remaining: p.burst }));
  let time = 0, completed = 0, gantt = [];
  while (completed < procs.length) {
    let available = procs.filter(p => p.arrival <= time && p.remaining > 0);
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }
    let next = available.reduce((prev, curr) => curr.remaining < prev.remaining ? curr : prev);
    gantt.push({ pid: next.pid, start: time, end: time + 1 });
    next.remaining--;
    if (next.remaining === 0) completed++;
    time++;
  }
  // Merge consecutive same PID blocks
  return gantt.reduce((acc, curr) => {
    const last = acc[acc.length-1];
    if (last && last.pid === curr.pid) last.end++;
    else acc.push({...curr});
    return acc;
  }, []);
}

function priorityScheduling(procList) {
  let procs = [...procList].sort((a,b)=>a.arrival-b.arrival), time=0, completed=[], gantt=[];
  while (completed.length < procs.length) {
    let available = procs.filter(p=>p.arrival<=time && !completed.includes(p));
    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p=>!completed.includes(p)).map(p=>p.arrival));
      gantt.push({ pid:"Idle", start:time, end:nextArrival });
      time = nextArrival;
      continue;
    }
    let next = available.sort((a,b)=>a.priority-b.priority)[0];
    gantt.push({ pid:next.pid, start:time, end:time+next.burst });
    completed.push(next);
    time += next.burst;
  }
  return gantt;
}

function roundRobin(procList, quantum) {
  let procs = procList.map(p=>({...p, remaining:p.burst}));
  let time=0, gantt=[], completed=0;
  while(completed<procs.length){
    let executed=false;
    for(let p of procs){
      if(p.arrival<=time && p.remaining>0){
        const exec=Math.min(quantum,p.remaining);
        gantt.push({pid:p.pid,start:time,end:time+exec});
        p.remaining-=exec;
        time+=exec;
        executed=true;
        if(p.remaining===0)completed++;
      }
    }
    if(!executed){
      const nextArrival=Math.min(...procs.filter(p=>p.remaining>0).map(p=>p.arrival));
      if(time<nextArrival){
        gantt.push({pid:"Idle",start:time,end:nextArrival});
        time=nextArrival;
      } else time++;
    }
  }
  return gantt;
}

// -------------------- VISUALIZATION --------------------
async function renderGanttAnimated(gantt, speed = 1) {
  const chart = document.getElementById("gantt-chart");
  const currentTimeDiv = document.getElementById("current-time");
  chart.innerHTML = "";
  currentTimeDiv.textContent = "Time: 0";

  const widthPerUnit = 40;
  for (let block of gantt) {
    const div = document.createElement("div");
    div.className = "process-block";
    div.style.width = "0px";
    div.style.height = "40px";
    div.style.border = "2px solid #333";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.fontWeight = "bold";
    div.style.fontSize = "16px";
    div.style.borderRadius = "6px";

    if (block.pid === "Idle") {
      div.style.background = "#bfbfbf";
      div.style.color = "#000";
      div.textContent = "Idle";
    } else {
      const p = processes.find(x => x.pid === block.pid);
      div.style.background = p ? p.color : "#999";
      div.style.color = "#fff";
      div.textContent = block.pid;
    }
    chart.appendChild(div);

    const duration = Math.max((block.end - block.start) * 400 / speed, 200);
    const totalWidth = (block.end - block.start) * widthPerUnit;
    await animateBlock(div, totalWidth, duration);
  }

  currentTimeDiv.textContent = `Time: ${gantt[gantt.length-1].end}`;
}

// animation helper
function animateBlock(element, targetWidth, duration) {
  return new Promise(resolve => {
    let start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.width = (targetWidth * progress) + "px";
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
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
      <td>${Math.max(p.remaining,0)}</td>`;
    tbody.appendChild(tr);
  });
}

function buildLegend() {
  const legendContainer = document.getElementById("legend-items");
  if (!legendContainer) return;
  legendContainer.innerHTML = "";

  // Regular process colors
  processes.forEach(p => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-color" style="background:${p.color};"></span>
      <span>${p.pid}</span>
    `;
    legendContainer.appendChild(item);
  });

  // Idle bar
  const idleItem = document.createElement("div");
  idleItem.className = "legend-item";
  idleItem.innerHTML = `<span class="legend-color" style="background:#bfbfbf;"></span><span>Idle (CPU not working)</span>`;
  legendContainer.appendChild(idleItem);



  const highWT = document.createElement("div");
  highWT.className = "legend-item";
  highWT.innerHTML = `<span class="legend-color" style="background:#ffd6d6;border:1px solid #c00;"></span><span>Highest waiting time</span>`;
  legendContainer.appendChild(highWT);

  const lowTAT = document.createElement("div");
  lowTAT.className = "legend-item";
  lowTAT.innerHTML = `<span class="legend-color" style="background:#d6ffd6;border:1px solid #0a0;"></span><span>Lowest turnaround time</span>`;
  legendContainer.appendChild(lowTAT);
}
