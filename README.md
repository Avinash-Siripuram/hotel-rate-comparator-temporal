# Tripare Hotel Rate Comparator (Temporal Orchestrator)

A full-stack Hotel Rate Comparator application built to showcase **resilient background orchestration** using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and the **Temporal SDK**.

---

## 💡 What is this project? (Layman Explanation)

Imagine you are building a travel search engine (like Google Flights or Trivago). When a user searches for a hotel, your app needs to request rates from multiple supplier APIs (Supplier A and Supplier B) in parallel, choose the cheapest option, and show it to the user.

In a normal app, if a supplier's website is slow, or crashes mid-way, or if the user cancels the search, your backend code can easily get stuck, duplicate orders, or crash. 

This project uses **Temporal.io** to solve this. Temporal acts as an **invincible coordinator**. Even if the network drops, or the servers lose power, Temporal remembers exactly where the request was, handles retries automatically, cancels slow suppliers, and guarantees a reliable result.

---

## 🛠️ The 3 Components of the App

To run the application, you need three pieces working together:
1. **The Backend Infrastructure (Docker)**: A PostgreSQL database and the Temporal Server (which acts as the "brain" orchestrating the tasks).
2. **The Frontend UI (Next.js)**: The beautiful web interface where you select destinations, pick dates, and trigger searches.
3. **The Temporal Worker (NodeJS)**: The worker process that listens for search tasks and executes the API requests.

---

## 🚀 How to Run the App (Step-by-Step)

Follow these steps in order to start everything on your computer:

### Step 1: Start the Backend Infrastructure (Docker)
Ensure you have **Docker Desktop** running, open your terminal in the project directory, and run:
```bash
docker compose up -d
```
*This starts the PostgreSQL database, Temporal Server, and Temporal Web UI in the background.*

---

### Step 2: Install Node Dependencies
Install the required packages for the frontend and worker:
```bash
npm install
```

---

### Step 3: Run the Next.js Frontend
Start the web dashboard:
```bash
npm run dev
```
Once started, open **[http://localhost:3000](http://localhost:3000)** in your browser. You will see the light-themed booking interface.

---

### Step 4: Run the Temporal Worker
In a **new terminal window**, start the worker to execute the background search tasks:
```bash
npm run worker
```

*Now everything is running! You can monitor active workflows inside the **Temporal Web Console** at **[http://localhost:8080](http://localhost:8080)**.*

---

## 🧪 Interactive Scenario Guide

In the web interface, expand the **"Show Supplier Simulation Config"** section to simulate real-world API failures and see how Temporal handles them:

| Scenario / Goal | How to configure in UI | What to look for |
| :--- | :--- | :--- |
| **Normal Search** | Leave all delays at `0ms` and checkboxes unchecked. Click **Find Best Hotel Rate**. | The workflow finishes in `<1s` and displays quotes side-by-side. The cheapest rate gets a green **Best Deal** badge. |
| **Timeout Failover (Timeout >5s)** | Slide **Supplier B's Latency** to `6000ms`. Click **Find Best Hotel Rate**. | The workflow runs, and at the 5-second mark, automatically cancels Supplier B. It immediately displays Supplier A's rate. Supplier B's card shows `Exceeded 5s Activity Timeout`. |
| **Transient Error Retry** | Check **Server Error (500)** on Supplier A. Click **Find Best Hotel Rate**. | The Temporal worker will automatically retry Supplier A. Since the retry policy allows up to 3 tries, the search will still succeed if the subsequent retries pass. |
| **Graceful User Cancellation** | Start a search with a latency of `4000ms` on both suppliers. Click **Find Best Rate**, then click **Cancel Signal**. | The workflow cancels instantly. The flowchart steps show a `Failed` node, and the UI displays a `Search cancelled by user` alert. |

---

## 🧑‍💻 Running Automated Tests

We wrote 8 comprehensive integration tests inside the `tests/` directory using **Vitest** and the **Temporal Test Environment** (`@temporalio/testing`) to simulate time-skipping and verify retry behaviors deterministically.

To run the test suite:
```bash
npm run test
```
