# OversharingUtils

Projecte educatiu de Sergi i Hugo per aprendre sobre el fet de compartir massa informació (oversharing), les galetes i la privacitat digital. El web té una interfície inspirada en una terminal i inclou continguts en català, castellà i anglès.

## Com obrir el projecte

No cal instal·lar res ni fer servir eines de compilació. Obre `outputs/index.html` amb un navegador. Algunes funcions, com ara la consulta de l’adreça IP, poden dependre dels permisos de xarxa i de la disponibilitat del servei extern.

## Què inclou

- Una explicació senzilla sobre l’oversharing i exemples documentats a Espanya.
- Un simulador educatiu de galetes essencials i de seguiment.
- Una consola interactiva amb dades locals del navegador, una galeta fictícia i una consulta opcional de l’adreça IP pública.
- Una revisió local d’imatges: mostra una vista prèvia, llegeix algunes metadades EXIF i fa servir detectors d’imatge si el navegador els ofereix. Permet baixar una còpia processada per eliminar-ne les metadades.
- Canvi d’idioma, tema i color d’accent, i un Kids Mode amb consells i una pregunta interactiva.
- Animacions que apareixen en desplaçar-se pel web.

## Privacitat i limitacions

La majoria de les demostracions s’executen al navegador. La consola no envia les dades del navegador ni crea una galeta real. Per consultar l’adreça IP pública, marca la casella de consentiment i prem el botó: el web contacta amb `api.ipify.org`, que rep la sol·licitud i pot veure l’adreça IP. La consulta no es fa automàticament.

La revisió d’imatges no és un model d’IA. Llegeix algunes metadades i només pot analitzar el contingut visual si el navegador ofereix les API corresponents; els resultats poden passar per alt informació. La imatge no es puja a cap servidor d’aquest projecte.

## Fitxers

- `outputs/index.html`: pàgina completa, estils i JavaScript del prototip.
- `README.md`: descripció i guia d’ús.

## Autors

Sergi i Hugo · Projecte de síntesi
