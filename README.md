# OversharingUtils  <img src="oversharingutils-logo.svg" alt="Logotip d’OversharingUtils" width="50">

Projecte educatiu de Sergi i Hugo per aprendre sobre el fet de compartir massa informació (oversharing), les galetes i la privacitat digital. La interfície és més clara i accessible, amb una consola educativa petita i continguts en català, castellà i anglès. Fa servir els components i estils locals de Lumen UI.

## Com obrir el projecte

Obre `outputs/index.html` amb un navegador. Els fitxers de Lumen ja estan compilats i desats a `outputs/`, de manera que no cal connexió a internet per carregar el disseny. Algunes funcions, com ara la consulta opcional de l’adreça IP, necessiten connexió.

Per tornar a compilar els components de Lumen després de modificar `outputs/lumen-entry.js`, instal·la les dependències i executa `pnpm run build:ui`.

## Què inclou

- Una explicació senzilla sobre l’oversharing i exemples documentats a Espanya.
- Un simulador educatiu de galetes essencials i de seguiment.
- Una consola interactiva amb dades locals del navegador, una galeta fictícia i una consulta opcional de l’adreça IP pública.
- Una revisió local d’imatges: mostra una vista prèvia, llegeix algunes metadades EXIF i fa servir detectors d’imatge si el navegador els ofereix. Permet baixar una còpia processada per eliminar-ne les metadades.
- Canvi d’idioma, tema i color d’accent, i un Kids Mode amb consells i una pregunta interactiva.
- Animacions que apareixen en desplaçar-se pel web.
- Interfície adaptable a mòbils, amb focus visible i suport per a la preferència de reducció de moviment del dispositiu.

## Privacitat i limitacions

La majoria de les demostracions s’executen al navegador. La consola no envia les dades del navegador ni crea una galeta real. Per consultar l’adreça IP pública, marca la casella de consentiment i prem el botó: el web contacta amb `api.ipify.org`, que rep la sol·licitud i pot veure l’adreça IP. La consulta no es fa automàticament.

La revisió d’imatges no és un model d’IA. Llegeix algunes metadades i només pot analitzar el contingut visual si el navegador ofereix les API corresponents; els resultats poden passar per alt informació. La imatge no es puja a cap servidor d’aquest projecte.

## Fitxers

- `outputs/index.html`: estructura i contingut de la pàgina.
- `outputs/assets/oversharingutils-logo.svg`: logotip vectorial utilitzat a la capçalera i al README.
- `outputs/styles.css`: estils i animacions.
- `outputs/script.js`: interaccions i lògica del prototip.
- `outputs/lumen-entry.js`: registre dels components Lumen que s’utilitzen.
- `outputs/lumen-ui.js` i `outputs/lumen-ui.css`: compilació local dels components i estils de Lumen.
- `package.json` i `pnpm-lock.yaml`: dependències i ordre de compilació dels components.
- `README.md`: descripció i guia d’ús.

## Autors

Sergi i Hugo · Projecte de síntesi
