# OversharingUtils

<img src="outputs/assets/oversharingutils-logo.svg" alt="Logotip d’OversharingUtils" width="112">

Projecte educatiu de Sergi i Hugo sobre l’oversharing, les galetes i la privacitat digital. Inclou explicacions, demostracions interactives i una revisió d’imatges. La interfície es pot veure en català, castellà i anglès, i permet canviar el tema i el color d’accent.

## Requisits

- Node.js
- pnpm

## Com iniciar el projecte

Des de la carpeta principal del projecte, executa:

```sh
pnpm install
pnpm start
```

El servidor mostra a la terminal l’adreça on s’ha iniciat. Normalment és <http://localhost:3000>; si el port 3000 ja està ocupat, prova automàticament el 3001. Obre l’adreça indicada per la terminal. No obris `outputs/index.html` directament com a fitxer: les API i els mòduls visuals necessiten servir-se per HTTP.

El servidor escolta a les interfícies de xarxa perquè es pugui provar des d’altres dispositius de la mateixa xarxa local. Fes-ho només en una xarxa de confiança i no exposis el port a Internet: el servidor no té inici de sessió.

Per tornar a compilar els components de Lumen UI després de canviar `outputs/lumen-entry.js`, executa:

```sh
pnpm run build:ui
```

## Funcions

- Explicacions senzilles sobre compartir massa informació i exemples documentats a Espanya.
- Simulador educatiu de galetes essencials i de seguiment.
- Consola interactiva que mostra dades fictícies o locals del navegador. La consulta de la IP pública és opcional i només s’executa amb el consentiment de la persona.
- Analitzador de metadades d’una pàgina web pública: mostra camps com el títol, la descripció, l’autor, Open Graph, Twitter Cards, dades estructurades i etiquetes d’imatges.
- Analitzador local d’imatges amb revisió ràpida de metadades en seleccionar el fitxer i anàlisi visual opcional en prémer el botó. Els resultats es divideixen en tres blocs:
  1. **Rostres:** Human detecta possibles rostres. S’apliquen llindars de confiança, una mida mínima i la validació de la malla facial per reduir deteccions falses. El resultat no identifica ningú.
  2. **Escena i elements visibles:** CLIP proposa una categoria general, com ara carrer, edifici, parc, platja, paisatge, interior o retrat. DETR llista objectes reconeguts i l’OCR cerca text llegible, com adreces o coordenades escrites.
  3. **Metadades:** Exifr cerca camps EXIF i coordenades GPS. Si troba coordenades vàlides, les mostra i ofereix obrir-les a OpenStreetMap.
- L’analitzador d’imatges accepta JPG, PNG i WebP per a la vista prèvia i l’anàlisi visual. La lectura de metadades GPS es confirma per a JPEG i PNG; en WebP, la pàgina no afirma que hagi pogut comprovar el GPS.
- Opció d’anàlisi visual externa amb Gemini Flash-Lite: descriu la imatge, llegeix possibles textos i comenta indicis de lloc. Només s’activa després de marcar el consentiment i prémer el botó; no fa una cerca inversa de fotos com Google Lens.
- Eina per crear i descarregar una còpia reprocessada de la imatge, sense modificar l’original, per eliminar-ne les metadades habituals.
- Kids Mode amb consells i un qüestionari de quatre preguntes. Les respostes només s’utilitzen per mostrar recomanacions i no es desen.
- Interfície adaptable a mòbils i tauletes, amb controls tàctils, navegació horitzontal i resultats en una columna en pantalles estretes.
- Animacions en desplaçar-se, controls de tema i color, i suport per a la preferència de moviment reduït del dispositiu.

## Models i primera càrrega

En seleccionar una imatge, es revisen les metadades. Els models visuals només es descarreguen quan la persona inicia l’anàlisi visual; la primera càrrega necessita connexió a internet, pot tardar i consumir dades. El navegador desa aquests recursos a la memòria cau. La imatge triada s’analitza al dispositiu i no s’envia als servidors dels models.

Human s’utilitza per a la detecció de rostres; DETR per al reconeixement d’objectes; CLIP per comparar la imatge amb categories generals d’escena; Exifr per llegir metadades. L’OCR cerca text que pugui contenir informació personal o pistes d’ubicació.

Els motors de visió són al mòdul `outputs/modules/image-analysis.js` i es carreguen quan es prem el botó d’anàlisi visual. Si el navegador és en un context segur i té WebGPU, s’intenta fer servir la GPU; si no, es fa servir el model quantitzat compatible amb CPU. En equips amb prou memòria, els models es mantenen carregats durant la sessió per accelerar les imatges següents; en dispositius més limitats, s’alliberen després de cada passada. Els models continuen disponibles a la memòria cau del navegador. Els resultats són orientatius. Les deteccions d’OCR es fan servir per trobar patrons sensibles, però no es mostra ni es desa el text reconegut.

### Opció externa gratuïta amb Gemini

L’opció externa és una ajuda visual inspirada en algunes funcions de Google Lens: pot descriure una escena, llegir text visible i suggerir indicis d’un lloc. No cerca imatges semblants al web ni garanteix identificar un monument o una adreça. Les coordenades GPS només provenen dels metadades EXIF.

Per activar-la en desenvolupament, crea una clau a [Google AI Studio](https://aistudio.google.com/api-keys). La pots escriure a **Opcions avançades** de la pàgina, o passar-la al servidor com a variable d’entorn. Per exemple, a Linux o macOS:

```sh
export GEMINI_API_KEY="la-teva-clau"
pnpm start
```

La clau escrita a la pàgina es manté només a la memòria de la pestanya i s’envia al servidor local quan demanes l’anàlisi; no s’escriu a `localStorage` ni a disc. Si accedeixes al servidor des d’un altre dispositiu per HTTP, fes-ho només en una xarxa de confiança perquè el trànsit no està xifrat. El servidor no retorna la clau al navegador. GitHub Pages, sense un backend configurat, manté disponible l’anàlisi local però no aquesta opció. L’aplicació redueix la imatge, la converteix a JPEG per eliminar-ne els EXIF i només l’envia a Google si la persona marca la casella i prem el botó. El nivell gratuït té límits de quota i Google indica que les sol·licituds del nivell gratuït es poden fer servir per millorar els seus productes. Revisa els [preus i límits vigents](https://ai.google.dev/gemini-api/docs/pricing) abans de fer-la servir; no és una quota il·limitada.

## Privacitat i límits

- L’anàlisi local d’imatges no puja la fotografia. Si s’activa l’opció externa, una còpia reduïda sense metadades EXIF s’envia a Google Gemini després del consentiment explícit. Les puntuacions són orientatives i poden equivocar-se, ometre elements o generar falsos positius. Un resultat sense alertes no garanteix que una imatge sigui segura.
- CLIP només estima una categoria general i mostra una coincidència relativa, no una probabilitat calibrada. No identifica per si sol una ciutat, un carrer ni un monument concret. La pàgina no inventa una ubicació exacta a partir del paisatge.
- Les coordenades només es mostren si es poden llegir de les metadades. Sense coordenades GPS, l’analitzador pot informar de text o elements visibles, però no afirma conèixer el lloc exacte. Si s’obre el mapa, OpenStreetMap rep les coordenades.
- L’OCR pot llegir malament o no detectar text petit, borrós, inclinat, manuscrit o tapat. Human detecta possibles rostres, però no identifica les persones.
- L’analitzador de pàgines envia l’adreça introduïda al servidor local, que descarrega només el HTML públic. Només admet HTTP/HTTPS, rebutja adreces locals o privades, no executa scripts, limita la resposta a 1,5 MB i interromp les peticions que tarden massa.
- Les API de metadades de pàgines i Gemini només existeixen al servidor Node local. A GitHub Pages, que és allotjament estàtic, aquestes funcions de servidor no estan disponibles sense desplegar un backend.
- La consola no consulta la IP automàticament. Si demanes la IP pública, `api.ipify.org` rep la petició i pot veure la teva IP. Les demostracions de galetes són simulacions i no instal·len galetes de seguiment reals.

## Diagnòstic

- Comprova que `pnpm start` continua actiu i obre l’URL que ha indicat la terminal. Si veus errors de connexió o la pàgina s’ha obert com a `file://`, inicia el servidor i torna-la a obrir per HTTP.
- Visita `/api/health` al mateix port de la pàgina. Una resposta JSON amb `"ok":true` confirma que el servidor actual està actiu. Si la pàgina carrega però aquesta ruta respon 404, probablement estàs veient una versió antiga o estàtica.
- En la primera anàlisi visual cal Internet per descarregar els models. Espera que acabin de carregar; si un motor falla, la resta de comprovacions disponibles poden continuar mostrant resultats parcials.
- Gemini és opcional: cal escriure una clau a «Opcions avançades» o configurar `GEMINI_API_KEY` al servidor. La clau no s’inclou al repositori ni es desa al navegador.

## Tecnologies

- HTML, CSS i JavaScript en fitxers separats.
- Node.js per al servidor local i l’API de metadades de pàgines.
- [Lumen Elements](https://www.npmjs.com/package/@santi020k/lumen-elements) per als components d’interfície.
- [Human](https://github.com/vladmandic/human) per detectar rostres.
- [Transformers.js](https://huggingface.co/docs/transformers.js) amb [DETR](https://huggingface.co/Xenova/detr-resnet-50) i [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) per a objectes i categories d’escena.
- [Exifr](https://github.com/MikeKovarik/exifr) per llegir metadades i GPS.
- [Tesseract.js](https://github.com/naptha/tesseract.js) per a OCR local.
- [Gemini API](https://ai.google.dev/gemini-api/docs/image-understanding) com a opció de visió externa, desactivada si el servidor no té una clau configurada.

## Fitxers principals

- `outputs/index.html`: estructura i contingut de la pàgina.
- `outputs/styles.css`: estils, temes, adaptació a mòbils i animacions.
- `outputs/script.js`: idioma, consola, Kids Mode i lògica dels analitzadors.
- `outputs/modules/image-analysis.js`: detectors locals de rostres i objectes, classificador d’escenes i OCR.
- `outputs/assets/oversharingutils-logo.svg`: logotip de la capçalera i d’aquest README.
- `outputs/lumen-entry.js`: components Lumen utilitzats.
- `outputs/lumen-ui.js` i `outputs/lumen-ui.css`: compilació local dels components i estils Lumen.
- `server.mjs`: servidor local, comprovació d’estat (`/api/health`), API de metadades de pàgines i proxy protegit per a l’anàlisi opcional amb Gemini. Si el port per defecte està ocupat, prova el següent.
- `package.json` i `pnpm-lock.yaml`: dependències i ordres del projecte.

## Autors

Sergi i Hugo · Projecte de síntesi
