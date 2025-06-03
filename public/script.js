function submitService(serviceType) {
  Telegram.WebApp.ready();
  const userData = Telegram.WebApp.initDataUnsafe.user || {};

  fetch('/api/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceType, userData })
  })
  .then(res => res.json())
  .then(data => alert(data.message))
  .catch(err => alert('Error: ' + err.message));
}
