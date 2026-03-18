# TLT — Taming the Long-Tail: Interactive Dashboard

An interactive visualization dashboard for the ASPLOS '26 paper:

**[Taming the Long-Tail: Efficient Reasoning RL Training with Adaptive Drafter](https://arxiv.org/pdf/2511.16665)**

*MIT × NVIDIA × ETH Zurich × UMass Amherst*

---

## What is this?

This is a single-page web dashboard that makes the key results of the TLT paper explorable and interactive. It visualizes how TLT solves a critical efficiency bottleneck in reinforcement learning (RL) training for reasoning LLMs: the **long-tail distribution** of rollout response lengths, where a handful of extremely long responses force all GPUs to wait idle.

TLT introduces **adaptive speculative decoding** — a lightweight draft model predicts tokens that the main model verifies in parallel. This kicks in only when active requests drop below a threshold, turning wasted GPU cycles into accelerated tail completion with **zero loss in output quality**.

### Key result

**1.7–2.1× end-to-end training speedup** over the state-of-the-art (VeRL) across Qwen-7B, DeepSeek-7B, Qwen-32B, and Llama-70B on both H100 and A100 GPUs.

---

## Dashboard Tabs

| Tab | What it shows |
|---|---|
| **Overview** | End-to-end training speed (Fig 11), response-length distribution (Fig 1a), RL step timeline comparing Vanilla vs TLT (Fig 1b), and token accept rates for vanilla vs adaptive drafter (Fig 16) |
| **Training Simulator** | Animated side-by-side simulation of Baseline vs TLT rollout — watch 128 requests complete in real-time, see GPU utilization diverge, and observe speculative decoding activate on the long tail |
| **SD Strategy Explorer** | Heatmaps for accept length and speedup across draft depth × tokens-to-verify (Fig 13), batch-size sensitivity (Table 4), and TopK analysis (Table 1) |
| **Benchmarks** | GPU diversity and speedups across B200/H100/A100/RTX cards (Table 2), cluster scaling (Table 3), CUDAGraph memory optimization (Table 5), SD method comparison (Table 7), and drafter effectiveness (Table 6) |
| **Case Study** | Configurable cost/time savings calculator, running-request profile with saved-area visualization (Fig 14), and ByteDance production trace over 385 RL steps (Fig 2) |
| **Methodology** | Animated walkthrough of the TLT architecture: GRPO RL pipeline, Adaptive Drafter with Spot Trainer, and Adaptive Rollout Engine with BEG-MAB tuner |

All data is sourced directly from the paper's tables and figures.

---

## Tech Stack

- **Vanilla HTML/CSS/JS** — no build step, no framework dependencies
- **Chart.js** — bar, line, and area charts
- **Canvas 2D API** — custom heatmaps and the training simulator panes
- **JetBrains Mono + DM Sans** — typography via Google Fonts

---

## Running Locally

Open `index.html` in a browser. No server required — everything runs client-side.

```bash
# or use any static file server:
npx serve .
python -m http.server
```

---

## Project Structure

```
├── index.html          # Single-page app shell and all tab markup
├── css/styles.css      # All styling, responsive breakpoints, print styles
├── js/
│   ├── app.js          # Shared config, color palette, Chart.js defaults, tab routing
│   ├── overview.js     # Overview tab charts and RL step timeline
│   ├── simulator.js    # Training simulator (canvas-based rollout animation)
│   ├── sd-explorer.js  # SD Strategy Explorer heatmaps and tables
│   ├── benchmarks.js   # Benchmark charts and comparison tables
│   ├── casestudy.js    # Case study calculator and production trace
│   └── methodology.js  # Methodology tab animations
└── img/
    └── fox.gif         # Favicon / logo
```

---

## Paper Citation

```bibtex
@inproceedings{tlt2026,
  title     = {Taming the Long-Tail: Efficient Reasoning RL Training with Adaptive Drafter},
  author    = {Qinghao Hu and Shang Yang and Junxian Guo and Xiaozhe Yao and Yujun Lin and Yuxian Gu and Han Cai and Chuang Gan and Ana Klimovic and Song Han},
  booktitle = {Proceedings of the 31st ACM International Conference on Architectural Support for Programming Languages and Operating Systems (ASPLOS '26)},
  year      = {2026},
  doi       = {10.1145/3779212.3790231}
}
```

---

## Credits

Dashboard by [Eric Hibbs](https://github.com/EricHibbsGH). Paper code at [mit-han-lab/fastrl](https://github.com/mit-han-lab/fastrl).
