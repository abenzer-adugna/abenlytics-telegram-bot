// Toggle mobile menu
document.getElementById("menuBtn").addEventListener("click", () => {
  document.getElementById("dropdownMenu").classList.toggle("hidden");
});

// Fetch live crypto prices
async function fetchCrypto() {
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd");
  const data = await response.json();

  const container = document.getElementById("cryptoFeed");
  container.innerHTML = "";

  for (let coin in data) {
    const price = data[coin].usd;
    container.innerHTML += 
      <div class="bg-gray-50 p-4 rounded shadow">
        <h4 class="text-lg font-bold capitalize">${coin}</h4>
        <p class="text-green-600 text-xl">$${price.toLocaleString()}</p>
      </div>
    ;
  }
}

fetchCrypto();
setInterval(fetchCrypto, 30000); // refresh every 30s
