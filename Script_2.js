let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
let historyData = JSON.parse(localStorage.getItem("history") || "[]");
let osc, ctx, currentTask, alarmTimeout, reminderSentIds = new Set();
let editingTaskId = null;

if (Notification && Notification.permission !== "granted") {
    Notification.requestPermission();
}

function persist() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("history", JSON.stringify(historyData));
}

function toggleTheme() {
    document.body.classList.toggle("light");
}

function notifyUser(title, body) {
    if (Notification && Notification.permission === "granted") {
        new Notification(title, { body });
    } else {
        alert(body);
    }
}

function updateSaveButtonLabel() {
    let saveButton = document.getElementById("saveTaskBtn");
    if (saveButton) {
        saveButton.innerText = editingTaskId ? "Simpan Perubahan" : "Tambah Jadwal";
    }
}

function cancelEdit() {
    editingTaskId = null;
    document.getElementById("dt").value = "";
    document.getElementById("activity").value = "";
    document.getElementById("durationValue").value = "";
    document.getElementById("durationUnit").value = "minute";
    updateSaveButtonLabel();
}

function edit(id) {
    let task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    document.getElementById("dt").value = task.datetime;
    document.getElementById("activity").value = task.activity;

    if (task.durationMinutes >= 60) {
        document.getElementById("durationUnit").value = "hour";
        document.getElementById("durationValue").value = Math.floor(task.durationMinutes / 60);
    } else {
        document.getElementById("durationUnit").value = "minute";
        document.getElementById("durationValue").value = task.durationMinutes || "";
    }

    updateSaveButtonLabel();
    document.getElementById("activity").focus();
}

function resetTaskAlarmState(task) {
    if (!task) return;
    task.running = false;
    task.startedAt = null;
    task.endsAt = null;
    reminderSentIds.delete(task.id);
}

function saveTask() {
    let dt = document.getElementById("dt").value;
    let activity = document.getElementById("activity").value.trim();
    let durationValue = document.getElementById("durationValue")?.value.trim() || "";
    let durationUnit = document.getElementById("durationUnit")?.value || "minute";

    if (!dt || !activity) {
        return alert("Lengkapi Data");
    }

    let durationMinutes = 0;
    if (durationValue) {
        let parsed = parseInt(durationValue, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            durationMinutes = durationUnit === "hour" ? parsed * 60 : parsed;
        }
    }

    if (editingTaskId) {
        let existing = tasks.find(t => t.id === editingTaskId);
        if (existing) {
            if (tasks.some(t => t.id !== editingTaskId && t.datetime === dt)) {
                return alert("Waktu tersebut sudah digunakan.");
            }

            existing.datetime = dt;
            existing.activity = activity;
            existing.durationMinutes = durationMinutes;
            existing.done = false;
            resetTaskAlarmState(existing);
            persist();
            render();
            cancelEdit();
            return;
        }
    }

    if (tasks.some(t => t.datetime === dt)) {
        return alert("Waktu tersebut sudah digunakan.");
    }

    tasks.push({ id: Date.now(), datetime: dt, activity, done: false, durationMinutes });
    persist();
    render();
    cancelEdit();
}

function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return "";
    let hours = Math.floor(minutes / 60);
    let mins = minutes % 60;
    if (hours && mins) return `${hours} jam ${mins} menit`;
    if (hours) return `${hours} jam`;
    return `${mins} menit`;
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const confirmed = confirm(`Hapus jadwal "${task.activity}"?`);
    if (!confirmed) return;

    tasks = tasks.filter(t => t.id !== id);
    persist();
    render();
}

function render() {
    let q = (document.getElementById("search")?.value || "").toLowerCase();
    let data = tasks.filter(t => t.activity.toLowerCase().includes(q));
    let list = document.getElementById("list");

    if (list) {
        list.innerHTML = "";
        data.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        data.forEach(t => {
            let statusText = t.running ? "<span style='color:#38bdf8'>Sedang berlangsung</span>" : "";
            let durationText = t.durationMinutes ? `<br>Target: ${formatDuration(t.durationMinutes)}` : "";
            list.innerHTML += `
                <div class="item">
                    <b>${t.activity}</b>
                    <br>${new Date(t.datetime).toLocaleString('id-ID')}
                    ${durationText}
                    <br>${statusText}
                    <br>
                    <button onclick="edit(${t.id})">Edit</button>
                    <button onclick="deleteTask(${t.id})">Hapus</button>
                </div>`;
        });
    }

    let historyEl = document.getElementById("history");
    if (historyEl) {
        historyEl.innerHTML = historyData.map(h =>
            `<div class="item">${h.activity} ✔</div>`
        ).join("");
    }

    let statsEl = document.getElementById("stats");
    if (statsEl) {
        statsEl.innerText = `Total Jadwal: ${tasks.length}`;
    }

    let total = tasks.length + historyData.length;
    let done = historyData.length;
    let bar = document.getElementById("bar");
    if (bar) {
        bar.style.width = (total ? (done / total) * 100 : 0) + "%";
    }
}

function updateActiveTimer() {
    let activeInfo = document.getElementById("activeTaskInfo");
    let alarmCountdown = document.getElementById("alarmCountdown");

    if (!currentTask) {
        if (activeInfo) activeInfo.innerHTML = "";
        if (alarmCountdown) alarmCountdown.innerText = "";
        return;
    }

    let endTime = currentTask.endsAt || (Date.now() + (currentTask.durationMinutes || 1) * 60000);
    let remainingMs = endTime - Date.now();

    if (remainingMs <= 0) {
        if (activeInfo) {
            activeInfo.innerHTML = `<strong>${currentTask.activity}</strong><br>Waktu kegiatan selesai.`;
        }
        if (alarmCountdown) alarmCountdown.innerText = "Waktu kegiatan selesai.";
        finishActiveTask(true);
        return;
    }

    let remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    let hours = Math.floor(remainingMinutes / 60);
    let mins = remainingMinutes % 60;
    let remainingText = hours > 0 ? `${hours} jam ${mins} menit` : `${mins} menit`;

    if (activeInfo) {
        activeInfo.innerHTML = `<strong>${currentTask.activity}</strong><br>Timer berjalan: sisa ${remainingText}`;
    }
    if (alarmCountdown) {
        alarmCountdown.innerText = `Sisa waktu kegiatan: ${remainingText}`;
    }
}

function startAlarm(task) {
    if (!task) return;

    if (!task.running) {
        task.running = true;
        task.startedAt = Date.now();
        task.endsAt = task.startedAt + (task.durationMinutes > 0 ? task.durationMinutes * 60000 : 60000);
    }

    currentTask = task;

    let alarmModal = document.getElementById("alarmModal");
    let alarmText = document.getElementById("alarmText");

    if (alarmModal) {
        alarmModal.style.display = "flex";
    }
    if (alarmText) {
        alarmText.innerHTML = `Saatnya melakukan kegiatan: <br><b>${task.activity}</b>`;
    }

    if (alarmTimeout) {
        clearTimeout(alarmTimeout);
    }
    alarmTimeout = setTimeout(() => stopAlarm(false), 60000);

    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start();
    } catch (e) {}

    updateActiveTimer();
    notifyUser("Smart Schedule Pro", `Saatnya melakukan kegiatan: ${task.activity}`);
}

function finishActiveTask(autoComplete = false) {
    if (!currentTask) return;

    let finishedTask = currentTask;
    let taskName = finishedTask.activity || "kegiatan";

    if (alarmTimeout) {
        clearTimeout(alarmTimeout);
        alarmTimeout = null;
    }

    try {
        if (osc) {
            osc.stop();
            osc.disconnect();
        }
        if (ctx) {
            ctx.close();
        }
    } catch (e) {}

    let alarmModal = document.getElementById("alarmModal");
    if (alarmModal) {
        alarmModal.style.display = "none";
    }

    historyData.push({ id: finishedTask.id, activity: finishedTask.activity, completedAt: new Date().toISOString() });
    tasks = tasks.filter(x => x.id !== finishedTask.id);
    persist();
    render();

    if (autoComplete) {
        notifyUser("Kegiatan selesai", `Kegiatan sudah selesai, jadi silakan melaksanakan kegiatan selanjutnya. 😁`);
    }

    currentTask = null;
}

function stopAlarm(clicked = true) {
    if (alarmTimeout) {
        clearTimeout(alarmTimeout);
        alarmTimeout = null;
    }

    if (currentTask) {
        currentTask.running = false;
        currentTask.startedAt = null;
        currentTask.endsAt = null;
        reminderSentIds.delete(currentTask.id);
    }

    try {
        if (osc) {
            osc.stop();
            osc.disconnect();
        }
        if (ctx) {
            ctx.close();
        }
    } catch (e) {}

    let alarmModal = document.getElementById("alarmModal");
    if (alarmModal) {
        alarmModal.style.display = "none";
    }

    render();

    if (clicked && currentTask) {
        alert("Terima kasih sudah menggunakan waktu dengan bijak.");
        alert("Ayo jangan lupa melakukan kegiatan: " + currentTask.activity);
    }

    updateActiveTimer();
    currentTask = null;
}

setInterval(() => {
    const clockEl = document.getElementById("clock");
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleString('id-ID');
    }

    updateActiveTimer();

    const now = new Date();
    const dueTasks = [];

    for (const t of tasks) {
        if (t.running) continue;

        const target = new Date(t.datetime);
        const reminderTime = new Date(target.getTime() - 60000);

        if (now >= reminderTime && now < target && !reminderSentIds.has(t.id)) {
            reminderSentIds.add(t.id);
            notifyUser("Pengingat jadwal", `Waktu sisa 1 menit untuk melakukan kegiatan: ${t.activity}`);
        }

        if (Math.abs(now - target) < 1000) {
            dueTasks.push(t);
        }
    }

    for (const t of dueTasks) {
        startAlarm(t);
        persist();
        render();
    }
}, 1000);

const importFileEl = document.getElementById("importFile");
if (importFileEl) {
    importFileEl.addEventListener("change", e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                tasks = JSON.parse(r.result);
                persist();
                render();
            } catch (err) {
                alert("File tidak valid");
            }
        };
        r.readAsText(f);
    });
}

function exportData () {
    const blob = new Blob ([JSON.stringify(tasks, null, 2)], {
        type : "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jadwal.json";
    a.click();
}

render();