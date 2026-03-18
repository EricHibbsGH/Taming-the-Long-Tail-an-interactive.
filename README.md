# TLT — Taming the Long-Tail: Adaptive Drafter Dashboard

An interactive visualization dashboard for the ASPLOS '26 paper:

**[Taming the Long Tail of RL for LLM Reasoning with Speculative Decoding](https://arxiv.org/pdf/2511.16665)**
*MIT × NVIDIA × ETH Zurich*

---

This dashboard explores how TLT addresses the long-tail problem in RL-based LLM training, where a small number of slow-to-generate responses bottleneck the entire rollout batch. It applies an adaptive speculative decoding strategy that activates only when active requests fall below a threshold — turning idle GPU compute into accelerated tail completion with no loss in output quality.

The dashboard covers five interactive views:

| Tab | Description |
|---|---|
| **Overview** | Key metrics, end-to-end training speed, response-length distribution, RL step timeline, and token accept rate |
| **Training Simulator** | Animated side-by-side comparison of Baseline vs TLT rollout showing GPU under-utilization and speculative decoding acceleration |
| **SD Strategy Explorer** | Heatmaps for accept length and speedup across draft depth × verify tokens, batch size sensitivity, and TopK analysis |
| **Benchmarks** | GPU diversity, cluster scaling, CUDAGraph memory, SD method comparison, and drafter effectiveness |
| **Case Study** | Configurable cost/time savings calculator with production trace data from ByteDance |

All data is sourced directly from the paper's tables and figures.
