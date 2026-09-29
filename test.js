const fetch = require('node-fetch');
fetch('https://script.google.com/macros/s/AKfycbzmNG1IpidqqK3UExQx0ikyO5O9od7BViKaUH2RPeoeJOj4ec5-YkmOm49-IRaY7Vy-Tg/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ contents: [{ parts: [{text: 'hello'}] }] })
}).then(r => r.text()).then(console.log).catch(console.error);
