# Bolt Courier — Earnings (mock MVP)

A single-page mock of an income-tracking screen for Bolt couriers. Built as a design/UX prototype — no backend, all data is hard-coded.

## Features

- Net + gross income, average net €/hour, trips, distance
- Stacked bar chart (fares + tips) with Today / This week / This month / This year toggle
- Left/right arrows to step back through previous periods
- Recent trips list with route, distance, and net amount

## Run

Just open `index.html` in a browser:

```sh
open index.html
```

No build step, no dependencies to install. Chart.js is loaded from a CDN.

## Stack

- Plain HTML / CSS / JavaScript
- [Chart.js 4](https://www.chartjs.org/) via CDN
- Inter font via Google Fonts
