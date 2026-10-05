# OversharingUtils

Webapp educativa per al projecte de síntesi sobre oversharing, privacitat digital i cookies rastrejadores. Té una interfície d’estil terminal i funciona com una pàgina estàtica, sense instal·lació ni servidor.

## Funcions

- Explica què és l’oversharing i els riscos de compartir dades personals.
- Presenta un cas documentat de ciberassetjament a Telde i el cas de Cambridge Analytica.
- Explica com funcionen les cookies i inclou una simulació interactiva de peticions HTTP.
- Analitza text amb regles senzilles que assenyalen ubicacions, rutines, dades de contacte i enllaços.
- Permet seleccionar o arrossegar imatges per veure’n una previsualització local i afegir-hi una descripció.
- Ofereix els idiomes castellà, català i anglès, i els temes fosc i clar.
- Inclou consells de privacitat i referències en castellà o català, com ara l’AEPD, RTVC, la FTC en castellà i Cadena SER Almería.

## Com obrir-la

Obre [`index.html`](index.html) amb un navegador web actual. No cal compilar, instal·lar dependències ni iniciar un servidor. La webapp està continguda en aquest únic fitxer HTML.

## Escàner i imatges

Escriu o enganxa un exemple al camp de text i prem **Analitzar borrador** o **Retorn**. Fes servir **Maj+Retorn** per afegir una línia. El botó **Neteja** esborra el text, la descripció i les imatges de la sessió.

Pots seleccionar imatges amb el botó **Afegeix imatges** o arrossegar-les a la zona de càrrega. S’admeten fitxers d’imatge de fins a 8 MB cadascun. Les previsualitzacions es creen al navegador i pots treure cada imatge amb el botó ×.

La demo no envia ni desa les imatges, no llegeix els píxels ni n’extreu text. Descriu manualment els detalls que vols revisar. L’escàner és una comprovació heurística local, no una IA real ni un substitut del criteri personal.

Les preferències d’idioma i tema es desen a l’emmagatzematge local del navegador.

## Estructura

```text
outputs/
├── index.html   # Webapp autocontinguda: HTML, estils i JavaScript
└── README.md    # Aquest document
```

## Fonts

La pàgina enllaça a recursos de l’Agència Espanyola de Protecció de Dades (AEPD), una notícia de RTVC sobre el cas de Telde, informació en castellà de la Comissió Federal de Comerç dels EUA sobre Facebook/Cambridge Analytica i una crònica de Cadena SER Almería sobre Strava. Els enllaços apareixen al final de la pàgina.
