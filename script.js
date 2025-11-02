let processes = [];

// Add a process
function addProcess() {
  const pid = document.getElementById("pid").value;
  const arrival = parseInt(document.getElementById("arrival").value);
  const burst = parseInt(document.getElementById("burst").value);
  const priority = parseInt(document.getElementById("priority").value) || 0;

  if (!pid || isNaN(arrival) || isNaN(burst)) {
    alert("Please fill all required fields!");
    return;
  }

  processes.push({ pid, arrival, burst, priority });
  renderTaskList();

  document.getElementById("pid").value = "";
  document.getElementById("arrival").value = "";
  document.getElementById("burst").value = "";
  document.getElementById("priority").value = "";
}

// Render the visual task list
function renderTaskList() {
  const taskList = document.getElementById("task-list");
  taskList.innerHTML = "";

  processes.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p.pid} — Arrival: ${p.arrival}, Burst: ${p.burst}, Priority: ${p.priority}`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      processes = processes.filter(proc => proc !== p);
      renderTaskList();
    };

    li.appendChild(removeBtn);
    taskList.appendChild(li);
  });
}

// Simulate selected algorithm
function simulate() {
  const algo = document.getElementById("algorithm").value;
  let gantt = [];

  if (algo === "fcfs") gantt = fcfs(processes);
  else if (algo === "sjf") gantt = sjf(processes);
  else if (algo === "srtf") gantt = srtf(processes);
  else if (algo === "priority") gantt = priorityScheduling(processes);
  else if (algo === "rr") {
    const quantum = parseInt(document.getElementById("quantum").value);
    if (!quantum || quantum <= 0) {
      alert("Please enter a valid quantum for Round Robin!");
      return;
    }
    gantt = roundRobin(processes, quantum);
  }

  renderGantt(gantt);
}

// --- Scheduling Algorithms ---

function fcfs(procList) {
  let processes = [...procList].sort((a, b) => a.arrival - b.arrival);
  let time = 0, gantt = [];

  for (let p of processes) {
    let start = Math.max(time, p.arrival);
    let end = start + p.burst;
    gantt.push({ pid: p.pid, start, end });
    time = end;
  }
  return gantt;
}

function sjf(procList) {
  let processes = [...procList].sort((a, b) => a.arrival - b.arrival);
  let time = 0, completed = [], gantt = [];

  while (completed.length < processes.length) {
    let available = processes.filter(p => p.arrival <= time && !completed.includes(p));
    if (available.length === 0) { time++; continue; }

    let next = available.sort((a, b) => a.burst - b.burst)[0];
    let start = time;
    let end = start + next.burst;
    gantt.push({ pid: next.pid, start, end });
    completed.push(next);
    time = end;
  }
  return gantt;
}

function srtf(procList) {
  let processes = [...procList].map(p => ({ ...p, remaining: p.burst }));
  let time = 0, completed = 0, gantt = [], current = null, lastTime = 0;

  while (completed < processes.length) {
    let available = processes.filter(p => p.arrival <= time && p.remaining > 0);
    if (available.length === 0) { time++; continue; }

    available.sort((a, b) => a.remaining - b.remaining);
    let next = available[0];

    if (current !== next) {
      if (current !== null && lastTime < time) {
        gantt.push({ pid: current.pid, start: lastTime, end: time });
      }
      current = next;
      lastTime = time;
    }

    next.remaining--;
    time++;

    if (next.remaining === 0) {
      gantt.push({ pid: next.pid, start: lastTime, end: time });
      completed++;
      current = null;
    }
  }
  return gantt;
}

function priorityScheduling(procList) {
  let processes = [...procList].sort((a, b) => a.arrival - b.arrival);
  let time = 0, gantt = [], completed = [];

  while (completed.length < processes.length) {
    let available = processes.filter(p => p.arrival <= time && !completed.includes(p));
    if (available.length === 0) { time++; continue; }

    let next = available.sort((a, b) => a.priority - b.priority)[0];
    let start = time;
    let end = start + next.burst;
    gantt.push({ pid: next.pid, start, end });
    completed.push(next);
    time = end;
  }
  return gantt;
}

function roundRobin(procList, quantum) {
  let queue = [...procList].sort((a, b) => a.arrival - b.arrival);
  let remaining = queue.map(p => ({ ...p, remaining: p.burst }));
  let time = 0, gantt = [];

  while (remaining.some(p => p.remaining > 0)) {
    let executed = false;
    for (let p of remaining) {
      if (p.arrival <= time && p.remaining > 0) {
        let exec = Math.min(quantum, p.remaining);
        gantt.push({ pid: p.pid, start: time, end: time + exec });
        time += exec;
        p.remaining -= exec;
        executed = true;
      }
    }
    if (!executed) time++;
  }

  return gantt;
}

// --- Render Gantt Chart ---
function renderGantt(gantt) {
  const chart = document.getElementById("gantt-chart");
  chart.innerHTML = "";
  const colors = ["#007bff", "#28a745", "#ff9800", "#9c27b0", "#e91e63"];

  gantt.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "process-block";
    div.style.width = (p.end - p.start) * 40 + "px"; // 40px per time unit
    div.style.background = colors[i % colors.length];
    div.textContent = p.pid;
    chart.appendChild(div);
  });

  const resultDiv = document.getElementById("results");
  resultDiv.innerHTML = "<b>Gantt Chart:</b> " + gantt.map(p => p.pid).join(" → ");
}
