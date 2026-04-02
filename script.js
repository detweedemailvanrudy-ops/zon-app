// --- CONFIGURATIE ---
const SUN_API_URL = "https://api.sunrise-sunset.org/json";
const GEO_API_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";
const REVERSE_GEO_API_URL = "https://nominatim.openstreetmap.org/reverse?format=json";

let currentLat = null;
let currentLon = null;
let sunTimes = { sunrise: null, sunset: null };

// --- 1. BIJ OPSTARTEN ---
window.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity');
    const savedLat = localStorage.getItem('lastLat');
    const savedLon = localStorage.getItem('lastLon');

    if (savedCity && savedLat && savedLon) {
        currentLat = parseFloat(savedLat);
        currentLon = parseFloat(savedLon);
        updateLocationDisplay(`🏙️ ${savedCity}`);
        getSunData(currentLat, currentLon);
    }
    
    // Start de klok direct
    updateClock();
});

// --- 2. DE KLOK & COUNTDOWN FUNCTIE ---
function updateClock() {
    const nu = new Date();
    
    // Toon huidige datum en tijd
    const dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    document.getElementById('display-date').innerText = nu.toLocaleDateString('nl-NL', dateOptions);
    document.getElementById('current-time-display').innerText = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Bereken countdown als we zontijden hebben
    if (sunTimes.sunrise && sunTimes.sunset) {
        let target;
        let label;

        if (nu < sunTimes.sunrise) {
            target = sunTimes.sunrise;
            label = "Tot zonsopkomst";
        } else if (nu < sunTimes.sunset) {
            target = sunTimes.sunset;
            label = "Tot zonsondergang";
        } else {
            // Na zonsondergang kijken we naar de opkomst van morgen (benadering)
            target = new Date(sunTimes.sunrise.getTime() + 24 * 60 * 60 * 1000);
            label = "Tot volgende opkomst";
        }

        const diff = target - nu;
        const uren = Math.floor(diff / (1000 * 60 * 60));
        const minuten = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        document.getElementById('countdown-label').innerText = label;
        document.getElementById('countdown-timer').innerText = `${uren}u ${minuten}m`;
        
        // Update ook meteen de voortgangsbalk (vloeiender dan elke minuut)
        updateVisuals(sunTimes.sunrise, sunTimes.sunset);
    }

    requestAnimationFrame(updateClock); // Zorgt voor een soepele klok
}

// --- 3. EVENT LISTENERS ---
document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value;
    if (!city) return;

    updateStatus(`Zoeken naar "${city}"...`);
    try {
        const response = await fetch(GEO_API_URL + encodeURIComponent(city));
        const data = await response.json();
        if (data && data.length > 0) {
            currentLat = parseFloat(data[0].lat);
            currentLon = parseFloat(data[0].lon);
            const cityName = data[0].display_name.split(',')[0];
            saveLocation(cityName, currentLat, currentLon);
            updateLocationDisplay(`🏙️ ${cityName}`);
            getSunData(currentLat, currentLon);
            cityInput.blur(); 
        }
    } catch (error) { updateStatus("Fout bij zoeken."); }
});

document.getElementById('btn-gps').addEventListener('click', () => {
    updateStatus("GPS aanvragen...");
    navigator.geolocation.getCurrentPosition(async (position) => {
        currentLat = position.coords.latitude;
        currentLon = position.coords.longitude;
        try {
            const response = await fetch(`${REVERSE_GEO_API_URL}&lat=${currentLat}&lon=${currentLon}`);
            const data = await response.json();
            const addr = data.address;
            const cityName = addr.city || addr.town || addr.village || "Huidige locatie";
            saveLocation(cityName, currentLat, currentLon);
            updateLocationDisplay(`📍 ${cityName}`);
        } catch (error) { updateLocationDisplay(`📍 GPS Locatie`); }
        getSunData(currentLat, currentLon);
    });
});

// --- 4. DATA OPHALEN & UI ---
async function getSunData(lat, lon) {
    updateStatus("Tijden ophalen...");
    try {
        const response = await fetch(`${SUN_API_URL}?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        if (data.status === "OK") {
            sunTimes.sunrise = new Date(data.results.sunrise);
            sunTimes.sunset = new Date(data.results.sunset);
            const solarNoon = new Date(data.results.solar_noon);
            
            const options = { hour: '2-digit', minute: '2-digit' };
            document.getElementById('sunrise-time').innerText = sunTimes.sunrise.toLocaleTimeString('nl-NL', options);
            document.getElementById('sunset-time').innerText = sunTimes.sunset.toLocaleTimeString('nl-NL', options);
            document.getElementById('solar-noon').innerText = solarNoon.toLocaleTimeString('nl-NL', options);
            
            updateStatus("Gegevens bijgewerkt");
        }
    } catch (error) { updateStatus("Fout bij laden."); }
}

function updateVisuals(start, end) {
    const nu = new Date();
    const totaalDaglicht = end - start;
    const verstreken = nu - start;
    let percentage = (verstreken / totaalDaglicht) * 100;

    percentage = Math.max(0, Math.min(100, percentage));
    document.getElementById('progress-bar').style.width = percentage + "%";
    document.getElementById('sun-icon').style.left = percentage + "%";

    if (percentage > 0 && percentage < 100) {
        const factor = Math.sin((percentage / 100) * Math.PI); 
        const hue = 30 + (170 * factor);
        const light = 25 + (25 * factor);
        document.body.style.background = `linear-gradient(180deg, hsl(${hue}, 70%, ${light}%) 0%, #0f172a 100%)`;
    } else {
        document.body.style.background = "linear-gradient(180deg, #020617 0%, #0f172a 100%)";
    }
}

// Helpers
function saveLocation(name, lat, lon) {
    localStorage.setItem('lastCity', name);
    localStorage.setItem('lastLat', lat);
    localStorage.setItem('lastLon', lon);
}
function updateStatus(msg) { document.getElementById('status-text').innerText = msg; }
function updateLocationDisplay(text) { document.getElementById('current-location').innerText = text; }

// Ververs data elke 30 minuten (omdat zontijden per dag nauwelijks verschuiven)
setInterval(() => { if (currentLat && currentLon) getSunData(currentLat, currentLon); }, 1800000);