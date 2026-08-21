# Hotel Rate Comparator using Temporal.io

A full-stack, state-of-the-art Hotel Rate Comparator application built with **Next.js (App Router)**, **TypeScript**, and the **Temporal SDK**. 

This application simulates calling two external supplier APIs with various real-world latencies, errors, and empty responses. It leverages **Temporal Workflows** to reliably orchestrate parallel requests, enforce timeouts, handle retry policies, and support user-initiated cancellations.

---

## Technical Architecture & Core Features

1. **Parallel Execution**: Fetches rates from Supplier A and Supplier B in parallel.
2. **Timeout Handling**: If a supplier takes $>5\text{s}$, its activity is cancelled, and the workflow proceeds with the other supplier's result.
3. **Automatic Retries**: Intercepts transient server failures and uses a Temporal retry policy (retries up to 3 times before failing).
4. **Deterministic Tie-breaker**: Selects the cheapest rate; if rates are identical, it picks deterministically (defaulting to Supplier A).
5. **Interactive UI Log Tracker**: Shows the live step-by-step state transitions of the Temporal workflow in real-time.
6. **Graceful Cancellation**: Instantly cancels the running Temporal workflow if the user cancels the search.

---

## Getting Started

You can run this project either **locally** (using the Temporal CLI) or via **Docker Compose** for a 1-click startup.

### Option A: Run via Docker Compose (Recommended)
This spins up Postgres, the Temporal Server, the Temporal Web UI, the Next.js App, and the Temporal Worker automatically.

1. Ensure Docker is running.
2. Run:
   ```bash
   docker compose up --build
   ```
3. Open:
   * **Web UI (Search Dashboard)**: [http://localhost:3000](http://localhost:3000)
   * **Temporal Web Console**: [http://localhost:8080](http://localhost:8080) (to monitor workflow runs)

---

### Option B: Run Locally

#### 1. Start Temporal Local Server
If you have the [Temporal CLI](https://docs.temporal.io/cli) installed:
```bash
temporal server start-dev
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Run the Next.js Dev Server
```bash
npm run dev
```

#### 4. Run the Temporal Worker
In a separate terminal:
```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000).

---

## Simulating Scenario Scenarios

Inside the UI, expand the **Supplier Simulation Config** dashboard to verify all requirements:

* **Supplier A Cheaper**: Set default options, search, and observe Supplier A selected.
* **Supplier B Cheaper**: Set default options, search, and observe Supplier B selected.
* **One Supplier Takes >5s**: Slide Supplier B's latency to `6000ms`. Observe Supplier B timed out and cancelled, and the search successfully failing over to Supplier A's result.
* **Supplier Fails twice**: Check "Simulate Server Error" on Supplier A. The Temporal Worker will retry and still succeed if the 3rd attempt passes.
* **Cancel mid-way**: Click "Compare Hotel Rates", then immediately click **Cancel**. The workflow will stop gracefully and display a cancellation error.

---

## Running Tests

We have implemented a comprehensive test suite using **Vitest** and the **Temporal Testing Environment** (`@temporalio/testing`) to verify all workflow scenarios deterministically (using time-skipping).

Run the tests with:
```bash
npm run test
```
