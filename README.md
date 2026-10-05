# OverSharing Utils

Webapp educativa per al projecte de síntesi sobre oversharing, privacitat digital i cookies rastrejadores. Té una interfície d’estil terminal i funciona com una pàgina estàtica, sense instal·lació ni servidor.

## Contingut

- Explicació de què és l’oversharing i dels riscos de compartir informació personal.
- Casos documentats relacionats amb l’exposició de dades i l’assetjament en línia.
- Guia sobre cookies de primera i tercera part, cookies de sessió i persistents.
- Simulació interactiva de peticions HTTP per mostrar com es crea i es torna a enviar una cookie.
- Escàner educatiu per detectar al text pistes com ubicacions, rutines, dades de contacte i enllaços.
- Selecció d’imatges amb previsualització local i un camp per descriure què s’hi veu.
- Controls per canviar entre castellà, català i anglès, i entre tema fosc i clar.
- Consells de protecció i enllaços a fonts per ampliar la informació.

## Com obrir-la

Obre [`index.html`](index.html) amb un navegador web actual. No cal compilar, instal·lar dependències ni iniciar un servidor. La webapp està continguda en aquest únic fitxer HTML.

## Escàner i imatges

L’escàner aplica regles senzilles al text escrit per l’usuari. Les imatges es poden seleccionar amb el botó **Afegeix imatges** o arrossegar a la zona de càrrega. La mida màxima és de 8 MB per imatge.

Les imatges només es mostren en una previsualització del navegador. La demo no les puja a cap servidor, no les desa i no n’analitza els píxels ni n’extreu text. Per això, cal descriure al camp de text els detalls que es volen revisar; la comprovació continua sent heurística, no és una IA real ni substitueix la revisió personal.

La preferència d’idioma i de tema es desa a l’emmagatzematge local del navegador.

## Estructura

```text
outputs/
├── index.html   # Webapp autocontinguda: contingut, estils i JavaScript
└── README.md    # Aquest document
```

## Fonts principals

La mateixa pàgina inclou enllaços a la FTC, la Unió Europea, la Comissió Europea i al relat de Laura Barton publicat a *The Guardian*. Consulteu-los per verificar dades i ampliar els casos abans de citar-los en un treball.
