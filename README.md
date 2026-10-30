# OversharingUtils

<img src="/assets/oversharingutils-logo.svg" alt="Logotip d’OversharingUtils" width="112">

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

Obre després <http://localhost:3000>. Cal iniciar el servidor local: a més de servir la web, proporciona l’API que consulta les metadades de pàgines públiques. No obris `outputs/index.html` directament com a fitxer.

Per tornar a compilar els components de Lumen UI després de canviar `outputs/lumen-entry.js`, executa:

```sh
pnpm run build:ui
```

## Funcions

- Explicacions senzilles sobre compartir massa informació i exemples documentats a Espanya.
- Simulador educatiu de galetes essencials i de seguiment.
- Consola interactiva que mostra dades fictícies o locals del navegador. La consulta de la IP pública és opcional i només s’executa amb el consentiment de la persona.
- Analitzador de metadades d’una pàgina web pública: mostra camps com el títol, la descripció, l’autor, Open Graph, Twitter Cards, dades estructurades i etiquetes d’imatges.
- Analitzador local d’imatges amb tres blocs de resultats:
  1. **Rostres:** Human detecta possibles rostres. S’apliquen llindars de confiança, una mida mínima i la validació de la malla facial per reduir deteccions falses.
  2. **Escena i elements visibles:** CLIP proposa una categoria general, com ara carrer, edifici, parc, platja, paisatge, interior o retrat. DETR llista objectes reconeguts i l’OCR cerca text llegible, com adreces o coordenades escrites.
  3. **Metadades:** Exifr cerca camps EXIF i coordenades GPS. Si troba coordenades vàlides, les mostra i ofereix obrir-les a OpenStreetMap.
- L’analitzador d’imatges accepta JPG, PNG i WebP per a la vista prèvia i l’anàlisi visual. La lectura de metadades GPS es confirma per a JPEG i PNG; en WebP, la pàgina no afirma que hagi pogut comprovar el GPS.
- Eina per crear i descarregar una còpia reprocessada de la imatge, sense modificar l’original, per eliminar-ne les metadades habituals.
- Kids Mode amb consells i un qüestionari de quatre preguntes. Les respostes només s’utilitzen per mostrar recomanacions i no es desen.
- Animacions en desplaçar-se, disseny adaptable, controls de tema i color, i suport per a la preferència de moviment reduït del dispositiu.

## Models i primera càrrega

La primera anàlisi d’imatges necessita connexió a internet per descarregar Exifr, Human, els models de DETR i CLIP, i les dades OCR. Pot tardar i consumir dades; el navegador desa aquests recursos a la memòria cau. La imatge triada s’analitza al dispositiu i no s’envia als servidors dels models.

Human s’utilitza per a la detecció de rostres; DETR per al reconeixement d’objectes; CLIP per comparar la imatge amb categories generals d’escena; Exifr per llegir metadades. L’OCR cerca text que pugui contenir informació personal o pistes d’ubicació.

## Privacitat i límits

- L’analitzador d’imatges no puja la fotografia. Les puntuacions dels models són orientatives i poden equivocar-se, ometre elements o generar falsos positius. Un resultat sense alertes no garanteix que una imatge sigui segura.
- CLIP només estima una categoria general i mostra una coincidència relativa, no una probabilitat calibrada. No identifica per si sol una ciutat, un carrer ni un monument concret. La pàgina no inventa una ubicació exacta a partir del paisatge.
- Les coordenades només es mostren si es poden llegir de les metadades. Sense coordenades GPS, l’analitzador pot informar de text o elements visibles, però no afirma conèixer el lloc exacte. Si s’obre el mapa, OpenStreetMap rep les coordenades.
- L’OCR pot llegir malament o no detectar text petit, borrós, inclinat, manuscrit o tapat. Human detecta possibles rostres, però no identifica les persones.
- L’analitzador de pàgines envia l’adreça introduïda al servidor local, que descarrega només el HTML públic. Només admet HTTP/HTTPS, rebutja adreces locals o privades, no executa scripts, limita la resposta a 1,5 MB i interromp les peticions que tarden massa.
- La consola no consulta la IP automàticament. Si demanes la IP pública, `api.ipify.org` rep la petició i pot veure la teva IP. Les demostracions de galetes són simulacions i no instal·len galetes de seguiment reals.

## Tecnologies

- HTML, CSS i JavaScript en fitxers separats.
- Node.js per al servidor local i l’API de metadades de pàgines.
- [Lumen Elements](https://www.npmjs.com/package/@santi020k/lumen-elements) per als components d’interfície.
- [Human](https://github.com/vladmandic/human) per detectar rostres.
- [Transformers.js](https://huggingface.co/docs/transformers.js) amb [DETR](https://huggingface.co/Xenova/detr-resnet-50) i [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) per a objectes i categories d’escena.
- [Exifr](https://github.com/MikeKovarik/exifr) per llegir metadades i GPS.
- [Tesseract.js](https://github.com/naptha/tesseract.js) per a OCR local.

## Fitxers principals

- `outputs/index.html`: estructura i contingut de la pàgina.
- `outputs/styles.css`: estils, temes, adaptació a mòbils i animacions.
- `outputs/script.js`: idioma, consola, Kids Mode i lògica dels analitzadors.
- `outputs/assets/oversharingutils-logo.svg`: logotip de la capçalera i d’aquest README.
- `outputs/lumen-entry.js`: components Lumen utilitzats.
- `outputs/lumen-ui.js` i `outputs/lumen-ui.css`: compilació local dels components i estils Lumen.
- `server.mjs`: servidor de desenvolupament i API de metadades de pàgines.
- `package.json` i `pnpm-lock.yaml`: dependències i ordres del projecte.

## Autors

Sergi i Hugo · Projecte de síntesi
