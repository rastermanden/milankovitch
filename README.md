# Milankovitch cycles

An interactive, mobile-friendly website that explains the Milankovitch cycles
with live 3D models: how the stretching of Earth's orbit (eccentricity), the
nodding of its axis (obliquity) and the wobble of that axis (precession) change
the summer sunlight at high northern latitudes, and how that drives polar ice
and the planet's effective albedo, and finally what the Stefan–Boltzmann
energy balance says that albedo means for temperature.

## What's on the page

| Section | 3D stage | Controls |
| --- | --- | --- |
| Hero | Turning Earth with present-day ice caps | drag to rotate |
| Eccentricity | Sun, elliptical orbit, Earth with tilted axis, season markers | eccentricity, day of year, play |
| Obliquity | Earth with axis, tropics, polar circles and ice edges | tilt (presets 22.1° / 23.4° / 24.5°), season |
| Precession | Earth at perihelion, axis sweeping its cone | longitude of perihelion, play |
| 800 kyr timeline | Earth at northern midsummer with modelled ice | time slider (−800 to +100 kyr), play, scrubbable chart |
| Energy balance | Live energy budget (in, reflected, absorbed, radiated) | albedo slider, presets, pull the albedo from the tilt lab or timeline |

Every readout is computed live from the orbital elements (see `js/orbital.js`).

## Running it

It is a static site with no build step. Serve the folder with any static
server, for example:

```sh
npx http-server -p 8080 .
```

and open `http://localhost:8080`. Three.js and the fonts are loaded from
CDNs, so the page needs internet access.

## Publishing and PR previews

Two GitHub Actions workflows publish the site to the `gh-pages` branch, so
GitHub Pages should be set to serve that branch from its root (Settings →
Pages → Deploy from a branch → `gh-pages` / `/ (root)`):

- `.github/workflows/deploy.yml` runs on every push to `main` and publishes
  the site to the root of `gh-pages`.
- `.github/workflows/pr-preview.yml` runs on every pull request and publishes
  a preview to `pr-preview/pr-<number>/` on the same branch, at
  `https://<owner>.github.io/<repo>/pr-preview/pr-<number>/`. The link is
  posted as a comment on the PR, the preview is refreshed on each push, and
  it is deleted when the PR is closed or merged. Pull requests from forks do
  not get a preview, because their workflow token cannot push to the branch.

Both workflows copy the site into a `_site` folder first, leaving out
`README.md` and `.github`, and add `.nojekyll` so Pages serves the files
as they are.

## How the numbers are made

- **Orbital elements** follow the trigonometric series of Berger (1978,
  *J. Atmos. Sci.* 35), truncated to the leading terms. Present-day output:
  e = 0.0165, ε = 23.44°, perihelion on 4 January.
- **Insolation** is the daily-mean top-of-atmosphere value with a solar
  constant of 1361 W/m². The classic diagnostic, 65°N on the June solstice,
  comes out at 478 W/m² today, 528 W/m² 11 kyr ago and 461 W/m² 23 kyr ago.
- **Ice edges** use a deliberately simple equilibrium model: each polar cap's
  edge moves linearly with that hemisphere's midsummer sunlight.
- **Effective albedo** is the annual-sunlight-weighted average of surface
  albedo (66% for ice, 27% otherwise), so ice near the poles counts less than
  its area, and a larger tilt makes polar ice matter more.
- **Energy balance and temperature** apply the Stefan–Boltzmann law to that
  albedo. Global annual-mean sunlight is S/(4√(1−e²)) ≈ 340 W/m²; the
  absorbed part (1−α) of it must be re-radiated as σT⁴, which fixes the
  radiating temperature Tₑ = [S(1−α)/4σ]^¼ ≈ 255 K. Surface temperature
  uses a grey atmosphere, (S/4)(1−α) = εσTₛ⁴, with ε ≈ 0.62 calibrated so
  today gives 288 K. The Planck response Tₛ/4F ≈ 0.30 K per W/m² is all
  that is included: no water-vapour, cloud or lapse-rate feedbacks, no CO₂.

This is an explainer, not a climate model. There is no ocean, no carbon
cycle, no ice dynamics and no lag.

## Files

```
.github/workflows/deploy.yml       publish main to gh-pages
.github/workflows/pr-preview.yml   publish a preview per pull request
index.html      page structure and copy
css/style.css   styles (single dark theme)
js/orbital.js   Berger series, insolation, ice–albedo model, energy balance
js/earth.js     procedural Earth texture and ice-cap shader
js/stage.js     one WebGL context rendered into several page viewports
js/scenes.js    the five 3D stages
js/chart.js     time-series chart
js/main.js      wiring between sliders, model and scenes
```
