# Diplomová práce
### Domácí kvíz s využitím mobilního telefonu jako hlasovacího zařízení
### Bc. Martin Baláž
## Instalace a spuštění

### 1. Volitené spuštění na vlastním zařízení
Pokud máte zájem, můžete si zapnout aplikaci v development módu, nebo si vytvoři vlastní .exe soubor.
Podle toho, který způsob si vyberete, musíte na backendu v souboru `app.py` následovat instrukce v komentářích.

#### Development mód (port 3000)
1. Sputit dva terminály - jeden na backend, druhý na frontend, v obojích jsme ve složce `HomeQuiz`.
2. Backend:
   - `cd HomeQuizServer`
   - `pip install -r requirements.txt` (pouze poprvé, nainstaluje potřebné Python balíčky do vašeho Python prostředí)
   - `& [pathToPython]/python.exe [pathToApp]/HomeQuiz/HomeQuizServer/app.py` (nebo prostě příkazem `app.py` ve složce `HomeQuizServer`, pokud máte python.exe v PATH)
3. Frontend:
   - `cd HomeQuizClient`
   - `npm install` (pouze poprvé, nainstaluje JavaScript závislosti do složky node_modules)
   - `npm start`
4. Bude automaticky spuštěn prohlížeč a lze začít používat aplikaci.

#### Vytvoření vlastního .exe po nějakých úpravách (port 5000)
1. Spustit dva terminály - jeden na backend, druhý na frontend, v obojích jsme ve složce `HomeQuiz`
2. Frontend:
   - `cd HomeQuizClient`
   - `npm install` (pokud jste ještě neinstalovali JavaScript závislosti)
   - `npm run build`
   - Poté zkopírovat obsah složky `build` z frontendu do backendu do složky `static`
     -- takže `static` bude obsahovat jinou `static` složku, `index.html`, a další soubory
3. Backend:
   - `cd HomeQuizServer`
   - `pip install -r requirements.txt` (pokud jste ještě neinstalovali Python závislosti)
   - `pip install pyinstaller` (pokud nemáte nainstalovaný PyInstaller)
   - `pyinstaller app.spec`
4. .exe soubor byl vytvořen na backendu ve složce `dist`.

### 2. Generování dokumentací
Dokumentace jsou již vygenerovány ve složce `docs` jak na backendu, tak na frontendu. Pro její zobrazení stačí spustit soubor `index.html` v prohlížeči.

Níže uvádím příkazy, kterými lze dokumentaci znovu vygenerovat - především pro případný zájem nebo úpravy.
#### Frontend
- `cd HomeQuizClient`
- `npm run docs `

#### Backend
- `cd HomeQuizServer`
- `pdoc --html --output-dir ./docs ./app --force`