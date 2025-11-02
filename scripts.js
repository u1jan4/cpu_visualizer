let processes = [];

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
  alert(`Added ${pid}`);

  document.getElementById("pid").value = "";
  document.getElementById("arrival").value = "";
  document.getElementById("burst").value = "";
  document.getElementById("priority").value = "";
}

function simulate() {
  const algo = document.getElementById("algorithm").value;
  let gantt = [];

  if (algo === "fcfs") {
    gantt = fcfs(processes);
  } else if (algo === "priority") {
    gantt = priorityScheduling(processes);
  } else if (algo === "rr") {
    const quantum = parseInt(document.getElementById("quantum").value);
    gantt = roundRobin(processes, quantum);
  }

  renderGantt(gantt);
}

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

function priorityScheduling(procList) {
  let processes = [...procList].sort((a, b) => a.arrival - b.arrival);
  let time = 0, gantt = [], completed = [];

  while (completed.length < processes.length) {
    let available = processes.filter(p => p.arrival <= time && !completed.includes(p));
    if (available.length === 0) {
      time++;
      continue;
    }
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
  let gantt = [];
  let time = 0;
  let remaining = queue.map(p => ({ ...p, remaining: p.burst }));

  while (remaining.some(p => p.remaining > 0)) {
    for (let p of remaining) {
      if (p.arrival <= time && p.remaining > 0) {
        let exec = Math.min(quantum, p.remaining);
        gantt.push({ pid: p.pid, start: time, end: time + exec });
        time += exec;
        p.remaining -= exec;
      }
    }
  }
  return gantt;
}

function renderGantt(gantt) {
  const chart = document.getElementById("gantt-chart");
  chart.innerHTML = "";
  const colors = ["#007bff", "#28a745", "#ff9800", "#9c27b0", "#e91e63"];

  gantt.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "process-block";
    div.style.width = (p.end - p.start) * 40 + "px";
    div.style.background = colors[i % colors.length];
    div.textContent = p.pid;
    chart.appendChild(div);
  });

  const resultDiv = document.getElementById("results");
  resultDiv.innerHTML = "<b>Gantt Chart:</b> " + gantt.map(p => p.pid).join(" → ");
}
