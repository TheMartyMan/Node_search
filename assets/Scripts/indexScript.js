// Sötét mód
const themeToggle = document.getElementById('themeToggle');

// Sötét mód váltása
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  });


  // Betöltéskor visszaállítja az előző állapotot
  window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'enabled') {
      document.body.classList.add('dark-mode');
      themeToggle.checked = true;
    }
  });



// Értesítés kezelése
function showNotification(message, type) {
    const notification = document.getElementById('notification');

    const icons = {
        success:`<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`,
        error:`<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#e8eaed"><path d="m291-240-51-51 189-189-189-189 51-51 189 189 189-189 51 51-189 189 189 189-51 51-189-189-189 189Z"/></svg>`
            };

    notification.innerHTML = `${icons[type]}&nbsp;${message}`;
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#FF0000';  
    
    notification.classList.add('show');

    // 4 másodperc után eltüntetjük az értesítést
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}




// Mappák lekérése és megjelenítése a '/folders' végpontból.
async function fetchAndDisplayFolders() {
    try {
        const response = await fetch('/folders');
        
        if (!response.ok) {
            showNotification("Hálózati hiba történt az almappák megjelenítésekor", 'error');
            throw new Error('Hálózati hiba.');
        }
        
        const data = await response.json();
        const folderList = document.getElementById('folderList');
        folderList.innerHTML = '';
        showNotification("Almappák betöltve", 'success');

        data.forEach(folder => {
            const button = document.createElement('button');
            button.textContent = folder;
            button.type = 'button';
            button.addEventListener('click', () => setFolderPath(folder));
            folderList.appendChild(button);
        });
    } catch (error) {
        console.error('A mappák lekérése során hiba történt:', error);
        showNotification("Hiba történt az almappák megjelenítésekor", 'error');
    }
}




// Jelenlegi mappa beállítása a '/setFolderPath' végpont segítségével.
function setFolderPath(folder) {
    fetch('/setFolderPath', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPath: folder }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/search';
            
        } else {
            console.error('Nem sikerült az új mappát beállítani: ', data.message);
            showNotification("Nem létezik a kért keresési mappa!", 'error');
        }
    })
    .catch(error => {
        console.error('Nem sikerült az új mappát beállítani:', error);
        showNotification("Hálózati hiba történt a keresési mappa beállítása közben.", 'error');
    });
}





// Alap mappa visszaállítása, animációk, changelog megjelenésének eseménykezelése
document.addEventListener('DOMContentLoaded', async () => {

    // A 'Teljes jegyzék keresése' gomb visszaállítja az alap mappát.
    setAllBtn.addEventListener('click', () => {
        setFolderPath("/alap_mappa");
    });

    // Amikor a lap megjelenik, egyől mutassa az alapértelmezett mappa mappáit
    fetchAndDisplayFolders();

    // Változáslista megjelenésének kezelése
    const changelogTrigger = document.getElementById('changelog-trigger');
    const changelog = document.getElementById('changelog');
    const changelogClose = document.getElementById('changelog-close');

    changelogTrigger.addEventListener('click', () => {
        changelog.style.display = 'block';
        changelog.classList.add('show');
    });

    changelogClose.addEventListener('click', () => {
        changelog.classList.add('hide');
    });

    changelog.addEventListener('animationend', (event) => {
        if (event.animationName === 'fadeOut') {
            changelog.classList.remove('show', 'hide');
            changelog.style.display = 'none';
        }
    });
});