# ADR 0001: Use WXT as the extension framework

## Status

Accepted – 02 Feb 2026

## Context

Developing a browser extension under Chrome’s Manifest V3 introduces significant complexity: background scripts are replaced by service workers, cross‑browser API inconsistencies abound, and coordinating content scripts, popup UIs and options pages requires careful architecture.  Implementing these concerns from scratch would slow down the project and increase maintenance burden.

Several frameworks and toolchains exist to ease extension development:

* **Plasmo** – highly opinionated, built around React and Parcel.  It offers a good initial developer experience but community discussions have raised concerns about the framework’s long‑term maintenance and reliance on the slower Parcel bundler.
* **CRXJS** – a set of Vite plugins that provide build tooling but little architectural guidance.  It is well‑suited to expert teams who want full control.
* **WXT** – a Nuxt‑inspired framework that abstracts away much of the boilerplate while remaining framework‑agnostic.  A 2025 comparative analysis concluded that WXT delivers the best balance of features, flexibility and long‑term project stability, with an active and reliable open‑source community.

The WXT repository shows that the latest tagged release is **v0.20.13** dated 16 December 2025.  Although there have been no releases since then, the repository continues to receive commits, indicating ongoing maintenance.  By contrast, Plasmo’s last release was in mid‑2025 and community concerns about its viability remain.

## Decision

We will base the project on **WXT**.  This means using WXT’s project generator, development server and build system.  We will adopt WXT’s recommended file structure for content scripts, service workers, options pages and popup pages.  We will keep the actual core logic (context extraction, AI invocation and insertion) in a framework‑agnostic `core` module so that the project can be migrated to another toolchain if necessary.

### Project Structure

We will enable a `src/` directory by configuring WXT with `srcDir: 'src'`. WXT entrypoints will live in `src/entrypoints/` and will wire together infrastructure code (`src/extension/`) and domain logic (`src/core/`).

The authoritative file/folder layout is defined in:

- [Repository Structure (Authoritative)](../architecture/repository-structure.md)

## Consequences

* We gain a mature development environment with hot module reloading and automatic manifest generation.
* We align with the leading community‑recommended framework, reducing long‑term maintenance risk.
* We accept the small overhead of learning WXT’s conventions.  However, because WXT is framework‑agnostic, we are not locked into a particular UI library.
* Should WXT’s maintenance slow down, we can migrate the core modules to another build tool (e.g. CRXJS) with minimal effort.
