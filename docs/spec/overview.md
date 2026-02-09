# Overview

This document introduces **Emoji Whisper**—a Chrome- and Edge-based (Chromium) browser extension that proposes a single context-appropriate emoji for the text you are currently writing. The extension is designed for power-users who want to enhance the tone of their messages without breaking their typing flow.

## Purpose

The goal of this project is to build a minimal but extensible extension that:

* Monitors user input in plain text fields (`<textarea>` and `<input type="text">`)
* When the user pauses after typing (idle) and the input is in a safe state (not composing via IME, caret-only, sufficient length), invokes the Chrome/Edge built-in **Prompt API** to generate an appropriate emoji suggestion. The built-in AI runs locally via an on-device model and therefore does not send any user content off the machine.
* Displays the suggested emoji in a subtle overlay adjacent to the cursor. If the user accepts the suggestion (by pressing Tab) the emoji is inserted into the text.
* Uses a fixed system prompt template in the MVP to enforce “single emoji only” output. Prompt configuration is modeled as a domain object for future changes, but is not user-configurable yet.
* Extracts context using configurable settings: minimum length (default 5 characters), maximum length (default 200 characters), and optional sentence-boundary adjustment. If the text is too short or matches skip conditions (empty, emoji-only), no suggestion is generated.
* Fails gracefully—if the built-in AI is unavailable (for example because the device does not meet the hardware requirements or the browser version is too old), the extension shows a non-intrusive message explaining that suggestions are unavailable. There is **no rule-based fall-back**; privacy and simplicity are prioritised.

## Scope

This project targets the latest versions of Google Chrome and Microsoft Edge (Chromium) on desktop operating systems that include support for the built-in AI APIs (Windows 10/11, macOS 13+, Linux and Chromebook Plus devices). It assumes the browser is **Chrome 138 or newer**, or an Edge version with equivalent Prompt API availability, because this is when the on-device AI APIs became generally available. The extension does **not** support mobile browsers, non-Chromium browsers or legacy versions without Prompt API support.

The initial implementation focuses on `textarea` and text input elements. Rich text editors (`contenteditable`) and complex web-application editors are out of scope for the first release but may be considered in later iterations. When the on-device AI is not available or the user is typing via an Input Method Editor (IME), the extension defers to default browser behaviour and does not show suggestions. The extension intercepts Tab only when a suggestion overlay is visible and is being accepted.

## Rationale

Modern browser extension development is challenging due to the migration to Manifest V3, cross-browser inconsistencies and the complexity of coordinating multiple extension components. The 2025 comparative analysis of extension frameworks argues that WXT has become the leading framework because of its superior developer experience, flexible architecture and active maintenance. Choosing WXT gives us a stable base without sacrificing future extensibility.

At the same time, Chrome and Edge’s built-in AI APIs allow extensions to run local models without shipping gigabytes of model weights. The Prompt API and related services are available in Chrome 138 and later (and equivalent Edge versions). Using on-device AI aligns with our privacy goals; user text never leaves the machine. If the device does not satisfy the OS/CPU/VRAM and storage requirements, we simply disable the feature rather than falling back to a simpler rule-based heuristic.
