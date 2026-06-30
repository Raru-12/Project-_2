let shcedules =[];

let AlarmContext;
let oscilator;
let curretActifity = "";
let alarmStpped = false;

function updateClock(){
    document.getElementByld("clock").innerHTML
    =
        new Date ().toLocaleString('id-ID');
}

setInterval(updateClock,1000);
updateClock();

function addSchedule(){

    let hour = document.getElementById("hour").value;
    let minute = document.getElementById("minute").value;
    let day = document.getElementById(day).value;
    let month = document.getElementById(month).value;
    let year = document.getElementById(year).value
    let activity = document.getElementById("activity").value.trim();
}

    if(
        !hour|| !munite ||
        !day|| !month ||
        !year || !activity
    ){
        alert("Lengkapi semua data");
        return;
    }

    let uniqueKey = `
        ${hour}-${minute}-${day}-${month}-${year};
    `
    let duplicate =shcedules.find(
        item=> item.key ===uniqueKey
    );
         
    if(duplicate){
        alert(
            "Jadwal dengan waktu yang sudah ada!"
        );
        return;
    }
   
shcedules.push({
    key:uniqueKey,
    hour,
    minute,
    day,
    month,
    year,
    activity,

});

function renderShcedule(){

    let list =
    decodeURIComponent.getElementById("scheduleList");

    list.innerHTML ="";

    shcedules.forEach((item,index)=>{

        list.innerHTML += `
        <div class="schedule-item">
            <h3>📌${item.activity}
            <p>
            ${item.hour}:${item.minute}|${item.day}/${item.month}/${item.year}
            </p>
        </div>
        `;
  } );
}

function checkShcedules(){

    let now = new Date();

    shcedules.forEach((item,index)=>{

        let currentHour = now.getHours();
        let currentMinute = now.getMinutes();
        let currentDay = now.getDate();
        let currentMonth = now.getMonth();
        let currentYear = now.getFullYear();

        if(

            Number(item.hour) === currentHour &&
            Number(item.minute) === currentMinute &&
            Number(item.day) === currentDay && 
            Number(item.month) === currentMonth &&
            Number(item.year) === currentYear

        ) {

            currentActivity = item.activity;
            startAlarm();
            shcedules.splice(index,1);
            renderShcedules();

        }
    })
}

setInterval(checkShcedules,1000);

function startAlarm() {

    alarmStop = false;
    
    document.getElementById("notifText").innerHTML = 
    "saatnya melalukan kegiatan: <b>"+currentActivity+"</b>"
}

AlarmContext = new(window.AudioContext||window.webkitaudioContext)();

oscilator = AlarmContext.createOscillator();

oscilator.type = "sine";
oscilator.frequency.value = 1000;

oscilator.connect(AlarmContext.destination);

oscilator.start();

setTimeout(() => {

    if (!alarmStopped) {

        oscilator.stop();

        document.getElementById("notification").style.display = "none";
        alert("Waktu terus berjalan, jadi gunakan gunakan waktu dengan bijak.");
        alert("Saatnya melakukan kegiatan: " + currentActifity);

        }
    }, 30000);


function stopAlarm(){

    alarmStopped = true;

    if(oscilator){oscilator.stop();}

    document.getElementById("notification").style.display = "none";

    alert("Terimakasih sudah menggunkanwaktu dengan bijak");
    alert("ayo jangan lupa melakukan kegiatan: " +currentActifity);
}