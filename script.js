let processes = [];

function saveProcesses() {
  localStorage.setItem("processes", JSON.stringify(processes));
}
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("processes");
  if (saved) {
    processes = JSON.parse(saved);
    renderTaskList();
  }

  showAlgorithmInfo();
});

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
  saveProcesses(); // <-- save after adding
  renderTaskList();

  document.getElementById("pid").value = "";
  document.getElementById("arrival").value = "";
  document.getElementById("burst").value = "";
  document.getElementById("priority").value = "";
}

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
      saveProcesses(); // <-- save after removing
      renderTaskList();
    };

    li.appendChild(removeBtn);
    taskList.appendChild(li);
  });
}


// Show algorithm info
function showAlgorithmInfo() {
  const algo = document.getElementById("algorithm").value;
  const infoDiv = document.getElementById("algorithm-info");

  const infoTexts = {
    fcfs: "FCFS: CPU executes processes in order of arrival. Non-preemptive.",
    sjf: "SJF: CPU executes process with shortest burst first. Non-preemptive.",
    srtf: "SRTF: Preemptive SJF. CPU always picks process with shortest remaining burst.",
    priority: "Priority: CPU executes process with highest priority (lowest number). Can be preemptive or non-preemptive.",
    rr: "Round Robin: CPU executes each process for a fixed quantum and cycles through processes. Preemptive."
  };

  infoDiv.textContent = infoTexts[algo];
}
document.addEventListener("DOMContentLoaded", showAlgorithmInfo);

// --- Simulation ---
function simulate() {
  const algo = document.getElementById("algorithm").value;
  let gantt = [];
  const quantum = parseInt(document.getElementById("quantum").value);

  if (algo === "fcfs") gantt = fcfs(processes);
  else if (algo === "sjf") gantt = sjf(processes);
  else if (algo === "srtf") gantt = srtf(processes);
  else if (algo === "priority") gantt = priorityScheduling(processes);
  else if (algo === "rr") {
    if (!quantum || quantum <= 0) {
      alert("Please enter a valid quantum for Round Robin!");
      return;
    }
    gantt = roundRobin(processes, quantum);
  }

  renderGanttAnimated(gantt);
}

// --- Scheduling algorithms ---
function fcfs(procList) {
  let sorted = [...procList].sort((a,b)=>a.arrival-b.arrival);
  let time=0, gantt=[];
  for(let p of sorted){
    let start=Math.max(time,p.arrival);
    let end=start+p.burst;
    gantt.push({pid:p.pid,start,end});
    time=end;
  }
  return gantt;
}


function sjf(procList) {
  let processes = [...procList].map(p => ({ ...p }));
  let time = 0;
  let completed = [];
  let gantt = [];
  procList.push({
  pid: pidInput.value,
  arrival: Number(arrivalInput.value),
  burst: Number(burstInput.value),
  priority: Number(priorityInput.value)
});


  while (completed.length < processes.length) {
    let available = processes.filter(p => p.arrival <= time && !completed.some(c => c.pid === p.pid));

    if (available.length === 0) {
      time++;
      continue;
    }

let next = available.reduce((prev, curr) => (Number(curr.burst) < Number(prev.burst) ? curr : prev));
    let start = Math.max(time, next.arrival);
    let end = start + next.burst;

    gantt.push({ pid: next.pid, start, end });
    time = end;
    completed.push(next);
  }

  return gantt;
}



function priorityScheduling(procList){
  let procs=[...procList].sort((a,b)=>a.arrival-b.arrival), time=0, completed=[], gantt=[];
  while(completed.length<procs.length){
    let available=procs.filter(p=>p.arrival<=time && !completed.includes(p));
    if(!available.length){time++;continue;}
    let next=available.sort((a,b)=>a.priority-b.priority)[0];
    let start=time,end=start+next.burst;
    gantt.push({pid:next.pid,start,end});
    completed.push(next); time=end;
  }
  return gantt;
}

function roundRobin(procList, quantum){
  let queue=[...procList].sort((a,b)=>a.arrival-b.arrival);
  let remaining=queue.map(p=>({...p,remaining:p.burst})), time=0, gantt=[];
  while(remaining.some(p=>p.remaining>0)){
    let executed=false;
    for(let p of remaining){
      if(p.arrival<=time && p.remaining>0){
        let exec=Math.min(quantum,p.remaining);
        gantt.push({pid:p.pid,start:time,end:time+exec});
        time+=exec; p.remaining-=exec; executed=true;
      }
    }
    if(!executed) time++;
  }
  return gantt;
}

async function renderGanttAnimated(gantt){
  const chart = document.getElementById("gantt-chart");
  const currentTimeDiv = document.getElementById("current-time");
  const queueDiv = document.getElementById("queue-content");
  chart.innerHTML = "";
  currentTimeDiv.textContent = "Time: 0";
  queueDiv.textContent = "[]";

  const colors = ["#007bff","#28a745","#ff9800","#9c27b0","#e91e63"];

  for(let i = 0; i < gantt.length; i++){
    const p = gantt[i];
    const div = document.createElement("div");
    div.className = "process-block";
    div.style.width = "0px";
    div.style.background = colors[i % colors.length];
    div.textContent = p.pid;
    chart.appendChild(div);

    const widthPerUnit = 40;
    const totalWidth = (p.end - p.start) * widthPerUnit;
    const duration = (p.end - p.start) * 500;

    // Animate each unit of time and update waiting queue
    await animateBlock(div, totalWidth, duration, (elapsedUnits) => {
      const currentTime = p.start + elapsedUnits;
      currentTimeDiv.textContent = `Time: ${currentTime}`;

      // Compute waiting queue at currentTime
      const waiting = processes
        .filter(proc => proc.arrival <= currentTime &&
                        !gantt.some(g => g.pid === proc.pid && g.end <= currentTime))
        .map(proc => proc.pid);
      queueDiv.textContent = `[${waiting.join(", ")}]`;
    });

    div.style.opacity = "1";
  }

  currentTimeDiv.textContent = `Time: ${gantt[gantt.length-1].end}`;
  queueDiv.textContent = "[]"; // empty at end
}


function animateBlock(element,targetWidth,duration,onProgress){
  return new Promise(resolve=>{
    let start=null;
    function step(timestamp){
      if(!start) start=timestamp;
      const progress=Math.min((timestamp-start)/duration,1);
      element.style.width=(targetWidth*progress)+"px";
      if(onProgress){
        const timeUnits = Math.round(progress*(targetWidth/40));
        onProgress(timeUnits);
      }
      if(progress<1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

