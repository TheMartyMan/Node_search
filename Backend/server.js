import uWS from 'uWebSockets.js';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';


// Könyvtárak beállítása
const assetsDir = '../assets';
const defPath = "/alap_mappa";
let folderPath = defPath;

let abortController = new AbortController();

// Könyvtár/fájl létezésének ellenőrzése
async function isExists(path) {
  try {
    await fsPromises.access(path, fsPromises.constants.F_OK);
    return true; // Létezik
  } catch {
    return false; // Nem létezik
  }
}




// Fájl kiszolgálása
async function serveStaticFile(res, filePath) {
  let aborted = false;

  res.onAborted(() => {
    aborted = true;
  });

  try {
    const fileContent = await fsPromises.readFile(filePath);
    const contentType = getContentType(filePath);

    if (!aborted) {  // Ellenőrzés, hogy a kapcsolat nem szakadt-e meg
      res.cork(() => {
        res.writeHeader('Content-Type', contentType);
        res.end(fileContent);
      });
    }
  } catch (err) {
    console.error(`Hiba történt a fájl megnyitásakor: ${err}`);

    if (!aborted) {  // Ellenőrzés, hogy a kapcsolat nem szakadt-e meg
      res.cork(() => {
        res.writeStatus('500 Internal Server Error');
        res.end('Hiba történt a fájl olvasása során.');
      });
    }
  }
}

// Fájl típusának lekérése
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.jpg': return 'image/jpeg';
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.html': return 'text/html; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xlsm': return 'application/vnd.ms-excel.sheet.macroenabled.12';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.json': return 'application/json; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.rar': return 'application/vnd.rar';
    case '.zip': return 'application/vnd.zip';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

// Adott mappa almappáinak lekérése
async function getDirectories(srcPath) {
  try {
    const dirents = await fsPromises.readdir(srcPath, { withFileTypes: true });
    return dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
  } catch (err) {
    console.error(`A ${srcPath} mappa olvasása közben hiba lépett fel:`, err);
    return [];
  }
}

// Minden fájl lekérése
async function getAllFiles(dirPath, signal, arrayOfFiles = []) {
  if (signal.aborted) {
    return null;
  }

  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    const filePromises = entries.map(async entry => {
      if (signal.aborted) {
        return null;
      }

      const filePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await getAllFiles(filePath, signal, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    });

    await Promise.all(filePromises);
  } catch (err) {
    console.error(`A ${srcPath} mappa olvasása közben hiba lépett fel:`, err);
    return null;
  }

  return arrayOfFiles;
}




// A fájlok átnevezésekor Python scriptek voltak használva.
// Ezeket, illetve ezek által létrehozott (keresés szempontjából felesleges) fájlokat nem tesszük az eredménylistába.
function excludeFile(fileName) {
  const excludeList = ['Rename.py', 'rename.py', 'log'];
  return excludeList.some(exclude => fileName.includes(exclude));
}


// Fájl megnyitása
function openFile(filePath) {
  // Windows parancs a fájl megnyitására
  if (isExists(filePath)) {
    let command = `start "" "${filePath}"`;
    try {
      exec(command);
    } catch (error) {
      console.error(`Hiba történt a fájl megnyitásakor: ${error.message}`);
    }
  } else {
    console.error('A fájl nem létezik!\n');
  }
}


// Mappa megnyitása
function openFolder(filePath) {
  // Windows Intéző parancs a fájl mappájának megnyitására
  if (isExists(filePath)) {
    let command = `explorer.exe /select, "${filePath}"`;
    try {
      exec(command);
    } catch (error) {
      console.error(`Hiba történt a fájl mappájának megnyitásakor: ${error.message}`);
    }
  } else {
    console.error('A fájl nem létezik!\n');
  }
}


// Fájl útvonal másolása
function copyPath(filePath) {
  // Windows Intéző parancs a fájl mappájának megnyitására
  if (isExists(filePath)) {
    let command = `echo ${filePath}|clip`;
    try {
      exec(command);
    } catch (error) {
      console.error(`Hiba történt az útvonal másolásakor: ${error.message}`);
    }
  } else {
    console.error('A fájl nem létezik!\n');
  }
}



// Szerver beállítása
uWS.App()
  .get('/', async (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
      serveStaticFile(res, "../Frontend/error.html")
    });
    if (await isExists(defPath)) {
      res.cork(() => {
        serveStaticFile(res, "../Frontend/index.html");
      });

    } else {

      // Hiba esetén az hibát jelző HTML oldal jelenjen meg.
      res.cork(() => {
        serveStaticFile(res, "../Frontend/error.html")
      });
    }
  })

  // Keresés HTML
  .get('/search', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
      serveStaticFile(res, "../Frontend/error.html")
    });

    serveStaticFile(res, "../Frontend/search.html");
  })


  // Fájlok kiszolgálása
  .get('/CSS/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
      serveStaticFile(res, "../Frontend/error.html")
    });

    const filePath = path.join(assetsDir, 'CSS', req.getUrl().substring('/CSS/'.length));
    serveStaticFile(res, filePath);
  })
  .get('/Scripts/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
      serveStaticFile(res, "../Frontend/error.html")
    });

    const filePath = path.join(assetsDir, 'Scripts', req.getUrl().substring('/Scripts/'.length));
    serveStaticFile(res, filePath);
  })

  .get('/assets/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
      serveStaticFile(res, "../Frontend/error.html")
    });


    const filePath = path.join(assetsDir, req.getUrl().substring('/assets/'.length));
    serveStaticFile(res, filePath);
  })


  // Mappák végpontja
  .get('/folders', async (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
    });

    try {
      let directories = await getDirectories(folderPath);

      if (!res.aborted) {
        res.cork(() => {
          res.writeHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(directories));
        });
      }
    } catch (error) {
      serveStaticFile(res, "../Frontend/error.html")
      console.error('A mappák lekérése során hiba történt:', error);
      if (!res.aborted) {
        res.cork(() => {
          res.writeStatus('500 Internal Server Error');
          res.end('Hiba történt a könyvtárak lekérése során.');
        });
      }
    }
  })


  // Jelenlegi mappa végpontja
  .get('/currentFolder', (res, req) => {
    res.cork(() => {
      res.writeHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ folderName: path.basename(folderPath) }));
    });
  })


  // Új mappa beállítás végpontja
  .post('/setFolderPath', async (res, req) => {
    res.onAborted(() => {
      console.error('Mappabeállítási kérés megszakítva.');
    });

    let buffer = '';
    res.onData(async (chunk, isLast) => {
      buffer += Buffer.from(chunk).toString();
      if (isLast) {
        try {
          const jsonData = JSON.parse(buffer);
          const newPath = jsonData.newPath;


          // Az új mappa teljes elérési útvonalának ellenőrzése
          if (newPath && await isExists(path.join(defPath, newPath))) {
            folderPath = path.join(defPath, newPath + '/');
            res.cork(() => {
              res.writeHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: true }));
            });
          } else if (newPath && await isExists(newPath)) {
            folderPath = newPath;
            res.cork(() => {
              res.writeHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: true }));
            });
          } else {
            res.cork(() => {
              res.writeHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, message: 'Érvénytelen mappa.' }));
            });
          }
        } catch {
          res.cork(() => {
            res.writeHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, message: 'Érvénytelen JSON.' }));
          });
        }
      }
    });
  })


  // Fájlnévben keresés végpont
  .get('/searchFiles', async (res, req) => {

    abortController.abort(); // Leállítjuk az előző keresési műveleteket
    abortController = new AbortController();
    const signal = abortController.signal;

    res.onAborted(() => {
      abortController.abort(); // Abortáljuk a keresést, ha a kapcsolat megszakad
    });

    const query = req.getQuery('q');
    if (!query) {
      res.cork(() => {
        res.writeHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify([]));
      });
      return;
    }

    try {
      // Készítsük el az összes fájl listáját aszinkron módon
      const getFilesPromise = getAllFiles(folderPath, signal);

      // Versenyeztessük a fájlok betöltését az abortálással
      const allFiles = await Promise.race([
        getFilesPromise,
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error("Keresés megszakítva"))))
      ]);

      const results = await Promise.all(allFiles.map(async filePath => {
        if (signal.aborted) {
          return null;
        }

        try {
          const fileName = path.basename(filePath).toLowerCase();
          if (fileName.includes(query.toLowerCase()) && !excludeFile(fileName)) {
            return path.relative(folderPath, filePath);
          }
        } catch (err) {
          console.error(`A fájlnevet nem lehet ellenőrizni: ${filePath}`, err);
        }
        return null;
      }));

      // Filter null értékek eltávolítása
      const filteredResults = results.filter(result => result !== null);

      if (!signal.aborted) {
        res.cork(() => {
          res.writeHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(filteredResults));
        });
      }
    } catch (error) {
      if (error.message !== "Keresés megszakítva") {
        console.error('A fájlnevek keresése során hiba történt: ', error);
      }
      if (!signal.aborted) {
        res.cork(() => {
          res.writeStatus('500 Internal Server Error');
          res.writeHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Hiba történt a fájlnevek keresése során.');
        });
      }
    }
  })


  // Fájl megnyitás végpont
  .get('/open/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
    });
    const filePath = path.join(folderPath, decodeURIComponent(req.getUrl().replace('/open/', '')));
    openFile(filePath);
    res.cork(() => {
      res.writeHeader('Content-Type', getContentType(filePath));
      res.end();
    });
  })


  // Fájl mappa megnyitás végpont
  .get('/openFolder/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
    });

    const filePath = path.join(folderPath, decodeURIComponent(req.getUrl().replace('/openFolder/', '')));
    openFolder(filePath);
    res.cork(() => {
      res.writeHeader('Content-Type', getContentType(filePath));
      res.end();
    });
  })


  // Fájl útvonal másolása
  .get('/copyPath/*', (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
    });

    const filePath = path.join(folderPath, decodeURIComponent(req.getUrl().replace('/copyPath/', '')));
    copyPath(filePath);
    res.cork(() => {
      res.writeHeader('Content-Type', getContentType(filePath));
      res.end();
    });
  })

  // Szerver indítása a 3000-es porton.
  .listen(3000, (token) => {
    if (token) {
      console.log('A szerver elindult.\nA leállításhoz zárd be ezt a parancssort.');
    } else {
      console.error('Nem sikerült elindítani a szervert.');
    }
  });