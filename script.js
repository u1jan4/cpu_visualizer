let processes = [];

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("processes");
  if (saved) {
    processes = JSON.parse(saved);
    renderTaskList();
  }
  showAlgorithmInfo();
});

function saveProcesses() {
  localStorage.setItem("processes", JSON.stringify(processes));
}

function addProcess() {
  const pid = document.getElementById("pid").value;
  const arrival = parseInt(document.getElementById("arrival").value);
  const burst = parseInt(document.getElementById("burst").value);
  const priority = parseInt(document.getElementById("priority").value) || 0;

  if (!pid || isNaN(arrival) || isNaN(burst)) {
    alert("Please fill all required fields!");
    return;
  }

  processes.push({ pid, arrival, burst, priority, remaining: burst });
  saveProcesses();
  renderTaskList();

  document.getElementById("pid").value = "";
  document.getElementById("arrival").value = "";
  document.getElementById("burst").value = "";
  document.getElementById("priority").value = "";
}


function renderTaskList() {
  const taskList = document.getElementById("task-list");
  taskList.innerHTML = "";
  processes.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.pid} — Arrival: ${p.arrival}, Burst: ${p.burst}, Priority: ${p.priority}`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      processes = processes.filter(proc => proc !== p);
      saveProcesses();
      renderTaskList();
    };
    li.appendChild(removeBtn);
    taskList.appendChild(li);
  });
}


function showAlgorithmInfo() {
  const algo = document.getElementById("algorithm").value;
  const infoDiv = document.getElementById("algorithm-info");
  const infoTexts = {
    fcfs: "FCFS: Executes processes in order of arrival. Non-preemptive.",
    sjf: "SJF: Executes process with shortest burst first. Non-preemptive.",
    srtf: "SRTF: Preemptive SJF. CPU may switch when a shorter process arrives.",
    priority: "Priority: Executes process with highest priority (lowest number).",
    rr: "Round Robin: Executes each process for a fixed quantum. Preemptive."
  };
  infoDiv.textContent = infoTexts[algo];
}

document.getElementById("algorithm").addEventListener("change", showAlgorithmInfo);


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
function calculateMetrics(gantt, procs) {
  const metrics = {};
  const finishTimes = {};

  gantt.forEach(block => finishTimes[block.pid] = block.end);

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

  processes.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.pid}</td>
      <td>${metrics[p.pid].waitingTime}</td>
      <td>${metrics[p.pid].turnaroundTime}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("cpu-utilization").textContent =
    `CPU Utilization: ${metrics.cpuUtilization}% | Total Time: ${metrics.totalTime}`;
}



function fcfs(procList) {
  let sorted = [...procList].sort((a,b)=>a.arrival-b.arrival);
  let time = 0, gantt = [];

  for (let p of sorted) {
    if (time < p.arrival) {
      gantt.push({ pid: "Idle", start: time, end: p.arrival });
      time = p.arrival;
    }
    let start = time;
    let end = start + p.burst;
    gantt.push({ pid: p.pid, start, end });
    time = end;
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
    let start = time;
    let end = start + next.burst;
    gantt.push({ pid: next.pid, start, end });
    completed.push(next);
    time = end;
  }

  return gantt;
}


function srtf(procList) {
  let procs = procList.map(p => ({ ...p, remaining: p.burst }));
  let time = 0, completed = 0, gantt = [];
  const n = procs.length;

  while (completed < n) {
    let available = procs.filter(p => p.arrival <= time && p.remaining > 0);

    if (available.length === 0) {

      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    let next = available.reduce((prev, curr) => curr.remaining < prev.remaining ? curr : prev);

    gantt.push({ pid: next.pid, start: time, end: time + 1 });
    next.remaining -= 1;
    time += 1;

    if (next.remaining === 0) completed++;
  }

  let merged = [];
  for (let i = 0; i < gantt.length; i++) {
    if (merged.length === 0) merged.push({ ...gantt[i] });
    else {
      let last = merged[merged.length - 1];
      if (last.pid === gantt[i].pid && last.end === gantt[i].start) last.end = gantt[i].end;
      else merged.push({ ...gantt[i] });
    }
  }

  return merged;
}


function priorityScheduling(procList) {
  let procs = [...procList].sort((a,b)=>a.arrival-b.arrival),
      time = 0,
      completed = [],
      gantt = [];

  while (completed.length < procs.length) {
    let available = procs.filter(p => p.arrival <= time && !completed.includes(p));

    if (!available.length) {
      const nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.arrival));
      if (time < nextArrival) {
        gantt.push({ pid: "Idle", start: time, end: nextArrival });
        time = nextArrival;
      }
      continue;
    }
    let next = available.sort((a,b)=>a.priority-b.priority)[0];
    let start = time, end = start + next.burst;
    gantt.push({ pid: next.pid, start, end });
    completed.push(next);
    time = end;
  }

  return gantt;
}


function roundRobin(procList, quantum) {
  let procs = procList.map(p => ({ ...p, remaining: p.burst }));
  let time = 0, gantt = [], completed = 0;
  const n = procs.length;

  while (completed < n) {
    let executed = false;

    for (let p of procs) {
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
      if (time < nextArrival) {
        gantt.push({ pid: "Idle", start: time, end: nextArrival });
        time = nextArrival;
      } else {
        time++;
      }
    }
  }

  return gantt;
}



async function renderGanttAnimated(gantt, speed = 1) {
  const chart = document.getElementById("gantt-chart");
  const currentTimeDiv = document.getElementById("current-time");
  const queueDiv = document.getElementById("queue-content");
  const currentProcDiv = document.getElementById("current-process");
  const tableBody = document.getElementById("process-table-body");

  chart.innerHTML = "";
  queueDiv.innerHTML = "";
  currentTimeDiv.textContent = "Time: 0";
  currentProcDiv.textContent = "CPU Idle";
  renderProcessTable();

  const colors = {};
  const palette = ["#007bff","#28a745","#ff9800","#9c27b0","#e91e63","#00bcd4","#795548"];
  processes.forEach((p,i) => colors[p.pid] = palette[i % palette.length]);

  const widthPerUnit = 40;

  for (let block of gantt) {
    const div = document.createElement("div");
    div.className = "process-block";
    div.style.width = "0px";
    div.style.height = "40px";
    div.style.background = colors[block.pid];
    div.style.border = "2px solid #333";
    div.style.borderRadius = "5px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.fontWeight = "bold";
    div.style.fontSize = "16px";
    div.style.color = "#fff";
    div.style.boxShadow = "0 0 5px transparent";
    div.textContent = block.pid;
    if (block.pid === "Idle") {
    div.style.background = "#ccc";
    div.style.color = "#000";
    div.textContent = "Idle";
  } else {
    const colors = {};
    const palette = ["#007bff","#28a745","#ff9800","#9c27b0","#e91e63","#00bcd4","#795548"];
    processes.forEach((p,i)=>colors[p.pid]=palette[i%palette.length]);
    div.style.background = colors[block.pid];
    div.style.color = "#fff";
    div.textContent = block.pid;
  }

    chart.appendChild(div);

    const duration = Math.max((block.end - block.start) * 400 / speed, 200);
    const totalWidth = (block.end - block.start) * widthPerUnit;

    const currentProcess = processes.find(p => p.pid === block.pid);

    await animateBlock(div, totalWidth, duration, (elapsedUnits) => {
      const currentTime = block.start + elapsedUnits;
      currentTimeDiv.textContent = `Time: ${currentTime}`;
      currentProcDiv.textContent = `CPU Running: ${block.pid}`;

      div.style.boxShadow = "0 0 10px #fff";

      const waiting = processes.filter(p => p.remaining > 0 && p.arrival <= currentTime && p.pid !== block.pid);
      queueDiv.innerHTML = "";
      waiting.forEach((w, idx) => {
        const wdiv = document.createElement("div");
        wdiv.style.display = "inline-block";
        wdiv.style.width = "40px";
        wdiv.style.height = "30px";
        wdiv.style.background = colors[w.pid];
        wdiv.style.margin = "2px";
        wdiv.style.color = "#fff";
        wdiv.style.textAlign = "center";
        wdiv.style.lineHeight = "30px";
        wdiv.style.borderRadius = "4px";
        wdiv.style.transition = "transform 0.2s";
        wdiv.style.transform = `translateY(${idx*0}px)`; // Can animate sliding
        wdiv.textContent = w.pid;
        queueDiv.appendChild(wdiv);
      });

      if (currentProcess) currentProcess.remaining -= (block.end - block.start);
      renderProcessTable();
    });

    div.style.boxShadow = "0 0 0px transparent";
    div.style.opacity = "0.8";
  }

  currentTimeDiv.textContent = `Time: ${gantt[gantt.length-1].end}`;
  currentProcDiv.textContent = "CPU Idle";
  queueDiv.innerHTML = "";
}



function animateBlock(element,targetWidth,duration,onProgress){
  return new Promise(resolve=>{
    let start=null;
    function step(timestamp){
      if(!start) start=timestamp;
      const progress=Math.min((timestamp-start)/duration,1);
      element.style.width=(targetWidth*progress)+"px";
      if(onProgress){
        const elapsedUnits=Math.floor(progress*(targetWidth/40));
        onProgress(elapsedUnits);
      }
      if(progress<1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}


function renderProcessTable(){
  const tbody=document.getElementById("process-table-body");
  tbody.innerHTML="";
  processes.forEach(p=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${Math.max(p.remaining,0)}</td>`;
    tbody.appendChild(tr);
  });
}
