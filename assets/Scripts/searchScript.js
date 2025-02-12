// Sötét mód
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'enabled') {
      document.body.classList.add('dark-mode');
    }
  });


  
// Nincs legutóbb megnyitott elem (első eredmény előtti eredmény nem létezik)
let lastOpenedElement = null;

// Adjuk hozzá a keresés során megjelenő animációt.
const loadingElement = document.createElement('div');
loadingElement.classList.add('loader');



// Meg lett-e szakítva a keresés
let aborted = false;


// Keresés megszakítása
let searchAbortController = null;



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

    // 1 másodperc után eltüntetjük az értesítést
    setTimeout(() => {
        notification.classList.remove('show');
    }, 1000);
}



// Paraméterezhető központi keresést lebonyolító funkció.
async function performSearch(url, onSuccess) {

    // Keresés megkezdésekor elrejtjük a currentFolder elemet
    const currentFolderElement = document.getElementById('currentFolder');
    const searchMessageElement = document.getElementById('searchMessage');
    const searchQuery = document.getElementById('searchQuery').value.trim();

    if (currentFolderElement && searchMessageElement) {
        searchMessageElement.textContent = `"${searchQuery}" keresése a(z) ${currentFolderElement.textContent.replace('Keresés a(z) ', '').replace(' mappában', '')} mappában...`;
        currentFolderElement.style.display = 'none';
        searchMessageElement.style.display = 'inline-block';
    }



    toggleSearchMessage(true);
    toggleButtonsAndQuery(false);

    document.getElementById('cancelSearchBtn').style.display = 'block';

    clearResults();
    document.body.appendChild(loadingElement);



    const startTime = new Date();

    searchAbortController = new AbortController();
    const { signal } = searchAbortController;


    try {
        const responsePromise = fetch(url, { signal });
        const response = await Promise.race([
            responsePromise,
            new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Abort'))))
        ]);

        if (response.ok) {
            const data = await response.json();
            onSuccess(data);
        } else {
            window.location.href = '/';
            throw new Error('Hálózati hiba.');
        }
    } catch (error) {
        if (error.message === 'Abort') {
            return;
        } else {
            console.error('Hiba a keresés során: ', error);
        }
    } finally {
        document.body.removeChild(loadingElement);
        toggleSearchMessage(false);
        toggleButtonsAndQuery(true);
        document.getElementById('cancelSearchBtn').style.display = 'none';

        const endTime = new Date();
        const elapsedTime = (endTime - startTime) / 1000;

        if (searchQuery && aborted == false) {
            console.log(`A keresés ${elapsedTime.toFixed(2)} másodpercig tartott.`);

        }
    }
}

// Fájlnév keresés.
function search() {
    const query = document.getElementById('searchQuery').value;


    if (!query) {
        displayNoQueryMessage(); // Ha nincs megadva keresési feltétel, megjelenítjük az üzenetet
        return;
    }

    const url = `/searchFiles?q=${query}`;
    performSearch(url, displayResults);
}


// "Keresés folyamatban" szöveg ki/bekapcsolása
function toggleSearchMessage(show) {
    document.getElementById('searchMessage').style.display = show ? 'inline-block' : 'none';
}


// Gombok és keresősáv ki/bekapcsolása
function toggleButtonsAndQuery(enabled) {
    const elements = {
        searchFilesBtn: document.getElementById('searchFilesBtn'),
        searchBtn: document.getElementById('searchBtn'),
        searchQuery: document.getElementById('searchQuery')
    };

    for (const [key, element] of Object.entries(elements)) {
        if (element) {
            element.disabled = !enabled;
            element.style.opacity = enabled ? 1 : 0;
        }
    }
}


function displayNoQueryMessage() {
    const resultsList = document.getElementById('results');
    let resultsCountElement = document.getElementById('resultsCount');

    // Ha nincs megadva keresési feltétel és a resultsCountElement nem létezik, hozzuk létre.
    if (!resultsCountElement) {
        resultsCountElement = document.createElement('span');
        resultsCountElement.id = 'resultsCount';
        if (resultsList) {
            resultsList.insertAdjacentElement('beforebegin', resultsCountElement);
        }
    }

    // Töröljük az előző keresési eredményeket
    if (resultsList) {
        resultsList.innerHTML = '';
    }

    // Kiírjuk az üzenetet
    if (resultsCountElement) {
        resultsCountElement.textContent = 'Nincs megadva keresési feltétel!';
    }
}





// Eltüntetjük az előző keresés eredményeit
function clearResults() {
    const resultsList = document.getElementById('results');
    const resultsCountElement = document.getElementById('resultsCount');
    if (resultsList) resultsList.innerHTML = '';
    if (resultsCountElement) resultsCountElement.textContent = '';
}

// Escape-eljük a fájlnevet a querySelector számára
function escapeFilenameForSelector(filename) {
    return filename.replace(/([^\w-])/g, '\\$1');
}

// Fájl megnyitása
function openFile(fileName) {
    fetch(`/open/${encodeURIComponent(fileName)}`)
        .then(() => {

            const escapedFileName = escapeFilenameForSelector(fileName);
            const currentElement = document.querySelector(`li[data-filename="${escapedFileName}"]`);
            showNotification('Fájl megnyitása...', 'success');

            if (currentElement) {
                if (lastOpenedElement) lastOpenedElement.classList.remove('last-opened');
                lastOpenedElement = currentElement.closest('li');
                lastOpenedElement.classList.add('last-opened');
            } else {
                console.error('A fájl nem található:', fileName);
                showNotification('Nem sikerült megnyitni a fájlt', 'error');
            }
        })
        .catch(error => console.error('Hiba a fájl megnyitásakor: ', error));
}



// Mappa megnyitása
function openFolder(fileName) {
    fetch(`/openFolder/${encodeURIComponent(fileName)}`)
        .then(() => {
            const escapedFileName = escapeFilenameForSelector(fileName);
            const currentElement = document.querySelector(`button[data-filename="${escapedFileName}"]`);
            showNotification('Mappa megnyitása...', 'success');

            if (currentElement) {
                if (lastOpenedElement) lastOpenedElement.classList.remove('last-opened');
                lastOpenedElement = currentElement.closest('li');
                lastOpenedElement.classList.add('last-opened');
            } else {
                console.error('A fájl nem található:', fileName);
                showNotification('Nem sikerült megnyitni a mappát', 'error');
            }
            
        })
        .catch(error => console.error('Hiba a mappa megnyitásakor: ', error));
}


// Fájl útvonalának másolása
function copyPath(fileName) {
    fetch(`/copyPath/${encodeURIComponent(fileName)}`)
        .then(() => {
            const escapedFileName = escapeFilenameForSelector(fileName);
            const currentElement = document.querySelector(`button[data-filename="${escapedFileName}"]`);
            showNotification('Útvonal másolva!', 'success');

            if (currentElement) {
                if (lastOpenedElement) lastOpenedElement.classList.remove('last-opened');
                lastOpenedElement = currentElement.closest('li');
                lastOpenedElement.classList.add('last-opened');
            } else {
                console.error('A fájl nem található:', fileName);
                showNotification('Nem sikerült az útvonal másolása', 'error');
            }
        })
        .catch(error => console.error('Hiba a fájlútvonal másolásakor: ', error));
}




// A '/currentFolder' végpontból lekérjük a jelenlegi mappát, és megjelenítjük
async function fetchAndDisplayCurrentFolder() {
    try {
        const response = await fetch('/currentFolder');

        if (!response.ok) {
            throw new Error('Hálózati hiba.');
        }

        const data = await response.json();
        document.getElementById('currentFolder').textContent = `Keresés a(z) ${data.folderName} mappában`;
        document.getElementById('title').textContent = `Kereső - ${data.folderName}`;
    } catch (error) {
        console.error('A mappát nem lehetett megjeleníteni:', error);
    }
}



// Eredménylista
function displayResults(data) {
    const resultsList = document.getElementById('results');
    let resultsCountElement = document.getElementById('resultsCount');
    const currentFolderElement = document.getElementById('currentFolder');

    if (!resultsCountElement) {
        resultsCountElement = document.createElement('span');
        resultsCountElement.id = 'resultsCount';
        resultsList.insertAdjacentElement('beforebegin', resultsCountElement);
    }

    resultsCountElement.textContent = data.length === 0 ? 'Nincs találat' : `A keresés befejeződött. (${data.length} találat)`;

    if (currentFolderElement) {
        currentFolderElement.style.display = 'block';
    }

    resultsList.innerHTML = '';
    data.forEach((file, index) => {
        const listItem = document.createElement('li');
        const linkItem = document.createElement('a');
        linkItem.textContent = file;
        linkItem.href = '#';
        listItem.setAttribute('data-filename', file);
        listItem.onclick = (event) => {
            event.preventDefault();
            openFile(file);
        };
    
        // Gombok konténere
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
    
        // Mappa megnyitása gomb
        const openFolderButton = document.createElement('button');
        openFolderButton.textContent = 'Mappa megnyitása';
        openFolderButton.className = 'open-folder-btn';
        openFolderButton.setAttribute('data-filename', file);
        openFolderButton.onclick = (event) => {
            event.stopPropagation();
            openFolder(file);
        };
    
        // Útvonal másolása gomb
        const copyPathButton = document.createElement('button');
        copyPathButton.textContent = 'Útvonal másolása';
        copyPathButton.className = 'copy-path-btn';
        copyPathButton.setAttribute('data-filename', file);
        copyPathButton.onclick = (event) => {
            event.stopPropagation();
            copyPath(file);
        };
    
        // Gombok hozzáadása a konténerhez
        buttonContainer.appendChild(openFolderButton);
        buttonContainer.appendChild(copyPathButton);
    
        // Gombok konténerének hozzáadása a listához
        listItem.appendChild(linkItem);
        listItem.appendChild(buttonContainer);
        resultsList.appendChild(listItem);
        listItem.style.animationDelay = `${index * 0.1}s`;
    });
    

    setTimeout(() => {
        document.querySelectorAll('#results li').forEach(item => {
            item.style.animation = 'none';
            item.style.opacity = '1';
        });
    }, 3000);
}


// Az oldalon szereplő gombok, keresősáv eseménykezelése
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayCurrentFolder();
    document.getElementById('searchBtn').addEventListener('click', search);


    const backToTopButton = document.querySelector("#topButton");

    // Görgetés figyelése
    window.addEventListener('scroll', toggleScrollButton);

    // Funkció, amely kezeli a lap tetejére gomb megjelenítését/eltűnését
    function toggleScrollButton() {

        // Gomb megjelenítése/eltűnése
        if (window.scrollY > 300) {
            topButton.classList.add('show');
        } else {
            topButton.classList.remove('show');
        }
    }


    backToTopButton.addEventListener("click", scrollTop);

    function scrollTop() {
        window.scrollTo(0, 0);
    }


    document.getElementById('cancelSearchBtn').addEventListener('click', () => {
        if (searchAbortController) {
            searchAbortController.abort();
            searchAbortController = null;
            aborted = true;
        }

        const currentFolderElement = document.getElementById('currentFolder');
        const searchMessageElement = document.getElementById('searchMessage');

        if (currentFolderElement && searchMessageElement) {
            searchMessageElement.style.display = 'none';
            currentFolderElement.style.display = 'block';
        }

        // Megszakítjuk a keresést és eltüntetjük az animációt
        toggleSearchMessage(false);
        toggleButtonsAndQuery(true);
        document.getElementById('cancelSearchBtn').style.display = 'none';
    });





});

document.getElementById('searchQuery').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        search();
    }
});