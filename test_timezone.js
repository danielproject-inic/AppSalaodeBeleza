const start_time = "2026-06-10 18:00:00+00";
const end_time = "2026-06-10 18:40:00+00";

const startTime = new Date(start_time);
const startH = startTime.getHours().toString().padStart(2, '0');
const startM = startTime.getMinutes().toString().padStart(2, '0');
const duration = end_time ? (new Date(end_time).getTime() - startTime.getTime()) / 60000 : 60;
const endTime = new Date(startTime.getTime() + duration * 60000);
const endH = endTime.getHours().toString().padStart(2, '0');
const endM = endTime.getMinutes().toString().padStart(2, '0');

console.log("startTime:", startTime.toString());
console.log("startH:", startH);
console.log("startM:", startM);
console.log("duration:", duration);
console.log("endH:", endH);
console.log("endM:", endM);
console.log("date split:", start_time.split('T')[0]);
