# Body Action Explorer — MVP

A mobile-first 3D anatomy prototype that takes ordinary-language body actions ("suck tummy in", "open mouth", "turn head left", compound phrases, etc.), maps them to standardized anatomical actions, and highlights contracting / assisting / relaxing muscles on a real rotatable 3D model.

## Run it

This app must be served over HTTP because it uses ES modules and loads a remote GLB.

```bash
cd body-action-explorer
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## What is real now

- Real 3D muscle model from DrMuratAltun/anatomi-simulatoru (`systems/kas.glb`)
- Rotatable/pinch-zoom Three.js viewer
- Runtime inspection of actual GLB mesh names
- Side-aware structure matching where `.l` / `.r` names are available
- Contracting / assisting / relaxing visual states
- Compound inputs such as `suck tummy in and turn head left`
- Ambiguity handling for phrases such as `flex right arm`
- Language interpretation is separated from model rendering, so the search layer can be replaced by an LLM/API later without rebuilding the 3D viewer

## Important MVP limitation

The local interpreter is deliberately conservative. It recognizes anatomical action patterns rather than pretending it can understand every sentence. Truly arbitrary natural-language interpretation requires an AI service/backend (or a much larger local semantic model). The 3D/anatomy layer is already separated so that can be added cleanly.

## Data/licensing

The remote 3D anatomy data is from the `DrMuratAltun/anatomi-simulatoru` project, which documents its 3D data as CC BY-SA 4.0 derived from BodyParts3D / Z-Anatomy. Any redistributed derivative anatomy data must follow the applicable attribution and ShareAlike terms. This MVP links to the remote model rather than bundling it.

Project source: https://github.com/DrMuratAltun/anatomi-simulatoru
