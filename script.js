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

  renderGanttAnimated(gantt);
}


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
  let procs = [...procList].map(p => ({ ...p }));
  let time=0, completed=[], gantt=[];
  while(completed.length<procs.length){
    let available = procs.filter(p=>p.arrival<=time && !completed.includes(p));
    if(!available.length){time++; continue;}
    let next = available.reduce((prev,curr)=>curr.burst<prev.burst?curr:prev);
    let start = Math.max(time,next.arrival);
    let end = start + next.burst;
    gantt.push({pid: next.pid,start,end});
    time=end; completed.push(next);
  }
  return gantt;
}

function srtf(procList) {
  let procs = procList.map(p => ({...p, remaining: p.burst}));
  let time=0, completed=0, gantt=[];
  const n = procs.length;
  while(completed<n){
    let available = procs.filter(p => p.arrival<=time && p.remaining>0);
    if(!available.length){time++; continue;}
    let next = available.reduce((prev,curr)=>curr.remaining<prev.remaining?curr:prev);
    gantt.push({pid: next.pid,start: time,end: time+1});
    next.remaining -= 1;
    if(next.remaining===0) completed++;
    time++;
  }

  let merged=[];
  for(let i=0;i<gantt.length;i++){
    if(merged.length===0) merged.push({...gantt[i]});
    else{
      let last=merged[merged.length-1];
      if(last.pid===gantt[i].pid && last.end===gantt[i].start) last.end=gantt[i].end;
      else merged.push({...gantt[i]});
    }
  }
  return merged;
}

function priorityScheduling(procList){
  let procs=[...procList].sort((a,b)=>a.arrival-b.arrival), time=0, completed=[], gantt=[];
  while(completed.length<procs.length){
    let available = procs.filter(p=>p.arrival<=time && !completed.includes(p));
    if(!available.length){time++; continue;}
    let next = available.sort((a,b)=>a.priority-b.priority)[0];
    let start=time,end=start+next.burst;
    gantt.push({pid:next.pid,start,end});
    completed.push(next); time=end;
  }
  return gantt;
}

function roundRobin(procList, quantum){
  let procs = procList.map(p=>({...p, remaining: p.burst})), time=0, gantt=[];
  let n=procs.length, completed=0;
  while(completed<n){
    let executed=false;
    for(let p of procs){
      if(p.arrival<=time && p.remaining>0){
        let exec=Math.min(quantum,p.remaining);
        gantt.push({pid: p.pid, start: time, end: time+exec});
        p.remaining -= exec;
        time += exec;
        executed=true;
        if(p.remaining===0) completed++;
      }
    }
    if(!executed) time++;
  }
  return gantt;
}


async function renderGanttAnimated(gantt){
  const chart=document.getElementById("gantt-chart");
  const currentTimeDiv=document.getElementById("current-time");
  const queueDiv=document.getElementById("queue-content");
  const currentProcDiv=document.getElementById("current-process");
  const tableBody=document.getElementById("process-table-body");

  chart.innerHTML=""; queueDiv.innerHTML=""; currentTimeDiv.textContent="Time: 0"; currentProcDiv.textContent="CPU Idle";
  renderProcessTable();

  const colors={};
  const palette=["#007bff","#28a745","#ff9800","#9c27b0","#e91e63","#00bcd4","#795548"];
  processes.forEach((p,i)=>colors[p.pid]=palette[i%palette.length]);

  const widthPerUnit=40;

  for(let block of gantt){
   const div = document.createElement("div");
div.className = "process-block";
div.style.width = "0px";
div.style.height = "40px";
div.style.background = colors[block.pid];
div.style.border = "1px solid #333";
div.style.color = "#fff";
div.style.display = "flex";
div.style.alignItems = "center";
div.style.justifyContent = "center";
div.style.fontWeight = "bold";
div.style.fontSize = "16px";
div.textContent = block.pid;
chart.appendChild(div);


    const duration=Math.max((block.end-block.start)*400, 400);
    const totalWidth=(block.end-block.start)*widthPerUnit;


    const currentProcess = processes.find(p=>p.pid===block.pid);
    if(currentProcess) currentProcess.remaining -= (block.end-block.start);
    renderProcessTable();

    await animateBlock(div,totalWidth,duration,(elapsedUnits)=>{
      const currentTime=block.start+elapsedUnits;
      currentTimeDiv.textContent=`Time: ${currentTime}`;
      currentProcDiv.textContent=`CPU Running: ${block.pid}`;


      const waiting = processes.filter(p=>p.remaining>0 && p.arrival<=currentTime && p.pid!==block.pid);
      queueDiv.innerHTML="";
      waiting.forEach(w=>{
        const wdiv=document.createElement("div");
        wdiv.style.display="inline-block";
        wdiv.style.width="40px"; wdiv.style.height="30px";
        wdiv.style.background=colors[w.pid]; wdiv.style.margin="2px";
        wdiv.style.color="#fff"; wdiv.style.textAlign="center"; wdiv.style.lineHeight="30px";
        wdiv.textContent=w.pid;
        queueDiv.appendChild(wdiv);
      });
    });

    div.style.opacity="1";
  }

  currentTimeDiv.textContent=`Time: ${gantt[gantt.length-1].end}`;
  currentProcDiv.textContent="CPU Idle";
  queueDiv.innerHTML="";
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
